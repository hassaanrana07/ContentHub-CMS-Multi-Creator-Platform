import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  const isSuccess = type === 'success';

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-0 ${
      isSuccess 
        ? 'bg-warm-surface border-warm-border text-warm-charcoal shadow-warm-charcoal/10' 
        : 'bg-warm-surface border-warm-terracotta/40 text-warm-terracotta shadow-warm-terracotta/10'
    }`}>
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-warm-brown shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-warm-terracotta shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="p-1 hover:bg-warm-hover rounded text-warm-muted hover:text-warm-text">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
