import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title = 'Confirm Action', message, confirmText = 'Delete', loading = false }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-warm-terracotta/10 border border-warm-terracotta/20 text-warm-terracotta">
          <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-warm-text bg-warm-hover hover:bg-warm-border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-warm-terracotta hover:bg-warm-terracotta/90 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
