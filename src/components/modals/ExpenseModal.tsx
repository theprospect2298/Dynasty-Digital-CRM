import React, { useState, useEffect } from 'react';
import { X, DollarSign, Tag, Calendar, Building2, Link as LinkIcon, FileText } from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseRecurring, Client } from '../../types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Partial<Expense> & { vendor: string; amount: number; category: ExpenseCategory }) => void;
  clients: Client[];
  initialExpense?: Expense | null;
  preselectedClientId?: string;
}

const CATEGORIES: ExpenseCategory[] = [
  'Software/Tools',
  'Hosting',
  'Subcontractor',
  'Ads for Dynasty Digital',
  'Equipment',
  'Insurance',
  'Fees',
  'Other',
];

export function ExpenseModal({
  isOpen,
  onClose,
  onSave,
  clients,
  initialExpense,
  preselectedClientId,
}: ExpenseModalProps) {
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Software/Tools');
  const [recurring, setRecurring] = useState<ExpenseRecurring>('monthly');
  const [clientId, setClientId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [receiptLink, setReceiptLink] = useState('');

  useEffect(() => {
    if (initialExpense) {
      setVendor(initialExpense.vendor);
      setAmount(String(initialExpense.amount));
      setDate(initialExpense.date);
      setCategory(initialExpense.category);
      setRecurring(initialExpense.recurring);
      setClientId(initialExpense.clientId || '');
      setNotes(initialExpense.notes || '');
      setReceiptLink(initialExpense.receiptLink || '');
    } else {
      setVendor('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Software/Tools');
      setRecurring('monthly');
      setClientId(preselectedClientId || '');
      setNotes('');
      setReceiptLink('');
    }
  }, [initialExpense, preselectedClientId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim() || !amount) return;

    onSave({
      ...(initialExpense?.id ? { id: initialExpense.id } : {}),
      vendor: vendor.trim(),
      amount: parseFloat(amount) || 0,
      date: date || new Date().toISOString().split('T')[0],
      category,
      recurring,
      clientId: clientId || undefined,
      notes: notes.trim() || undefined,
      receiptLink: receiptLink.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262A40] bg-[#07080F]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#22D3EE]/10 border border-[#22D3EE]/20 flex items-center justify-center text-[#22D3EE]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {initialExpense ? 'Edit Operating Expense' : 'Log New Expense'}
              </h2>
              <p className="text-xs text-[#A9ADC6]">
                Track agency software, tools, infrastructure & client pass-through costs
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Vendor & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A9ADC6] mb-1.5">
                Vendor / Service *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CallRail, Webflow, Upwork"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#07080F] border border-[#262A40] rounded-xl text-sm text-white placeholder-[#5A5F7D] focus:outline-none focus:border-[#22D3EE] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A9ADC6] mb-1.5">
                Amount ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-mono text-[#A9ADC6]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-[#07080F] border border-[#262A40] rounded-xl text-sm font-mono text-white placeholder-[#5A5F7D] focus:outline-none focus:border-[#22D3EE] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Category & Recurring */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A9ADC6] mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3.5 py-2.5 bg-[#07080F] border border-[#262A40] rounded-xl text-sm text-white focus:outline-none focus:border-[#22D3EE] transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A9ADC6] mb-1.5">
                Billing Cycle *
              </label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as ExpenseRecurring)}
                className="w-full px-3.5 py-2.5 bg-[#07080F] border border-[#262A40] rounded-xl text-sm text-white focus:outline-none focus:border-[#22D3EE] transition-colors"
              >
                <option value="monthly">Monthly Recurring</option>
                <option value="yearly">Yearly (Annual)</option>
                <option value="one-time">One-Time Expense</option>
              </select>
            </div>
          </div>

          {/* Date & Tied Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A9ADC6] mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#07080F] border border-[#262A40] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-[#22D3EE] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A9ADC6] mb-1.5">
                Linked Client (Optional)
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#07080F] border border-[#262A40] rounded-xl text-sm text-white focus:outline-none focus:border-[#22D3EE] transition-colors"
              >
                <option value="">None (Agency Overhead)</option>
                {clients
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} {c.status === 'Active Client' ? '●' : `(${c.status})`}
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-[#A9ADC6] mt-1">
                Direct costs reduce this client's calculated net margin.
              </p>
            </div>
          </div>

          {/* Receipt Link */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A9ADC6] mb-1.5">
              Receipt / Invoice Link (Optional)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-[#A9ADC6]">
                <LinkIcon className="w-4 h-4" />
              </span>
              <input
                type="url"
                placeholder="https://..."
                value={receiptLink}
                onChange={(e) => setReceiptLink(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-[#07080F] border border-[#262A40] rounded-xl text-sm text-white placeholder-[#5A5F7D] focus:outline-none focus:border-[#22D3EE] transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A9ADC6] mb-1.5">
              Notes / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Call tracking pool for landscaping ads campaign"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#07080F] border border-[#262A40] rounded-xl text-sm text-white placeholder-[#5A5F7D] focus:outline-none focus:border-[#22D3EE] transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262A40]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#3D5AFE] hover:bg-[#324ad4] text-sm font-semibold text-white shadow-lg shadow-[#3D5AFE]/20 transition-all"
            >
              {initialExpense ? 'Save Changes' : 'Log Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
