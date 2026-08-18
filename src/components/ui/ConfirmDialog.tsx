import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-muted-foreground mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-outline text-sm" disabled={loading}>
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`text-sm ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
          disabled={loading}
        >
          {loading ? 'Memproses...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}