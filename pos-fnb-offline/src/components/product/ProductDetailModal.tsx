import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Edit2, X } from "lucide-react";

interface Product {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  base_price: number;
  description?: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
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

interface Props {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductDetailModal({ product, categories, onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<'info' | 'variant' | 'modifier'>('info');
  
  // Tab: Info
  const [formData, setFormData] = useState({
    category_id: categories.length > 0 ? categories[0].id : "",
    name: "",
    base_price: 0,
    description: "",
    is_active: true
  });

  // Tab: Varian
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantForm, setVariantForm] = useState({ id: "", name: "", price: 0, is_default: false, is_active: true });
  const [showVariantForm, setShowVariantForm] = useState(false);

  // Tab: Modifier
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [groupForm, setGroupForm] = useState({ id: "", name: "", min_select: 0, max_select: 1, is_required: false, is_active: true });
  const [showGroupForm, setShowGroupForm] = useState(false);
  
  const [modifiers, setModifiers] = useState<Record<string, Modifier[]>>({});
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [modForm, setModForm] = useState({ id: "", name: "", price_delta: 0, is_active: true });
  const [showModForm, setShowModForm] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        category_id: product.category_id,
        name: product.name,
        base_price: product.base_price,
        description: product.description || "",
        is_active: product.is_active
      });
      loadVariants(product.id);
      loadModifiers(product.id);
    }
  }, [product]);

  const loadVariants = async (productId: string) => {
    try {
      const data = await invoke<ProductVariant[]>("get_variants_by_product", { productId });
      setVariants(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadModifiers = async (productId: string) => {
    try {
      const groups = await invoke<ModifierGroup[]>("get_modifier_groups_by_product", { productId });
      setModifierGroups(groups);
      
      const modsMap: Record<string, Modifier[]> = {};
      for (const g of groups) {
        const mods = await invoke<Modifier[]>("get_modifiers_by_group", { groupId: g.id });
        modsMap[g.id] = mods;
      }
      setModifiers(modsMap);
    } catch (err) {
      console.error(err);
    }
  };

  // --- INFO SUBMIT ---
  const handleInfoSubmit = async (e: any) => {
    e.preventDefault();
    try {
      if (product) {
        await invoke("update_product", {
          payload: {
            id: product.id,
            category_id: formData.category_id,
            name: formData.name,
            base_price: Number(formData.base_price),
            description: formData.description,
            image_path: null,
            is_active: formData.is_active
          }
        });
        alert("Info produk berhasil diupdate!");
      } else {
        await invoke("create_product", {
          payload: {
            category_id: formData.category_id,
            name: formData.name,
            base_price: Number(formData.base_price),
            description: formData.description,
            image_path: null
          }
        });
      }
      onSaved();
      if (!product) onClose(); // close if new product
    } catch (error) {
      console.error(error);
      alert("Error: " + error);
    }
  };

  // --- VARIANT SUBMIT ---
  const handleVariantSubmit = async (e: any) => {
    e.preventDefault();
    if (!product) return;
    try {
      if (variantForm.id) {
        await invoke("update_variant", { payload: { id: variantForm.id, name: variantForm.name, price: Number(variantForm.price), is_default: variantForm.is_default, is_active: variantForm.is_active } });
      } else {
        await invoke("create_variant", { payload: { product_id: product.id, name: variantForm.name, price: Number(variantForm.price), is_default: variantForm.is_default } });
      }
      setShowVariantForm(false);
      loadVariants(product.id);
    } catch (error) {
      alert("Error: " + error);
    }
  };

  // --- MODIFIER GROUP SUBMIT ---
  const handleGroupSubmit = async (e: any) => {
    e.preventDefault();
    if (!product) return;
    try {
      if (groupForm.id) {
        await invoke("update_modifier_group", { payload: { id: groupForm.id, name: groupForm.name, min_select: Number(groupForm.min_select), max_select: groupForm.max_select ? Number(groupForm.max_select) : null, is_required: groupForm.is_required, is_active: groupForm.is_active } });
      } else {
        await invoke("create_modifier_group", { payload: { product_id: product.id, name: groupForm.name, min_select: Number(groupForm.min_select), max_select: groupForm.max_select ? Number(groupForm.max_select) : null, is_required: groupForm.is_required } });
      }
      setShowGroupForm(false);
      loadModifiers(product.id);
    } catch (error) {
      alert("Error: " + error);
    }
  };

  // --- MODIFIER ITEM SUBMIT ---
  const handleModSubmit = async (e: any) => {
    e.preventDefault();
    if (!activeGroupId || !product) return;
    try {
      if (modForm.id) {
        await invoke("update_modifier", { payload: { id: modForm.id, name: modForm.name, price_delta: Number(modForm.price_delta), is_active: modForm.is_active } });
      } else {
        await invoke("create_modifier", { payload: { modifier_group_id: activeGroupId, name: modForm.name, price_delta: Number(modForm.price_delta) } });
      }
      setShowModForm(false);
      loadModifiers(product.id);
    } catch (error) {
      alert("Error: " + error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{product ? `Edit Produk: ${product.name}` : "Tambah Produk Baru"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>

        {/* Tabs */}
        {product && (
          <div className="flex border-b px-6 pt-4 gap-6 bg-gray-50">
            <button onClick={() => setActiveTab('info')} className={`pb-3 px-2 font-medium border-b-2 ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Info Utama</button>
            <button onClick={() => setActiveTab('variant')} className={`pb-3 px-2 font-medium border-b-2 ${activeTab === 'variant' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Varian</button>
            <button onClick={() => setActiveTab('modifier')} className={`pb-3 px-2 font-medium border-b-2 ${activeTab === 'modifier' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Modifiers (Topping, dsb)</button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === 'info' && (
            <form onSubmit={handleInfoSubmit} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Produk</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kategori</label>
                <select required value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md">
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Harga Dasar (Rp)</label>
                <input type="number" required min="0" value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: parseInt(e.target.value) || 0 })} className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi (Opsional)</label>
                <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 block w-full px-3 py-2 border rounded-md" />
              </div>
              {product && (
                <div className="flex items-center mt-4">
                  <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
                  <label className="ml-2 block text-sm text-gray-900">Aktif</label>
                </div>
              )}
              <div className="pt-4">
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700">Simpan Info</button>
              </div>
            </form>
          )}

          {activeTab === 'variant' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Daftar Varian</h3>
                <button onClick={() => { setVariantForm({ id: "", name: "", price: 0, is_default: false, is_active: true }); setShowVariantForm(true); }} className="flex gap-2 items-center bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-100"><Plus size={16}/> Tambah Varian</button>
              </div>
              
              {showVariantForm && (
                <form onSubmit={handleVariantSubmit} className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-2 gap-4 border">
                  <div>
                    <label className="block text-xs text-gray-500">Nama Varian (Cth: Hot, Ice)</label>
                    <input type="text" required value={variantForm.name} onChange={e => setVariantForm({...variantForm, name: e.target.value})} className="w-full p-2 border rounded mt-1" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Harga (Rp)</label>
                    <input type="number" required value={variantForm.price} onChange={e => setVariantForm({...variantForm, price: parseInt(e.target.value)||0})} className="w-full p-2 border rounded mt-1" />
                  </div>
                  <div className="col-span-2 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={variantForm.is_default} onChange={e => setVariantForm({...variantForm, is_default: e.target.checked})} /> Default</label>
                    {variantForm.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={variantForm.is_active} onChange={e => setVariantForm({...variantForm, is_active: e.target.checked})} /> Aktif</label>}
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => setShowVariantForm(false)} className="px-4 py-1.5 border rounded">Batal</button>
                      <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded">Simpan Varian</button>
                    </div>
                  </div>
                </form>
              )}

              <table className="w-full border-collapse border rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr><th className="p-3 text-left">Nama Varian</th><th className="p-3 text-left">Harga</th><th className="p-3 text-center">Status</th><th className="p-3"></th></tr>
                </thead>
                <tbody>
                  {variants.map(v => (
                    <tr key={v.id} className="border-t">
                      <td className="p-3 font-medium">{v.name} {v.is_default && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2">Default</span>}</td>
                      <td className="p-3 text-gray-600">Rp {v.price.toLocaleString('id-ID')}</td>
                      <td className="p-3 text-center">{v.is_active ? <span className="text-green-600 text-sm">Aktif</span> : <span className="text-red-500 text-sm">Non-aktif</span>}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => { setVariantForm({ id: v.id, name: v.name, price: v.price, is_default: v.is_default, is_active: v.is_active }); setShowVariantForm(true); }} className="text-indigo-600 p-1"><Edit2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                  {variants.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-gray-400">Belum ada varian (Produk akan menggunakan Harga Dasar)</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'modifier' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Modifier Groups</h3>
                <button onClick={() => { setGroupForm({ id: "", name: "", min_select: 0, max_select: 1, is_required: false, is_active: true }); setShowGroupForm(true); }} className="flex gap-2 items-center bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-100"><Plus size={16}/> Tambah Group</button>
              </div>

              {showGroupForm && (
                <form onSubmit={handleGroupSubmit} className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-3 gap-4 border">
                  <div>
                    <label className="block text-xs text-gray-500">Nama Group (Cth: Topping)</label>
                    <input type="text" required value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} className="w-full p-2 border rounded mt-1" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Min Pilihan</label>
                    <input type="number" min="0" required value={groupForm.min_select} onChange={e => setGroupForm({...groupForm, min_select: parseInt(e.target.value)||0})} className="w-full p-2 border rounded mt-1" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">Max Pilihan (0 = Unlimited)</label>
                    <input type="number" min="0" required value={groupForm.max_select || 0} onChange={e => setGroupForm({...groupForm, max_select: parseInt(e.target.value)||0})} className="w-full p-2 border rounded mt-1" />
                  </div>
                  <div className="col-span-3 flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={groupForm.is_required} onChange={e => setGroupForm({...groupForm, is_required: e.target.checked})} /> Wajib Pilih (Required)</label>
                    {groupForm.id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={groupForm.is_active} onChange={e => setGroupForm({...groupForm, is_active: e.target.checked})} /> Aktif</label>}
                    <div className="ml-auto flex gap-2">
                      <button type="button" onClick={() => setShowGroupForm(false)} className="px-4 py-1.5 border rounded">Batal</button>
                      <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded">Simpan Group</button>
                    </div>
                  </div>
                </form>
              )}

              {/* List Groups & Modifiers */}
              <div className="space-y-6">
                {modifierGroups.map(group => (
                  <div key={group.id} className={`border rounded-lg overflow-hidden ${!group.is_active ? 'opacity-60' : ''}`}>
                    <div className="bg-gray-100 p-3 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-gray-800">{group.name} {group.is_required && <span className="text-xs text-red-600 ml-2">(Wajib)</span>}</h4>
                        <p className="text-xs text-gray-500">Pilih min {group.min_select}, max {group.max_select || 'bebas'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setActiveGroupId(group.id); setModForm({ id: "", name: "", price_delta: 0, is_active: true }); setShowModForm(true); }} className="text-sm bg-white border px-3 py-1 rounded hover:bg-gray-50">+ Item</button>
                        <button onClick={() => { setGroupForm({ id: group.id, name: group.name, min_select: group.min_select, max_select: group.max_select || 0, is_required: group.is_required, is_active: group.is_active }); setShowGroupForm(true); }} className="text-sm bg-white border px-3 py-1 rounded text-indigo-600 hover:bg-gray-50"><Edit2 size={14}/></button>
                      </div>
                    </div>
                    
                    {/* Add Modifier Form */}
                    {showModForm && activeGroupId === group.id && (
                      <form onSubmit={handleModSubmit} className="p-3 bg-yellow-50 flex gap-4 items-end border-b">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500">Nama Modifier (Cth: Boba, Less Ice)</label>
                          <input type="text" required value={modForm.name} onChange={e => setModForm({...modForm, name: e.target.value})} className="w-full p-1.5 text-sm border rounded mt-1" />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs text-gray-500">Harga Extra (Rp)</label>
                          <input type="number" required value={modForm.price_delta} onChange={e => setModForm({...modForm, price_delta: parseInt(e.target.value)||0})} className="w-full p-1.5 text-sm border rounded mt-1" />
                        </div>
                        {modForm.id && (
                          <div className="flex items-center gap-2 pb-2">
                            <input type="checkbox" checked={modForm.is_active} onChange={e => setModForm({...modForm, is_active: e.target.checked})} /> Aktif
                          </div>
                        )}
                        <button type="submit" className="bg-indigo-600 text-white px-3 py-1.5 text-sm rounded mb-0.5">Simpan</button>
                        <button type="button" onClick={() => setShowModForm(false)} className="border px-3 py-1.5 text-sm rounded mb-0.5 bg-white">Batal</button>
                      </form>
                    )}

                    {/* Modifiers List */}
                    <div className="p-0">
                      {modifiers[group.id]?.length > 0 ? (
                        <table className="w-full text-sm">
                          <tbody>
                            {modifiers[group.id].map(mod => (
                              <tr key={mod.id} className="border-t">
                                <td className="p-2 pl-4">{mod.name}</td>
                                <td className="p-2 text-gray-500">+{formatIDR(mod.price_delta)}</td>
                                <td className="p-2 w-16">{mod.is_active ? 'Aktif' : 'Non'}</td>
                                <td className="p-2 text-right">
                                  <button onClick={() => { setActiveGroupId(group.id); setModForm({ id: mod.id, name: mod.name, price_delta: mod.price_delta, is_active: mod.is_active }); setShowModForm(true); }} className="text-indigo-600 p-1"><Edit2 size={14}/></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-sm text-gray-400 text-center">Belum ada pilihan di grup ini</div>
                      )}
                    </div>
                  </div>
                ))}
                {modifierGroups.length === 0 && <div className="p-6 border border-dashed rounded-lg text-center text-gray-400">Belum ada modifier group</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};
