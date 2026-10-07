import React, { useState } from 'react';
import { X, DollarSign, Receipt, CreditCard } from 'lucide-react';
import { Client, ClientService, Payment, PaymentMethod, PaymentType, PaymentStatus } from '../../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Partial<Payment> & { clientId: string; amount: number }) => void;
  clients: Client[];
  clientServices: ClientService[];
  preselectedClientId?: string;
  preselectedServiceId?: string;
  initialData?: Payment | null;
}

const METHODS: PaymentMethod[] = ['ACH', 'Card/Stripe', 'Cash', 'Zelle', 'Other'];
const TYPES: PaymentType[] = ['Monthly', 'Deposit', 'Final', 'Setup', 'Add-on'];
const STATUSES: PaymentStatus[] = ['Paid', 'Pending', 'Failed', 'Refunded'];

export function PaymentModal({
  isOpen,
  onClose,
  onSave,
  clients,
  clientServices,
  preselectedClientId,
  preselectedServiceId,
  initialData,
}: PaymentModalProps) {
  const [clientId, setClientId] = useState(
    initialData?.clientId || preselectedClientId || (clients[0]?.id || '')
  );
  const [clientServiceId, setClientServiceId] = useState(
    initialData?.clientServiceId || preselectedServiceId || ''
  );
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 297);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>(initialData?.method || 'Card/Stripe');
  const [type, setType] = useState<PaymentType>(initialData?.type || 'Monthly');
  const [status, setStatus] = useState<PaymentStatus>(initialData?.status || 'Paid');
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialData?.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Filter services for chosen client
  const clientAvailableServices = clientServices.filter((s) => s.clientId === clientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }

    onSave({
      id: initialData?.id,
      clientId,
      clientServiceId: clientServiceId || undefined,
      amount: Number(amount),
      date,
      method,
      type,
      status,
      invoiceNumber: invoiceNumber.trim(),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#262A40] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#7CFF6B]/15 text-[#7CFF6B]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {initialData ? 'Edit Payment Record' : 'Log Received / Pending Payment'}
              </h2>
              <p className="text-xs text-[#A9ADC6]">
                Track agency income, invoice numbers, ACH & Stripe transactions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[#FF5A5F]/10 border border-[#FF5A5F]/30 text-[#FF5A5F] text-xs font-mono">
              {error}
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Client Account <span className="text-[#FF5A5F]">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setClientServiceId('');
              }}
              disabled={!!preselectedClientId && !initialData}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#11131F]">
                  {c.businessName} ({c.contactName || c.status})
                </option>
              ))}
            </select>
          </div>

          {/* Service Link (Optional) */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Associated Retainer / Service (Optional)
            </label>
            <select
              value={clientServiceId}
              onChange={(e) => {
                const sId = e.target.value;
                setClientServiceId(sId);
                const s = clientServices.find((item) => item.id === sId);
                if (s) {
                  setAmount(s.price);
                  setType(s.billingType === 'monthly' ? 'Monthly' : 'Deposit');
                }
              }}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white"
            >
              <option value="">-- General Agency Payment / Custom --</option>
              {clientAvailableServices.map((srv) => (
                <option key={srv.id} value={srv.id} className="bg-[#11131F]">
                  {srv.customName} (${srv.price} · {srv.billingType})
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Amount ($) <span className="text-[#FF5A5F]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Method & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m} className="bg-[#11131F]">
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Payment Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PaymentType)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#11131F]">
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status & Invoice Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Payment Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-[#11131F]">
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Invoice / Ref Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-092"
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono placeholder-[#A9ADC6]/40"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Internal Notes
            </label>
            <input
              type="text"
              placeholder="e.g. October Care Plan retainer received via Stripe"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white placeholder-[#A9ADC6]/40"
            />
          </div>

          <div className="pt-4 border-t border-[#262A40] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#262A40] text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-white text-xs font-medium transition-all shadow-md shadow-[#3D5AFE]/20"
            >
              {initialData ? 'Save Payment' : 'Log Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
