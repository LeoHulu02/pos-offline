import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  History, 
  Package, 
  Tag, 
  Clock, 
  BarChart3, 
  Settings, 
  LogOut,
  Users
} from "lucide-react";

export default function BaseLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirm = window.confirm("Apakah Anda yakin ingin keluar?");
    if (!confirm) return;
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { to: "/", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/cashier", label: "Kasir", icon: <ShoppingCart size={18} /> },
    { to: "/orders", label: "Riwayat Transaksi", icon: <History size={18} /> },
    { to: "/products", label: "Produk", icon: <Package size={18} />, adminOnly: true },
    { to: "/categories", label: "Kategori", icon: <Tag size={18} />, adminOnly: true },
    { to: "/shift", label: "Shift Kerja", icon: <Clock size={18} /> },
    { to: "/reports", label: "Laporan Penjualan", icon: <BarChart3 size={18} /> },
    { to: "/settings", label: "Pengaturan", icon: <Settings size={18} />, adminOnly: true },
    { to: "/users", label: "Kelola Pengguna", icon: <Users size={18} />, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b font-bold text-xl text-orange-600 flex items-center gap-2">
          <ShoppingCart size={22} />
          <span>POS F&B</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 flex flex-col overflow-y-auto">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== "role-admin") return null;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-orange-50 text-orange-600 shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Block & Logout */}
        {user && (
          <div className="p-4 border-t bg-gray-50 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-sm select-none">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate capitalize">
                  {user.role === "role-admin" ? "Administrator" : "Kasir"}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2 bg-white hover:bg-red-50 text-red-600 border border-gray-200 hover:border-red-200 rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer"
            >
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        )}
      </aside>
      
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
