import React, { useState, useMemo } from 'react';
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  Plus,
  FileText,
  Download,
  Edit2,
  Trash2,
  Search,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Client, ClientService, Payment, Invoice, InvoiceStatus } from '../../types';
import {
  formatCurrency,
  formatDate,
  getNextBillingDate,
  getServiceMonthlyRate,
  isClientServiceOverdue,
} from '../../lib/calculations';
import { StatusBadge } from '../common/StatusBadge';
import { downloadInvoicePdf } from '../../lib/pdfGenerator';
import { getSettings } from '../../lib/db';

interface BillingViewProps {
  clients: Client[];
  clientServices: ClientService[];
  payments: Payment[];
  invoices?: Invoice[];
  onSelectClient: (clientId: string) => void;
  onQuickMarkPaid: (service: ClientService, monthKey: string) => void;
  onOpenNewPayment: () => void;
  onOpenNewInvoice?: (clientId?: string) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

export function BillingView({
  clients,
  clientServices,
  payments,
  invoices = [],
  onSelectClient,
  onQuickMarkPaid,
  onOpenNewPayment,
  onOpenNewInvoice,
  onEditInvoice,
  onDeleteInvoice,
}: BillingViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'ledger'>('invoices');

  // Ledger state
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | 'Paid' | 'Pending' | 'Overdue'>('all');

  // Invoices state
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  const settings = getSettings();

  // Compute selected month target for ledger
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + selectedMonthOffset, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const monthName = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

  // Active monthly services expected in this month
  const monthlyServices = clientServices.filter((s) => {
    const client = clients.find((c) => c.id === s.clientId);
    return client && !client.archived && s.status === 'Active' && s.billingType === 'monthly';
  });

  // Build ledger items
  const ledgerItems = monthlyServices.map((service) => {
    const client = clients.find((c) => c.id === service.clientId);
    const day = Math.min(Math.max(1, service.billingDayOfMonth || 1), 28);
    const expectedDueDate = `${monthKey}-${String(day).padStart(2, '0')}`;
    const monthlyRate = getServiceMonthlyRate(service);

    const matchingPayment = payments.find((p) => {
      if (p.clientId !== service.clientId || p.status !== 'Paid') return false;
      const pDate = p.date || '';
      const inMonth = pDate.startsWith(monthKey);
      const isLinked = !p.clientServiceId || p.clientServiceId === service.id;
      return inMonth && isLinked;
    });

    const isOverdue =
      !matchingPayment &&
      isClientServiceOverdue(
        service,
        payments,
        selectedMonthOffset === 0 ? now : new Date(targetYear, targetMonth, 28)
      );

    const status: 'Paid' | 'Pending' | 'Overdue' = matchingPayment
      ? 'Paid'
      : isOverdue
      ? 'Overdue'
      : 'Pending';

    return {
      service,
      client,
      expectedDueDate,
      amount: monthlyRate,
      matchingPayment,
      status,
    };
  });

  const filteredLedger = ledgerItems.filter((item) => {
    if (ledgerStatusFilter === 'all') return true;
    return item.status === ledgerStatusFilter;
  });

  const totalExpectedLedger = ledgerItems.reduce((acc, item) => acc + item.amount, 0);
  const totalCollectedLedger = ledgerItems
    .filter((item) => item.status === 'Paid')
    .reduce((acc, item) => acc + item.amount, 0);
  const totalOverdueLedger = ledgerItems
    .filter((item) => item.status === 'Overdue')
    .reduce((acc, item) => acc + item.amount, 0);

  // Invoices computation
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invoiceStatusFilter !== 'all' && inv.status !== invoiceStatusFilter) {
        return false;
      }
      if (invoiceSearchQuery.trim()) {
        const query = invoiceSearchQuery.toLowerCase();
        const client = clients.find((c) => c.id === inv.clientId);
        const clientName = client?.businessName.toLowerCase() || '';
        const invNum = inv.invoiceNumber.toLowerCase();
        return invNum.includes(query) || clientName.includes(query);
      }
      return true;
    });
  }, [invoices, invoiceStatusFilter, invoiceSearchQuery, clients]);

  const totalInvoiced = invoices.reduce((acc, i) => acc + i.total, 0);
  const totalPaidInvoices = invoices.filter((i) => i.status === 'Paid').reduce((acc, i) => acc + i.total, 0);
  const totalOverdueInvoices = invoices.filter((i) => i.status === 'Overdue').reduce((acc, i) => acc + i.total, 0);
  const totalDraftOrSentInvoices = invoices
    .filter((i) => i.status === 'Draft' || i.status === 'Sent')
    .reduce((acc, i) => acc + i.total, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Billing & Invoicing Engine</h2>
          <p className="text-xs text-[#A9ADC6] mt-0.5">
            Manage branded Dynasty Digital PDF invoices, auto-numbering, and monthly retainer reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtab toggle */}
          <div className="flex items-center bg-[#11131F] border border-[#262A40] p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('invoices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSubTab === 'invoices'
                  ? 'bg-[#3D5AFE] text-white shadow-sm'
                  : 'text-[#A9ADC6] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices ({invoices.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeSubTab === 'ledger'
                  ? 'bg-[#3D5AFE] text-white shadow-sm'
                  : 'text-[#A9ADC6] hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Monthly Ledger</span>
            </button>
          </div>

          {activeSubTab === 'invoices' ? (
            <button
              onClick={() => onOpenNewInvoice?.()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#22D3EE] hover:bg-[#1ebacf] text-xs font-bold text-[#07080F] transition-all shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Generate Invoice</span>
            </button>
          ) : (
            <button
              onClick={onOpenNewPayment}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-bold text-white transition-all shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Log Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. INVOICES & BRANDED BILLING SUB-TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-6">
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
              <span className="text-xs text-[#A9ADC6] block mb-1">Total Invoiced</span>
              <div className="font-mono text-xl sm:text-2xl font-bold text-white">
                {formatCurrency(totalInvoiced)}
              </div>
              <span className="text-[10px] text-[#A9ADC6] font-mono mt-0.5 block">
                {invoices.length} invoices generated
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
              <span className="text-xs text-[#A9ADC6] block mb-1">Collected (Paid)</span>
              <div className="font-mono text-xl sm:text-2xl font-bold text-[#7CFF6B]">
                {formatCurrency(totalPaidInvoices)}
              </div>
              <span className="text-[10px] text-[#7CFF6B] font-mono mt-0.5 block">
                {invoices.filter((i) => i.status === 'Paid').length} paid in full
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
              <span className="text-xs text-[#A9ADC6] block mb-1">Overdue Invoices</span>
              <div className="font-mono text-xl sm:text-2xl font-bold text-[#FF5A5F]">
                {formatCurrency(totalOverdueInvoices)}
              </div>
              <span className="text-[10px] text-[#FF5A5F] font-mono mt-0.5 block">
                {invoices.filter((i) => i.status === 'Overdue').length} past due date
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
              <span className="text-xs text-[#A9ADC6] block mb-1">Open (Draft / Sent)</span>
              <div className="font-mono text-xl sm:text-2xl font-bold text-[#22D3EE]">
                {formatCurrency(totalDraftOrSentInvoices)}
              </div>
              <span className="text-[10px] text-[#22D3EE] font-mono mt-0.5 block">
                {invoices.filter((i) => i.status === 'Draft' || i.status === 'Sent').length} awaiting payment
              </span>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#A9ADC6] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search invoice # or client name..."
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#07080F] border border-[#262A40] text-xs text-white placeholder-[#A9ADC6]/50 focus:outline-none focus:border-[#22D3EE]"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
              {(['all', 'Draft', 'Sent', 'Paid', 'Overdue'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setInvoiceStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    invoiceStatusFilter === st
                      ? 'bg-[#22D3EE] text-[#07080F]'
                      : 'bg-[#181B2C] text-[#A9ADC6] hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'All Invoices' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Data Table */}
          <div className="rounded-xl border border-[#262A40] bg-[#11131F] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#262A40] bg-[#0E0F17] text-[#A9ADC6]">
                    <th className="py-3 px-4 font-semibold">Invoice #</th>
                    <th className="py-3 px-4 font-semibold">Client</th>
                    <th className="py-3 px-4 font-semibold">Issue Date</th>
                    <th className="py-3 px-4 font-semibold">Due Date</th>
                    <th className="py-3 px-4 font-semibold">Services / Items</th>
                    <th className="py-3 px-4 font-semibold text-right">Total</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262A40]/50">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#A9ADC6] italic">
                        No invoices match your search or filters. Click "+ Generate Invoice" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const client = clients.find((c) => c.id === inv.clientId);
                      return (
                        <tr key={inv.id} className="hover:bg-[#181B2C]/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#22D3EE]">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <button
                              onClick={() => client && onSelectClient(client.id)}
                              className="hover:text-[#22D3EE] text-left transition-colors cursor-pointer"
                            >
                              <div>{client?.businessName || 'Client'}</div>
                              {client?.contactName && (
                                <div className="text-[11px] text-[#A9ADC6] font-normal">
                                  {client.contactName}
                                </div>
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[#A9ADC6]">
                            {formatDate(inv.issueDate)}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className={inv.status === 'Overdue' ? 'text-[#FF5A5F] font-bold' : 'text-[#A9ADC6]'}>
                              {formatDate(inv.dueDate)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-white max-w-[220px]">
                            <span className="truncate block">
                              {inv.lineItems[0]?.description || 'Digital Marketing Retainer'}
                              {inv.lineItems.length > 1 && (
                                <span className="text-[10px] text-[#22D3EE] ml-1 font-mono">
                                  (+{inv.lineItems.length - 1} more)
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                                inv.status === 'Paid'
                                  ? 'bg-[#7CFF6B]/15 text-[#7CFF6B] border border-[#7CFF6B]/30'
                                  : inv.status === 'Overdue'
                                  ? 'bg-[#FF5A5F]/15 text-[#FF5A5F] border border-[#FF5A5F]/30'
                                  : inv.status === 'Sent'
                                  ? 'bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30'
                                  : 'bg-[#A9ADC6]/15 text-[#A9ADC6] border border-[#A9ADC6]/30'
                              }`}
                            >
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {client && (
                                <button
                                  onClick={() => downloadInvoicePdf(inv, client, settings)}
                                  className="px-2.5 py-1 rounded bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/30 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                                  title="Download Branded PDF"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>PDF</span>
                                </button>
                              )}
                              {onEditInvoice && (
                                <button
                                  onClick={() => onEditInvoice(inv)}
                                  className="p-1.5 rounded text-[#A9ADC6] hover:text-white hover:bg-[#181B2C]"
                                  title="Edit Invoice"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteInvoice && (
                                <button
                                  onClick={() => onDeleteInvoice(inv.id)}
                                  className="p-1.5 rounded text-[#A9ADC6] hover:text-[#FF5A5F] hover:bg-[#181B2C]"
                                  title="Delete Invoice"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MONTHLY RECURRING LEDGER SUB-TAB */}
      {/* ========================================================= */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="p-4 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg bg-[#181B2C] hover:bg-[#262A40] text-[#A9ADC6] hover:text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="font-mono font-bold text-white text-base px-3 py-1 rounded-lg bg-[#07080F] border border-[#262A40]">
                {monthName}
              </div>
              <button
                onClick={() => setSelectedMonthOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg bg-[#181B2C] hover:bg-[#262A40] text-[#A9ADC6] hover:text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {selectedMonthOffset !== 0 && (
                <button
                  onClick={() => setSelectedMonthOffset(0)}
                  className="text-xs text-[#22D3EE] font-mono hover:underline ml-2"
                >
                  Reset to Current
                </button>
              )}
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-[#07080F] p-1 rounded-xl border border-[#262A40]">
              {(['all', 'Paid', 'Pending', 'Overdue'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLedgerStatusFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    ledgerStatusFilter === filter
                      ? 'bg-[#3D5AFE] text-white shadow-sm'
                      : 'text-[#A9ADC6] hover:text-white'
                  }`}
                >
                  {filter === 'all' ? 'All Retainers' : filter}
                </button>
              ))}
            </div>
          </div>

          {/* Month Financial KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
              <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
                <span>Expected Monthly Billed</span>
                <Clock className="w-4 h-4 text-[#3D5AFE]" />
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-white">
                {formatCurrency(totalExpectedLedger)}
              </div>
              <span className="text-[11px] text-[#A9ADC6] font-mono mt-0.5 block">
                {ledgerItems.length} active recurring contracts
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
              <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
                <span>Collected This Month</span>
                <CheckCircle2 className="w-4 h-4 text-[#7CFF6B]" />
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-[#7CFF6B]">
                {formatCurrency(totalCollectedLedger)}
              </div>
              <span className="text-[11px] text-[#7CFF6B] font-mono mt-0.5 block">
                {totalExpectedLedger > 0
                  ? `${Math.round((totalCollectedLedger / totalExpectedLedger) * 100)}% reconciled`
                  : '0%'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
              <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
                <span>Overdue Retainers</span>
                <AlertCircle className="w-4 h-4 text-[#FF5A5F]" />
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold text-[#FF5A5F]">
                {formatCurrency(totalOverdueLedger)}
              </div>
              <span className="text-[11px] text-[#FF5A5F] font-mono mt-0.5 block">
                {ledgerItems.filter((i) => i.status === 'Overdue').length} clients pending follow-up
              </span>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-2xl border border-[#262A40] bg-[#11131F] overflow-hidden">
            <div className="p-4 border-b border-[#262A40] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Retainer Reconciliation Ledger</h3>
                <p className="text-xs text-[#A9ADC6]">
                  Showing recurring care plans & monthly retainers scheduled for {monthName}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#262A40] bg-[#0E0F17] text-[#A9ADC6]">
                    <th className="py-3 px-4 font-semibold">Client Name</th>
                    <th className="py-3 px-4 font-semibold">Service Retainer</th>
                    <th className="py-3 px-4 font-semibold">Billing Day</th>
                    <th className="py-3 px-4 font-semibold text-right">Rate</th>
                    <th className="py-3 px-4 font-semibold">Matched Payment</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262A40]/50">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#A9ADC6] italic">
                        No recurring items found for this filter in {monthName}.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map(({ service, client, expectedDueDate, amount, matchingPayment, status }) => (
                      <tr
                        key={service.id}
                        className={`hover:bg-[#181B2C]/50 transition-colors ${
                          status === 'Overdue' ? 'bg-[#FF5A5F]/5' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <span
                            onClick={() => client && onSelectClient(client.id)}
                            className="hover:text-[#22D3EE] cursor-pointer"
                          >
                            {client?.businessName || 'Client'}
                          </span>
                          <span className="text-[11px] text-[#A9ADC6] block font-normal">
                            {client?.contactName || 'No contact'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-white">{service.customName}</span>
                          <span className="text-[11px] text-[#A9ADC6] block font-mono">
                            Day {service.billingDayOfMonth} of month
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#A9ADC6]">
                          {formatDate(expectedDueDate)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                          {formatCurrency(amount)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {matchingPayment ? (
                            <div className="text-[#7CFF6B]">
                              <span>{matchingPayment.invoiceNumber}</span>
                              <span className="block text-[10px] text-[#A9ADC6]">
                                Paid {formatDate(matchingPayment.date)} via {matchingPayment.method}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#A9ADC6]/50">No invoice matched</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {status !== 'Paid' ? (
                            <button
                              onClick={() => onQuickMarkPaid(service, monthKey)}
                              className="px-3 py-1 rounded-lg bg-[#7CFF6B]/15 hover:bg-[#7CFF6B]/25 text-[#7CFF6B] border border-[#7CFF6B]/30 font-mono text-[11px] font-semibold transition-all shadow-sm"
                            >
                              Mark as Paid
                            </button>
                          ) : (
                            <span className="text-[#7CFF6B] font-mono text-xs flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
