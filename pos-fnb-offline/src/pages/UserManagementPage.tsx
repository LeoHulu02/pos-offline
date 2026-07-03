import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Edit2, Shield, UserX, UserCheck } from "lucide-react";
import { useToastStore } from "../stores/toastStore";

interface UserSummary {
  id: string;
  full_name: string;
  username: string;
  role_id: string;
  is_active: boolean;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummary | null>(null);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [roleId, setRoleId] = useState("role-cashier");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await invoke<UserSummary[]>("get_all_users");
      setUsers(data);
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal memuat daftar pengguna: " + error, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFullName("");
    setUsername("");
    setPassword("");
    setPin("");
    setRoleId("role-cashier");
    setShowModal(true);
  };

  const handleOpenEdit = (user: UserSummary) => {
    setEditingUser(user);
    setFullName(user.full_name);
    setUsername(user.username);
    setPassword(""); // Keep blank unless changing
    setPin("");      // Keep blank unless changing
    setRoleId(user.role_id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Edit User
        await invoke("admin_update_user", {
          payload: {
            id: editingUser.id,
            full_name: fullName,
            username,
            password: password || null,
            pin: pin || null,
            role_id: roleId
          }
        });
        useToastStore.getState().addToast("Pengguna berhasil diperbarui!", "success");
      } else {
        // Create User
        if (!password || !pin) {
          useToastStore.getState().addToast("Password dan PIN wajib diisi untuk pengguna baru!", "warning");
          return;
        }
        await invoke("admin_create_user", {
          payload: {
            full_name: fullName,
            username,
            password,
            pin,
            role_id: roleId
          }
        });
        useToastStore.getState().addToast("Pengguna baru berhasil ditambahkan!", "success");
      }
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal memproses data pengguna: " + error, "error");
    }
  };

  const handleToggleStatus = async (user: UserSummary) => {
    const nextStatus = !user.is_active;
    const confirm = window.confirm(`Apakah Anda yakin ingin ${nextStatus ? 'mengaktifkan' : 'menonaktifkan'} akun '${user.full_name}'?`);
    if (!confirm) return;

    try {
      await invoke("admin_toggle_user_status", {
        userId: user.id,
        isActive: nextStatus
      });
      useToastStore.getState().addToast(`Berhasil ${nextStatus ? 'mengaktifkan' : 'menonaktifkan'} pengguna!`, "success");
      loadUsers();
    } catch (error) {
      console.error(error);
      useToastStore.getState().addToast("Gagal mengubah status: " + error, "error");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Kelola Pengguna</h1>
          <p className="text-gray-500 mt-1">Tambahkan kasir baru, ganti password, dan kelola otorisasi admin di sini.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg shadow font-bold text-sm transition-colors cursor-pointer"
        >
          <Plus size={18} />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat daftar kasir...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4 text-center">Hak Akses (Role)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${!u.is_active ? "bg-gray-50/50 text-gray-400" : ""}`}>
                  <td className="px-6 py-4 font-bold text-gray-900">{u.full_name}</td>
                  <td className="px-6 py-4 font-mono text-gray-600">{u.username}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      u.role_id === "role-admin" 
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      <Shield size={12} />
                      {u.role_id === "role-admin" ? "Admin" : "Kasir"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors border ${
                        u.is_active 
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      }`}
                    >
                      {u.is_active ? <UserCheck size={12} /> : <UserX size={12} />}
                      {u.is_active ? "Aktif" : "Non-aktif"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                      title="Edit Pengguna"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="p-5 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">
                {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Nama Lengkap</label>
                <input 
                  type="text" required
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Contoh: Rian Anggara"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Username</label>
                <input 
                  type="text" required
                  value={username} onChange={e => setUsername(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  placeholder="Contoh: rian123"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">
                  Password {editingUser && <span className="text-gray-400 font-normal">(Kosongkan jika tidak diganti)</span>}
                </label>
                <input 
                  type="password" required={!editingUser}
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Minimal 6 karakter"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">
                  PIN Otorisasi (6 Digit Angka) {editingUser && <span className="text-gray-400 font-normal">(Kosongkan jika tidak diganti)</span>}
                </label>
                <input 
                  type="password" required={!editingUser} maxLength={6}
                  value={pin} onChange={e => setPin(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none tracking-widest text-center text-lg font-bold"
                  placeholder="------"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase">Hak Akses (Role)</label>
                <select
                  value={roleId} onChange={e => setRoleId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="role-cashier">Kasir (Transaksi & Shift)</option>
                  <option value="role-admin">Admin (Akses Penuh)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                  {editingUser ? "Simpan Perubahan" : "Buat Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
