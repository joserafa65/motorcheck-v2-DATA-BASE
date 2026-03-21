import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck as CheckCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const FADE_OUT_DELAY = 2300;

const ToastItem: React.FC<{ id: string; message: string }> = ({ id, message }) => {
  const { dismissToast } = useToast();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const enterTimer = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });

    const leaveTimer = setTimeout(() => {
      setLeaving(true);
    }, FADE_OUT_DELAY);

    const removeTimer = setTimeout(() => {
      dismissToast(id);
    }, FADE_OUT_DELAY + 400);

    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, [id, dismissToast]);

  return (
    <div
      style={{
        transition: 'opacity 300ms ease, transform 300ms ease',
        opacity: visible && !leaving ? 1 : 0,
        transform: visible && !leaving ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
      className="flex items-center gap-3 bg-gray-900 dark:bg-zinc-800 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 max-w-xs w-full"
    >
      <CheckCircle size={18} className="text-green-400 shrink-0" />
      <span className="text-sm font-semibold leading-tight">{message}</span>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return createPortal(
    <div
      className="fixed bottom-24 left-0 right-0 z-[200] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {toasts.map(t => (
        <ToastItem key={t.id} id={t.id} message={t.message} />
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
