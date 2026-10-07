import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = true,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDestructive ? 'bg-[#FF5A5F]/15 text-[#FF5A5F]' : 'bg-[#F5A524]/15 text-[#F5A524]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-xs text-[#A9ADC6] mt-1.5 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#181B2C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#262A40] text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-md ${
              isDestructive
                ? 'bg-[#FF5A5F] hover:bg-[#e0454a] text-white shadow-[#FF5A5F]/20'
                : 'bg-[#3D5AFE] hover:bg-[#324bda] text-white shadow-[#3D5AFE]/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
