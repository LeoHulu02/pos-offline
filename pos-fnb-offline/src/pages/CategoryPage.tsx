import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Category } from "../types/models";

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    sort_order: 0,
    is_active: true
  });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await invoke<Category[]>("get_categories_for_admin");
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        sort_order: category.sort_order,
        is_active: category.is_active
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        sort_order: 0,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await invoke("update_category", {
          payload: {
            id: editingCategory.id,
            name: formData.name,
            sort_order: Number(formData.sort_order),
            is_active: formData.is_active
          }
        });
      } else {
        await invoke("create_category", {
          payload: {
            name: formData.name,
            sort_order: Number(formData.sort_order)
          }
        });
      }
      setShowModal(false);
      loadCategories();
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Error: " + error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menonaktifkan kategori ini?")) {
      try {
        await invoke("delete_category", { categoryId: id });
        loadCategories();
      } catch (error) {
        console.error("Failed to delete category:", error);
        alert("Error: " + error);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kategori Menu</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={20} />
          <span>Tambah Kategori</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Memuat kategori...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Urutan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((cat) => (
                <tr key={cat.id} className={!cat.is_active ? "opacity-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {cat.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {cat.sort_order}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        cat.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {cat.is_active ? "Aktif" : "Non-aktif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(cat)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                    >
                      <Edit2 size={18} />
                    </button>
                    {cat.is_active && (
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-red-600 hover:text-red-900 cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Belum ada kategori
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Urutan (Sort Order)
                </label>
                <input
                  type="number"
                  required
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {editingCategory && (
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Aktif
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
