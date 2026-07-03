import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <div className="flex h-screen items-center justify-center text-gray-500">Memeriksa sesi...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Akses Ditolak</h1>
        <p className="text-gray-600">Anda tidak memiliki izin untuk halaman ini.</p>
      </div>
    );
  }

  return <>{children}</>;
}
