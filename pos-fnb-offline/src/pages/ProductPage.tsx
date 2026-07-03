import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Edit2, Trash2 } from "lucide-react";
import ProductDetailModal from "../components/product/ProductDetailModal";
import { Product, Category } from "../types/models";

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodData, catData] = await Promise.all([
        invoke<Product[]>("get_products_for_admin"),
        invoke<Category[]>("get_categories_for_admin")
      ]);
      setProducts(prodData);
      setCategories(catData.filter(c => (c as any).is_active !== false));
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product || null);
    setShowModal(true);
  };



  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menonaktifkan produk ini?")) {
      try {
        await invoke("delete_product", { productId: id });
        loadData();
      } catch (error) {
        console.error("Failed to delete product:", error);
        alert("Error: " + error);
      }
    }
  };

  // Format currency
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produk Menu</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={20} />
          <span>Tambah Produk</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Memuat produk...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Produk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Dasar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((prod) => (
                <tr key={prod.id} className={!prod.is_active ? "opacity-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{prod.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{prod.category_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatIDR(prod.base_price)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${prod.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {prod.is_active ? "Aktif" : "Non-aktif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleOpenModal(prod)} className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer">
                      <Edit2 size={18} />
                    </button>
                    {prod.is_active && (
                      <button onClick={() => handleDelete(prod.id)} className="text-red-600 hover:text-red-900 cursor-pointer">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Belum ada produk</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <ProductDetailModal
          product={editingProduct}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSaved={() => loadData()}
        />
      )}
    </div>
  );
}
