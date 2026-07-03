import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "./stores/authStore";
import RoleGuard from "./components/common/RoleGuard";

import BaseLayout from "./components/layout/BaseLayout";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import InitialSetupPage from "./pages/InitialSetupPage";
import OpenShiftPage from "./pages/OpenShiftPage";
import POSPage from "./pages/POSPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import ProductPage from "./pages/ProductPage";
import CategoryPage from "./pages/CategoryPage";
import ShiftPage from "./pages/ShiftPage";
import ReportPage from "./pages/ReportPage";
import SettingsPage from "./pages/SettingsPage";
import UserManagementPage from "./pages/UserManagementPage";
import ToastContainer from "./components/common/ToastContainer";
import "./App.css";

function SetupGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const { initAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    async function checkSetup() {
      try {
        const isSetupCompleted = await invoke("check_initial_setup");
        if (!isSetupCompleted && location.pathname !== "/setup") {
          navigate("/setup");
          return;
        }
        
        if (!isInitialized && location.pathname !== "/setup") {
          await initAuth();
        }
      } catch (err) {
        console.error("Failed to check setup:", err);
      } finally {
        setLoading(false);
      }
    }
    checkSetup();
  }, [navigate, location, initAuth, isInitialized]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Memeriksa sistem...</div>;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <SetupGuard>
        <ToastContainer />
        <Routes>
          <Route path="/setup" element={<InitialSetupPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={<BaseLayout />}>
            <Route index element={
              <RoleGuard allowedRoles={['role-admin', 'role-cashier']}>
                <DashboardPage />
              </RoleGuard>
            } />
            <Route path="open-shift" element={
              <RoleGuard allowedRoles={['role-admin', 'role-cashier']}>
                <OpenShiftPage />
              </RoleGuard>
            } />
            <Route path="cashier" element={
              <RoleGuard allowedRoles={['role-admin', 'role-cashier']}>
                <POSPage />
              </RoleGuard>
            } />
            <Route path="orders" element={
              <RoleGuard allowedRoles={['role-admin', 'role-cashier']}>
                <OrderHistoryPage />
              </RoleGuard>
            } />
            <Route path="products" element={
              <RoleGuard allowedRoles={['role-admin']}>
                <ProductPage />
              </RoleGuard>
            } />
            <Route path="categories" element={
              <RoleGuard allowedRoles={['role-admin']}>
                <CategoryPage />
              </RoleGuard>
            } />
            <Route path="shift" element={
              <RoleGuard allowedRoles={['role-admin', 'role-cashier']}>
                <ShiftPage />
              </RoleGuard>
            } />
            <Route path="reports" element={
              <RoleGuard allowedRoles={['role-admin', 'role-cashier']}>
                <ReportPage />
              </RoleGuard>
            } />
            <Route path="settings" element={
              <RoleGuard allowedRoles={['role-admin']}>
                <SettingsPage />
              </RoleGuard>
            } />
            <Route path="users" element={
              <RoleGuard allowedRoles={['role-admin']}>
                <UserManagementPage />
              </RoleGuard>
            } />
          </Route>
        </Routes>
      </SetupGuard>
    </BrowserRouter>
  );
}

export default App;
