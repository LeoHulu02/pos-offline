import { useToastStore, Toast } from "../../stores/toastStore";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const iconMap = {
    success: <CheckCircle className="text-green-500 flex-shrink-0" size={18} />,
    error: <XCircle className="text-red-500 flex-shrink-0" size={18} />,
    info: <Info className="text-blue-500 flex-shrink-0" size={18} />,
    warning: <AlertTriangle className="text-yellow-500 flex-shrink-0" size={18} />,
  };

  const bgMap = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  };

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-lg border shadow-lg pointer-events-auto animate-slide-in transition-all ${bgMap[toast.type]}`}
      role="alert"
    >
      {iconMap[toast.type]}
      <div className="flex-1 text-sm font-semibold leading-snug">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 hover:bg-gray-200/50 rounded flex-shrink-0 cursor-pointer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
