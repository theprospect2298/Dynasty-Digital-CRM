import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  DollarSign,
  Calendar,
  Building2,
  Plus,
  Trash2,
  Download,
  Printer,
  Sparkles,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Invoice, InvoiceLineItem, InvoiceStatus, Client, ClientService, AppSettings } from '../../types';
import { formatCurrency, formatDate } from '../../lib/calculations';
import { downloadInvoicePdf, createInvoicePdf } from '../../lib/pdfGenerator';
import { getSettings } from '../../lib/db';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: Partial<Invoice> & { clientId: string }) => Promise<Invoice | void>;
  invoice?: Invoice | null;
  initialInvoice?: Invoice | null;
  clients: Client[];
  clientServices: ClientService[];
  settings?: AppSettings;
  preselectedClientId?: string;
  defaultInvoiceNumber?: string;
}

export function InvoiceModal({
  isOpen,
  onClose,
  onSave,
  invoice,
  initialInvoice,
  clients,
  clientServices,
  settings: propSettings,
  preselectedClientId,
  defaultInvoiceNumber,
}: InvoiceModalProps) {
  const activeInvoice = invoice || initialInvoice;
  const [clientId, setClientId] = useState(activeInvoice?.clientId || preselectedClientId || clients[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(activeInvoice?.invoiceNumber || defaultInvoiceNumber || 'DD-2026-0001');
  const [issueDate, setIssueDate] = useState(activeInvoice?.issueDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(activeInvoice?.dueDate || '');
  const [status, setStatus] = useState<InvoiceStatus>(activeInvoice?.status || 'Draft');
  const [notes, setNotes] = useState(activeInvoice?.notes || '');
  const [paymentInstructions, setPaymentInstructions] = useState(
    invoice?.paymentInstructions ||
      'Remit payment via automated ACH or credit card through Stripe. Wire details available upon request. Net 15 terms.'
  );
  const [tax, setTax] = useState<number>(invoice?.tax || 0);
  const [discount, setDiscount] = useState<number>(invoice?.discount || 0);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    invoice?.lineItems || [
      {
        id: 'item_1',
        description: 'Monthly Digital Marketing & Care Plan Retainer',
        quantity: 1,
        unitPrice: 1000,
        total: 1000,
      },
    ]
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const settings: AppSettings = propSettings || getSettings();
  const selectedClient = clients.find((c) => c.id === clientId);

  // Default due date to 14 days from issue date if empty
  useEffect(() => {
    if (!dueDate && issueDate) {
      const d = new Date(issueDate);
      d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().split('T')[0]);
    }
  }, [issueDate, dueDate]);

  // When modal opens or invoice changes
  useEffect(() => {
    if (invoice) {
      setClientId(invoice.clientId);
      setInvoiceNumber(invoice.invoiceNumber);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setStatus(invoice.status);
      setNotes(invoice.notes || '');
      setPaymentInstructions(invoice.paymentInstructions || 'Remit payment via automated ACH or credit card through Stripe. Net 15 terms.');
      setTax(invoice.tax || 0);
      setDiscount(invoice.discount || 0);
      setLineItems(invoice.lineItems || []);
    } else {
      const cId = preselectedClientId || clients[0]?.id || '';
      setClientId(cId);
      if (defaultInvoiceNumber) setInvoiceNumber(defaultInvoiceNumber);
      const today = new Date().toISOString().split('T')[0];
      setIssueDate(today);
      const due = new Date();
      due.setDate(due.getDate() + 14);
      setDueDate(due.toISOString().split('T')[0]);
      setStatus('Draft');
      setNotes('');
      setTax(0);
      setDiscount(0);

      // Auto-populate line items from services for preselected client
      if (cId) {
        populateFromClientServices(cId);
      }
    }
  }, [invoice, preselectedClientId, defaultInvoiceNumber, isOpen]);

  const populateFromClientServices = (targetClientId: string) => {
    const activeServices = clientServices.filter(
      (s) => s.clientId === targetClientId && (s.status === 'Active' || s.status === 'Pending')
    );

    if (activeServices.length > 0) {
      const items: InvoiceLineItem[] = activeServices.map((srv, idx) => ({
        id: `li_${srv.id}_${idx}`,
        serviceId: srv.id,
        description: `${srv.customName}${srv.billingType === 'monthly' ? ' (Monthly Retainer)' : ' (Project Fee)'}`,
        quantity: 1,
        unitPrice: srv.price,
        total: srv.price,
      }));
      setLineItems(items);
    } else {
      setLineItems([
        {
          id: `item_${Date.now()}`,
          description: 'Digital Marketing & Growth Retainer',
          quantity: 1,
          unitPrice: 1200,
          total: 1200,
        },
      ]);
    }
  };

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    populateFromClientServices(newClientId);
  };

  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item_${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateLineItem = (index: number, field: keyof InvoiceLineItem, val: string | number) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: val };

    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? Number(val) || 0 : item.quantity;
      const rate = field === 'unitPrice' ? Number(val) || 0 : item.unitPrice;
      item.total = qty * rate;
    }

    updated[index] = item;
    setLineItems(updated);
  };

  // Calculations
  const subtotal = lineItems.reduce((acc, it) => acc + (it.total || it.quantity * it.unitPrice), 0);
  const total = Math.max(0, subtotal + (Number(tax) || 0) - (Number(discount) || 0));

  const currentInvoiceDraft: Invoice = {
    id: invoice?.id || 'temp_draft',
    invoiceNumber,
    clientId,
    issueDate,
    dueDate,
    status,
    lineItems,
    subtotal,
    tax,
    discount,
    total,
    paymentInstructions,
    notes,
    createdAt: invoice?.createdAt || new Date().toISOString(),
    paidDate: status === 'Paid' ? invoice?.paidDate || new Date().toISOString().split('T')[0] : undefined,
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setSaving(true);
    try {
      await onSave({
        id: invoice?.id,
        invoiceNumber,
        clientId,
        issueDate,
        dueDate,
        status,
        lineItems,
        subtotal,
        tax,
        discount,
        total,
        paymentInstructions,
        notes,
        paidDate: status === 'Paid' ? (invoice?.paidDate || new Date().toISOString().split('T')[0]) : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedClient) return;
    downloadInvoicePdf(currentInvoiceDraft, selectedClient, settings);
  };

  const handlePrintPdf = () => {
    if (!selectedClient) return;
    const doc = createInvoicePdf(currentInvoiceDraft, selectedClient, settings);
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#11131F] border border-[#262A40] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262A40] bg-[#181A2A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3D5AFE]/15 border border-[#3D5AFE]/30 flex items-center justify-center text-[#3D5AFE]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{invoice ? 'Edit Invoice' : 'Create Branded Invoice'}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#22D3EE]/15 text-[#22D3EE] font-semibold border border-[#22D3EE]/30">
                  {invoiceNumber}
                </span>
              </h2>
              <p className="text-xs text-[#A9ADC6]">
                Dynasty Digital official client invoice with PDF export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                previewMode
                  ? 'bg-[#3D5AFE] text-white border-[#3D5AFE]'
                  : 'bg-[#11131F] text-[#A9ADC6] border-[#262A40] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{previewMode ? 'Edit Form' : 'PDF Preview'}</span>
            </button>

            {selectedClient && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#22D3EE]/15 text-[#22D3EE] hover:bg-[#22D3EE]/25 border border-[#22D3EE]/30 transition-colors flex items-center gap-1.5"
                title="Download PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#262A40] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Toggle Form / Visual PDF Preview */}
        {previewMode ? (
          <div className="flex-1 overflow-y-auto p-6 bg-[#0E0F17]">
            {/* Visual Invoice Paper Preview */}
            <div className="max-w-3xl mx-auto bg-white text-slate-800 rounded-xl p-8 sm:p-10 shadow-2xl border border-slate-200">
              {/* Top Accent Strip */}
              <div className="h-2 w-full bg-[#3D5AFE] rounded-t -mt-8 -mx-8 sm:-mx-10 sm:-mt-10 mb-8" />

              {/* Invoice Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-200">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {settings.agencyName || 'DYNASTY DIGITAL'}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">Performance Digital Marketing & Web Engineering</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {settings.email} • {settings.phone} • {settings.location}
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className="text-2xl font-extrabold text-slate-900">INVOICE</div>
                  <div className="font-mono text-sm font-bold text-[#3D5AFE]">{invoiceNumber}</div>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'Overdue'
                        ? 'bg-rose-100 text-rose-800'
                        : status === 'Sent'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>

              {/* Billed To / Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Billed To</div>
                  <div className="text-base font-bold text-slate-900">
                    {selectedClient?.businessName || 'Client Name'}
                  </div>
                  {selectedClient?.contactName && (
                    <div className="text-xs text-slate-600">Attn: {selectedClient.contactName}</div>
                  )}
                  {selectedClient?.email && (
                    <div className="text-xs text-slate-500">{selectedClient.email}</div>
                  )}
                  {selectedClient?.phone && (
                    <div className="text-xs text-slate-500">{selectedClient.phone}</div>
                  )}
                  {(selectedClient?.address || selectedClient?.city) && (
                    <div className="text-xs text-slate-500">
                      {[selectedClient.address, selectedClient.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                <div className="sm:text-right space-y-1 text-xs">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Invoice Details</div>
                  <div className="flex justify-between sm:justify-end gap-3 text-slate-600">
                    <span>Issue Date:</span>
                    <strong className="text-slate-900">{formatDate(issueDate)}</strong>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-3 text-slate-600">
                    <span>Due Date:</span>
                    <strong className={status === 'Overdue' ? 'text-rose-600' : 'text-slate-900'}>
                      {formatDate(dueDate)}
                    </strong>
                  </div>
                  {status === 'Paid' && currentInvoiceDraft.paidDate && (
                    <div className="flex justify-between sm:justify-end gap-3 text-emerald-700">
                      <span>Paid Date:</span>
                      <strong>{formatDate(currentInvoiceDraft.paidDate)}</strong>
                    </div>
                  )}
                  <div className="flex justify-between sm:justify-end gap-3 text-slate-500">
                    <span>Terms:</span>
                    <span>Net 15 / Due on Receipt</span>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="py-6">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white rounded">
                      <th className="py-2.5 px-3 rounded-l font-semibold">Description</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Qty</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Unit Price</th>
                      <th className="py-2.5 px-3 text-right rounded-r font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-3 px-3 font-medium text-slate-800">{item.description}</td>
                        <td className="py-3 px-3 text-center text-slate-600 font-mono">{item.quantity}</td>
                        <td className="py-3 px-3 text-right text-slate-600 font-mono">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mt-4">
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount:</span>
                        <span className="font-mono font-medium">-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    {tax > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Tax / Fees:</span>
                        <span className="font-mono font-medium">{formatCurrency(tax)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-base font-extrabold text-[#3D5AFE]">
                      <span>Total Due:</span>
                      <span className="font-mono">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Instructions & Notes */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-900 mb-1">Payment Instructions</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{paymentInstructions}</p>
                </div>
                {notes && (
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="font-bold text-slate-900 mb-1">Notes & Details</div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                Thank you for your business with Dynasty Digital • {settings.website}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Grid: Client & Invoice Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Client Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1.5">Client *</label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                  required
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.businessName} ({c.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1.5">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="DD-2026-0001"
                  className="w-full px-3 py-2 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#3D5AFE]"
                  required
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1.5">Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  className="w-full px-3 py-2 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1.5">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                  required
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Line Items</h3>
                  <button
                    type="button"
                    onClick={() => clientId && populateFromClientServices(clientId)}
                    className="text-[11px] text-[#22D3EE] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Pull From Active Services</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="px-2.5 py-1 rounded-lg bg-[#3D5AFE]/15 border border-[#3D5AFE]/30 text-[#3D5AFE] hover:bg-[#3D5AFE]/25 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-2 border border-[#262A40] rounded-xl p-3 bg-[#181A2A]/40">
                {lineItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex flex-col sm:flex-row items-center gap-2.5 p-2 bg-[#181A2A] border border-[#262A40] rounded-lg"
                  >
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(idx, 'description', e.target.value)}
                        placeholder="Service or item description..."
                        className="w-full px-2.5 py-1.5 bg-[#11131F] border border-[#262A40] rounded-lg text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLineItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                          className="w-full px-2.5 py-1.5 bg-[#11131F] border border-[#262A40] rounded-lg text-white text-xs font-mono text-center focus:outline-none focus:border-[#3D5AFE]"
                          placeholder="Qty"
                        />
                      </div>

                      <div className="w-28 relative">
                        <span className="absolute left-2 top-1.5 text-xs text-[#A9ADC6] font-mono">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateLineItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-2.5 py-1.5 bg-[#11131F] border border-[#262A40] rounded-lg text-white text-xs font-mono text-right focus:outline-none focus:border-[#3D5AFE]"
                          placeholder="Price"
                        />
                      </div>

                      <div className="w-28 text-right font-mono font-bold text-xs text-white px-2">
                        {formatCurrency(item.total)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        disabled={lineItems.length === 1}
                        className="p-1 text-[#A9ADC6] hover:text-[#FF5A5F] disabled:opacity-30 disabled:hover:text-[#A9ADC6] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations & Totals Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1">Discount ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#3D5AFE]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1">Tax / Fees ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#3D5AFE]"
                />
              </div>

              <div className="p-3 bg-[#181A2A] border border-[#262A40] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A9ADC6] block">Total Amount</span>
                  <span className="text-xs text-[#A9ADC6]">Subtotal {formatCurrency(subtotal)}</span>
                </div>
                <div className="text-xl font-bold font-mono text-[#22D3EE]">{formatCurrency(total)}</div>
              </div>
            </div>

            {/* Payment Instructions & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1.5">Payment Instructions</label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                  placeholder="Remittance details, Stripe portal link, ACH instructions..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A9ADC6] mb-1.5">Invoice Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181A2A] border border-[#262A40] rounded-xl text-white text-xs focus:outline-none focus:border-[#3D5AFE]"
                  placeholder="Optional memo or scope notes..."
                />
              </div>
            </div>

            {/* Bottom Actions inside form */}
            <div className="flex items-center justify-between pt-4 border-t border-[#262A40]">
              <div className="flex items-center gap-2">
                {selectedClient && (
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-[#181A2A] border border-[#262A40] text-[#A9ADC6] hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#181A2A] text-[#A9ADC6] hover:text-white border border-[#262A40] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !clientId}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#3D5AFE] hover:bg-[#324bda] text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : invoice ? 'Update Invoice' : 'Save Invoice'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
