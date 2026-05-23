import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ToastContext, type ToastVariant } from '../hooks/useToast';
import '../styles/Toast.css';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

const AUTO_CLOSE = 2000;
const EXIT_DURATION = 200;

const TOAST_ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '!',
  warning: '!',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastItem, setToastItem] = useState<ToastItem | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const toastIdRef = useRef(0);
  const toastId = toastItem?.id;

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'error') => {
      const id = toastIdRef.current + 1;
      toastIdRef.current = id;

      setToastItem({
        id,
        message,
        variant,
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      toast,
      success: (message: string) => toast(message, 'success'),
      error: (message: string) => toast(message, 'error'),
      warning: (message: string) => toast(message, 'warning'),
    }),
    [toast],
  );

  useEffect(() => {
    if (!toastId) return;

    setMounted(true);
    setVisible(true);

    const exitTimer = window.setTimeout(() => {
      setVisible(false);
    }, AUTO_CLOSE);

    const unmountTimer = window.setTimeout(() => {
      setMounted(false);
      setToastItem(null);
    }, AUTO_CLOSE + EXIT_DURATION);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [toastId]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && toastItem && (
        <div
          key={toastItem.id}
          className={`toast-wrapper ${visible ? 'toast-wrapper-visible' : 'toast-wrapper-hidden'}`}
          aria-live="polite"
          aria-relevant="additions"
        >
          <div
            className="toast-box"
            role={toastItem.variant === 'error' ? 'alert' : 'status'}
          >
            <span className={`toast-icon-circle toast-${toastItem.variant}`} aria-hidden="true">
              {TOAST_ICONS[toastItem.variant]}
            </span>
            <span className="toast-message">{toastItem.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
