import { Toaster, toast as hotToast } from 'react-hot-toast';
import { AlertTriangle, Info } from 'lucide-react';

export const ToastProvider = () => (
  <Toaster
    position="bottom-right"
    gutter={8}
    containerClassName="toast-container"
    toastOptions={{
      duration: 3500,
      style: {
        background: 'rgba(16,16,16,0.95)',
        color: '#f0f0f0',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '12px 16px',
        fontSize: '13px',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
        maxWidth: '360px',
      },
    }}
  />
);

export const toast = {
  success: (msg) => hotToast.success(msg, {
    iconTheme: { primary: '#2ecc71', secondary: '#111' },
  }),
  error: (msg) => hotToast.error(msg, {
    iconTheme: { primary: '#ff4444', secondary: '#111' },
    duration: 5000,
  }),
  warning: (msg) => hotToast(msg, {
    icon: <AlertTriangle size={16} className="text-yellow-400" />,
    duration: 4000,
  }),
  info: (msg) => hotToast(msg, {
    icon: <Info size={16} className="text-blue-400" />,
  }),
  loading: (msg) => hotToast.loading(msg),
  dismiss: (id) => hotToast.dismiss(id),
  promise: (promise, msgs) => hotToast.promise(promise, msgs, {
    style: {
      background: 'rgba(16,16,16,0.95)',
      color: '#f0f0f0',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '14px',
    },
  }),
};

export default toast;
