import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useShiftStore } from "../stores/shiftStore";
import { usePosStore } from "../stores/posStore";
import { useToastStore } from "../stores/toastStore";
import ProductSelectionModal from "../components/cashier/ProductSelectionModal";
import { Category, Product } from "../types/models";
import CategoryTabs from "../components/pos/CategoryTabs";
import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";
import CheckoutModal from "../components/pos/CheckoutModal";

export default function POSPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderType, setOrderType] = useState<"dine_in" | "takeaway">("dine_in");
  
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeShift, loadActiveShift, isShiftLoaded } = useShiftStore();
  const pos = usePosStore();

  const playSound = (type: "beep" | "chime") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === "beep") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "chime") {
        const playTone = (freq: number, start: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + start);
          osc.start(ctx.currentTime + start);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
          osc.stop(ctx.currentTime + start + duration);
        };
        playTone(523.25, 0, 0.12);
        playTone(659.25, 0.1, 0.2);
      }
    } catch (err) {
      console.error("Audio feedback failed:", err);
    }
  };

  useEffect(() => {
    if (user) loadActiveShift(user.id);
  }, [user, loadActiveShift]);

  useEffect(() => {
    if (isShiftLoaded && activeShift === null) {
      useToastStore.getState().addToast("Buka Shift Kasir terlebih dahulu.", "warning");
      navigate("/shift");
    }
  }, [activeShift, isShiftLoaded, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, prods, settings] = await Promise.all([
          invoke<Category[]>("get_categories_for_cashier"),
          invoke<Product[]>("get_products_for_cashier"),
          invoke<Record<string, string>>("get_all_settings")
        ]);
        setCategories(cats);
        setProducts(prods);
        
        const taxRate = parseInt(settings.tax_rate || "1100");
        const serviceRate = parseInt(settings.service_rate || "0");
        pos.setRates(taxRate, serviceRate);
      } catch (err) {
        console.error("Failed to load catalog or settings:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "F1" && e.key <= "F5") {
        e.preventDefault();
        const index = parseInt(e.key.slice(1)) - 1;
        if (index === 0) {
          setSelectedCategory(null);
          playSound("beep");
        } else if (categories[index - 1]) {
          setSelectedCategory(categories[index - 1].id);
          playSound("beep");
        }
      }
      if (e.key === "F10") {
        e.preventDefault();
        if (pos.cart.length > 0) {
          setShowCheckout(true);
          setPaymentAmount(pos.getTotalAmount());
          playSound("beep");
        }
      }
      if (e.key === "Escape") {
        setShowCheckout(false);
        setSelectedProductForModal(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [categories, pos.cart.length, pos.getTotalAmount()]);

  const handleProductClick = async (product: Product) => {
    try {
      const [vars, groups] = await Promise.all([
        invoke<any[]>("get_variants_by_product", { productId: product.id }),
        invoke<any[]>("get_modifier_groups_by_product", { productId: product.id })
      ]);
      
      const hasActiveVars = vars.some(v => v.is_active);
      const hasActiveGroups = groups.some(g => g.is_active);
      
      if (!hasActiveVars && !hasActiveGroups) {
        playSound("beep");
        pos.addItem({
          product_id: product.id,
          product_name: product.name,
          qty: 1,
          base_price: product.base_price,
          modifiers: []
        });
      } else {
        setSelectedProductForModal(product);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToCartFromModal = (qty: number, variant: any | null, modifiers: any[], note: string) => {
    playSound("beep");
    pos.addItem({
      product_id: selectedProductForModal!.id,
      product_name: selectedProductForModal!.name,
      variant_id: variant?.id,
      variant_name: variant?.name,
      qty,
      base_price: variant?.price ?? selectedProductForModal!.base_price,
      notes: note,
      modifiers
    });
    setSelectedProductForModal(null);
  };

  const handleCheckout = async () => {
    if (!user || !activeShift) return;
    const totalAmount = pos.getTotalAmount();
    if (paymentMethod === 'cash' && paymentAmount < totalAmount) {
      useToastStore.getState().addToast("Jumlah uang tidak cukup!", "warning");
      return;
    }

    setIsProcessing(true);
    try {
      const orderPayload = {
        order_type: orderType,
        customer_name: pos.customerName || null,
        queue_number: pos.queueNumber || null,
        total_amount: totalAmount,
        tax_amount: pos.getTaxAmount(),
        service_amount: pos.getServiceAmount(),
        discount_amount: 0,
        tax_rate_bp: pos.taxRate,
        service_rate_bp: pos.serviceRate,
        shift_id: activeShift.id,
        created_by: user.id,
        items: pos.cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          variant_id: item.variant_id || null,
          variant_name: item.variant_name || null,
          qty: item.qty,
          base_price: item.base_price,
          notes: item.notes || null,
          modifiers: item.modifiers.map(m => ({
            modifier_id: m.modifier_id,
            price_delta: m.price_delta
          }))
        }))
      };

      const orderId = await invoke<string>("create_order", { payload: orderPayload });
      
      await invoke("process_payment", {
        payload: {
          order_id: orderId,
          amount: paymentMethod === 'cash' ? paymentAmount : totalAmount,
          method: paymentMethod
        }
      });
      
      try {
        await invoke("print_receipt", { orderId });
      } catch (printErr) {
        console.error("Print receipt failed:", printErr);
      }

      playSound("chime");
      useToastStore.getState().addToast(`Pembayaran berhasil!`, "success");
      
      pos.clearCart();
      setShowCheckout(false);
      setPaymentAmount(0);
    } catch (err) {
      console.error(err);
      useToastStore.getState().addToast("Error: " + err, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-screen bg-gray-50 overflow-hidden select-none font-sans">
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <CategoryTabs 
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(id) => { setSelectedCategory(id); playSound("beep"); }}
        />
        <div className="flex-1 overflow-y-auto mt-4 pr-2 custom-scrollbar">
          <ProductGrid 
            products={products}
            categories={categories}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            onProductClick={handleProductClick}
          />
        </div>
      </div>

      <CartPanel 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onPayClick={() => { setShowCheckout(true); setPaymentAmount(pos.getTotalAmount()); playSound("beep"); }}
      />

      {showCheckout && (
        <CheckoutModal 
          onClose={() => { setShowCheckout(false); playSound("beep"); }}
          onProcessPayment={handleCheckout}
          isProcessing={isProcessing}
          paymentMethod={paymentMethod}
          setPaymentMethod={(method) => { setPaymentMethod(method); playSound("beep"); }}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          orderType={orderType}
          setOrderType={(type) => { setOrderType(type); playSound("beep"); }}
          customerName={pos.customerName}
          setCustomerName={pos.setCustomerName}
          tableNote={pos.queueNumber}
          setTableNote={pos.setQueueNumber}
        />
      )}

      {selectedProductForModal && (
        <ProductSelectionModal 
          product={selectedProductForModal} 
          onClose={() => setSelectedProductForModal(null)} 
          onAddToCart={handleAddToCartFromModal} 
        />
      )}
    </div>
  );
}
