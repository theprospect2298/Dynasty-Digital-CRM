import React, { useState, useEffect } from 'react';
import { X, Briefcase, Calculator, Calendar, Percent } from 'lucide-react';
import { Client, ClientService, ServiceCatalogItem, BillingType, ServiceStatus } from '../../types';
import { formatCurrency } from '../../lib/calculations';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (service: Partial<ClientService> & { clientId: string; customName: string; price: number }) => void;
  clients: Client[];
  catalog: ServiceCatalogItem[];
  preselectedClientId?: string;
  initialData?: ClientService | null;
}

export function ServiceModal({
  isOpen,
  onClose,
  onSave,
  clients,
  catalog,
  preselectedClientId,
  initialData,
}: ServiceModalProps) {
  const [clientId, setClientId] = useState(initialData?.clientId || preselectedClientId || (clients[0]?.id || ''));
  const [selectedCatalogId, setSelectedCatalogId] = useState(initialData?.catalogItemId || '');
  const [customName, setCustomName] = useState(initialData?.customName || '');
  const [category, setCategory] = useState(initialData?.category || 'Website Care Plan');
  const [billingType, setBillingType] = useState<BillingType>(initialData?.billingType || 'monthly');
  const [price, setPrice] = useState<number>(initialData?.price ?? 297);
  const [setupFee, setSetupFee] = useState<number>(initialData?.setupFee ?? 0);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(initialData?.discountType || 'fixed');
  const [discountValue, setDiscountValue] = useState<number>(initialData?.discountValue ?? 0);
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().split('T')[0]);
  const [minimumTermMonths, setMinimumTermMonths] = useState<number>(initialData?.minimumTermMonths ?? 12);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [autoRenew, setAutoRenew] = useState<boolean>(initialData?.autoRenew ?? true);
  const [status, setStatus] = useState<ServiceStatus>(initialData?.status || 'Active');
  const [billingDayOfMonth, setBillingDayOfMonth] = useState<number>(initialData?.billingDayOfMonth ?? 1);
  const [adSpendBudget, setAdSpendBudget] = useState<number | undefined>(initialData?.adSpendBudget);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState('');

  // Auto-calculate end date whenever start date or minimumTermMonths changes
  useEffect(() => {
    if (!initialData && startDate && minimumTermMonths > 0 && billingType === 'monthly') {
      const parts = startDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setMonth(d.getMonth() + minimumTermMonths);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        setEndDate(`${y}-${m}-${day}`);
      }
    }
  }, [startDate, minimumTermMonths, billingType, initialData]);

  if (!isOpen) return null;

  const handleCatalogSelect = (catId: string) => {
    setSelectedCatalogId(catId);
    const item = catalog.find((c) => c.id === catId);
    if (item) {
      setCustomName(item.name);
      setCategory(item.category);
      setBillingType(item.billingType);
      setPrice(item.defaultPrice);
      setSetupFee(item.setupFee);
      setMinimumTermMonths(item.minimumTermMonths);

      // Auto compute end date
      if (item.billingType === 'monthly' && item.minimumTermMonths > 0) {
        const parts = startDate.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          d.setMonth(d.getMonth() + item.minimumTermMonths);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setEndDate(`${y}-${m}-${day}`);
        }
      } else {
        setEndDate('');
      }
    }
  };

  // Preview final monthly price after discount
  let finalRate = price;
  if (discountType === 'percent') {
    finalRate = price * (1 - discountValue / 100);
  } else {
    finalRate = Math.max(0, price - discountValue);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!customName.trim()) {
      setError('Service name is required.');
      return;
    }

    onSave({
      id: initialData?.id,
      clientId,
      catalogItemId: selectedCatalogId || undefined,
      customName: customName.trim(),
      category,
      billingType,
      price: Number(price) || 0,
      setupFee: Number(setupFee) || 0,
      discountType,
      discountValue: Number(discountValue) || 0,
      startDate,
      minimumTermMonths: Number(minimumTermMonths) || 0,
      endDate,
      autoRenew,
      status,
      billingDayOfMonth: Math.min(Math.max(1, Number(billingDayOfMonth) || 1), 28),
      adSpendBudget: adSpendBudget ? Number(adSpendBudget) : undefined,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#262A40] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F5A524]/15 text-[#F5A524]">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {initialData ? 'Edit Client Service' : 'Attach Service to Client'}
              </h2>
              <p className="text-xs text-[#A9ADC6]">
                Configure recurring retainer, one-time build, discounts & contract term
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
              onChange={(e) => setClientId(e.target.value)}
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

          {/* Pre-select from Service Catalog */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Select Preset from Agency Catalog
            </label>
            <select
              value={selectedCatalogId}
              onChange={(e) => handleCatalogSelect(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white"
            >
              <option value="">-- Custom Custom Service / Package --</option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id} className="bg-[#11131F]">
                  {item.name} · {formatCurrency(item.defaultPrice)}/{item.billingType === 'monthly' ? 'mo' : 'one-time'}
                  {item.minimumTermMonths > 0 ? ` (${item.minimumTermMonths}m min)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Service Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Custom Service Name <span className="text-[#FF5A5F]">*</span>
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Website Care Plan: Growth"
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
              >
                <option value="Website Care Plan">Website Care Plan</option>
                <option value="Website Build">Website Build</option>
                <option value="Google Business Profile">Google Business Profile</option>
                <option value="Ads Management">Ads Management</option>
                <option value="Creative Add-on">Creative Add-on</option>
                <option value="SEO & Content">SEO & Content</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Billing Type & Base Price & Setup Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Billing Cadence
              </label>
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value as BillingType)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              >
                <option value="monthly">Monthly Retainer</option>
                <option value="one-time">One-time Fee</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Base Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Setup / Onboarding Fee ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={setupFee}
                onChange={(e) => setSetupFee(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>
          </div>

          {/* Discount Section */}
          <div className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#A9ADC6] mb-1">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                className="w-full px-2.5 py-1.5 bg-[#11131F] border border-[#262A40] focus:border-[#22D3EE] rounded-lg text-xs text-white"
              >
                <option value="fixed">Fixed Amount ($)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#A9ADC6] mb-1">
                Discount Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-[#11131F] border border-[#262A40] focus:border-[#22D3EE] rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[11px] text-[#A9ADC6]">Effective Monthly Rate</span>
              <span className="font-mono text-sm font-bold text-[#7CFF6B]">
                {formatCurrency(finalRate)}/mo
              </span>
            </div>
          </div>

          {/* Contract Terms: Start Date, Term, End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Min. Term (Months)
              </label>
              <input
                type="number"
                min="0"
                value={minimumTermMonths}
                onChange={(e) => setMinimumTermMonths(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Commitment End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Status, Billing Day, Auto-Renew */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Service Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              >
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Paused">Paused</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Billing Day of Month
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={billingDayOfMonth}
                onChange={(e) => setBillingDayOfMonth(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRenew}
                  onChange={(e) => setAutoRenew(e.target.checked)}
                  className="w-4 h-4 rounded border-[#262A40] bg-[#07080F] text-[#22D3EE] focus:ring-0"
                />
                <span className="text-xs text-white">Auto-Renew Contract</span>
              </label>
            </div>
          </div>

          {/* Ad Spend Budget (for ads services) */}
          {category === 'Ads Management' && (
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Monthly Ad Spend Budget ($) (Paid directly by client to ad platforms)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 2500"
                value={adSpendBudget || ''}
                onChange={(e) => setAdSpendBudget(parseFloat(e.target.value) || undefined)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono placeholder-[#A9ADC6]/40"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Service Scope & Deliverable Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Weekly blog post, 2 GBP updates, bi-weekly speed boost..."
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
              {initialData ? 'Save Service Changes' : 'Attach Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
