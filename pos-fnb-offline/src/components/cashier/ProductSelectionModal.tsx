import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Check, Minus, Plus } from "lucide-react";

interface Product {
  id: string;
  category_id: string;
  name: string;
  base_price: number;
}

interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_default: boolean;
  is_active: boolean;
}

interface ModifierGroup {
  id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number | null;
  is_required: boolean;
  is_active: boolean;
}

interface Modifier {
  id: string;
  modifier_group_id: string;
  name: string;
  price_delta: number;
  is_active: boolean;
}

export interface SelectedModifier {
  modifier_id: string;
  name: string;
  price_delta: number;
}

interface Props {
  product: Product;
  onClose: () => void;
  onAddToCart: (qty: number, variant: ProductVariant | null, modifiers: SelectedModifier[], note: string) => void;
}

export default function ProductSelectionModal({ product, onClose, onAddToCart }: Props) {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [modGroups, setModGroups] = useState<ModifierGroup[]>([]);
  const [modsMap, setModsMap] = useState<Record<string, Modifier[]>>({});
  
  // Selections
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedMods, setSelectedMods] = useState<Record<string, Modifier[]>>({}); // group_id -> array of selected mods
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  
  // Validation
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProductDetails();
  }, [product.id]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      const [vars, groups] = await Promise.all([
        invoke<ProductVariant[]>("get_variants_by_product", { productId: product.id }),
        invoke<ModifierGroup[]>("get_modifier_groups_by_product", { productId: product.id })
      ]);
      
      const activeVars = vars.filter(v => v.is_active);
      setVariants(activeVars);
      
      const activeGroups = groups.filter(g => g.is_active);
      setModGroups(activeGroups);
      
      const mMap: Record<string, Modifier[]> = {};
      const initialSelectedMods: Record<string, Modifier[]> = {};
      
      for (const g of activeGroups) {
        const mods = await invoke<Modifier[]>("get_modifiers_by_group", { groupId: g.id });
        mMap[g.id] = mods.filter(m => m.is_active);
        initialSelectedMods[g.id] = [];
      }
      
      setModsMap(mMap);
      setSelectedMods(initialSelectedMods);
      
      // Auto select default variant if exists
      if (activeVars.length > 0) {
        const def = activeVars.find(v => v.is_default);
        setSelectedVariant(def || activeVars[0]);
      }
      
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal memuat detail produk.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModifier = (group: ModifierGroup, mod: Modifier) => {
    setSelectedMods(prev => {
      const current = prev[group.id] || [];
      const exists = current.find(m => m.id === mod.id);
      
      if (exists) {
        return { ...prev, [group.id]: current.filter(m => m.id !== mod.id) };
      } else {
        // If max_select is 1, act as radio button
        if (group.max_select === 1) {
          return { ...prev, [group.id]: [mod] };
        }
        
        // Enforce max_select limit
        if (group.max_select && current.length >= group.max_select) {
          return prev; // ignore
        }
        
        return { ...prev, [group.id]: [...current, mod] };
      }
    });
  };

  const validateSelection = (): boolean => {
    if (variants.length > 0 && !selectedVariant) {
      setErrorMsg("Harap pilih varian terlebih dahulu.");
      return false;
    }
    
    for (const group of modGroups) {
      const selectedCount = (selectedMods[group.id] || []).length;
      if (group.is_required && selectedCount < group.min_select) {
        setErrorMsg(`Grup "${group.name}" wajib diisi minimal ${group.min_select} pilihan.`);
        return false;
      }
      if (selectedCount < group.min_select) {
        setErrorMsg(`Grup "${group.name}" minimal ${group.min_select} pilihan.`);
        return false;
      }
    }
    
    setErrorMsg(null);
    return true;
  };

  const handleSubmit = () => {
    if (!validateSelection()) return;
    
    const flatSelectedMods: SelectedModifier[] = [];
    Object.values(selectedMods).forEach(groupMods => {
      groupMods.forEach(m => flatSelectedMods.push({
        modifier_id: m.id,
        name: m.name,
        price_delta: m.price_delta
      }));
    });
    
    onAddToCart(qty, selectedVariant, flatSelectedMods, note);
  };

  // Calculate current item total (without qty)
  const currentItemPrice = (selectedVariant?.price ?? product.base_price) + 
    Object.values(selectedMods).flat().reduce((sum, m) => sum + m.price_delta, 0);

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl flex items-center justify-center h-48">
          <span className="text-gray-500 font-medium">Memuat variasi...</span>
        </div>
      </div>
    );
  }

  // If no variants and no modifiers, ideally we shouldn't even open this modal, 
  // but in case we do, the user just clicks "Tambah".
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500 font-medium">{formatIDR(product.base_price)}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full border hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Varian */}
          {variants.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                Pilih Varian <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Wajib</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {variants.map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => setSelectedVariant(v)}
                    className={`flex justify-between items-center p-3 rounded-lg border-2 transition-all text-left ${selectedVariant?.id === v.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-200 hover:border-indigo-300 bg-white'}`}
                  >
                    <span className={`font-medium ${selectedVariant?.id === v.id ? 'text-indigo-900' : 'text-gray-700'}`}>{v.name}</span>
                    <span className={`text-sm ${selectedVariant?.id === v.id ? 'text-indigo-700 font-bold' : 'text-gray-500'}`}>{formatIDR(v.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifier Groups */}
          {modGroups.map(group => (
            <div key={group.id} className="pt-2">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                {group.name} 
                {group.is_required && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Wajib</span>}
              </h3>
              <p className="text-xs text-gray-500 mb-3 font-medium">Pilih {group.min_select === group.max_select ? `tepat ${group.min_select}` : `minimal ${group.min_select}${group.max_select ? ` sampai maksimal ${group.max_select}` : ''}`}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(modsMap[group.id] || []).map(mod => {
                  const isSelected = (selectedMods[group.id] || []).some(m => m.id === mod.id);
                  const isMaxReached = group.max_select && !isSelected && (selectedMods[group.id] || []).length >= group.max_select;
                  
                  return (
                    <button 
                      key={mod.id} 
                      disabled={Boolean(isMaxReached)}
                      onClick={() => handleToggleModifier(group, mod)}
                      className={`flex justify-between items-center p-3 rounded-lg border transition-all text-left ${isSelected ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-gray-200 hover:bg-gray-50'} ${isMaxReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                        <span className="font-medium">{mod.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">+{formatIDR(mod.price_delta)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Note */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-bold text-gray-900 mb-2">Catatan Tambahan</label>
            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Contoh: Jangan pakai sedotan"
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-white rounded-b-lg flex flex-col md:flex-row gap-4 items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-4 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50 text-gray-700">
              <Minus size={20} />
            </button>
            <span className="font-bold text-xl w-8 text-center text-gray-900">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded shadow-sm hover:bg-gray-50 text-gray-700">
              <Plus size={20} />
            </button>
          </div>
          
          <button 
            onClick={handleSubmit}
            className="flex-1 md:w-auto md:px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-3 text-lg"
          >
            <span>Tambah</span>
            <span className="bg-indigo-800/40 px-2 py-0.5 rounded text-sm">{formatIDR(currentItemPrice * qty)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
