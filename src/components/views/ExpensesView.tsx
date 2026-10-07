import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  ExternalLink,
  Edit2,
  Trash2,
  CreditCard,
  Building2,
  Receipt,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Expense, ExpenseCategory, ExpenseRecurring, Client, Payment } from '../../types';
import { formatCurrency, formatDate, calculateStripeFee } from '../../lib/calculations';

interface ExpensesViewProps {
  expenses: Expense[];
  clients: Client[];
  payments: Payment[];
  onOpenNewExpense: (clientId?: string) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onSelectClient: (clientId: string) => void;
}

const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; border: string }> = {
  'Software/Tools': { bg: 'bg-[#22D3EE]/10', text: 'text-[#22D3EE]', border: 'border-[#22D3EE]/30' },
  Hosting: { bg: 'bg-[#3D5AFE]/10', text: 'text-[#3D5AFE]', border: 'border-[#3D5AFE]/30' },
  Subcontractor: { bg: 'bg-[#F5A524]/10', text: 'text-[#F5A524]', border: 'border-[#F5A524]/30' },
  'Ads for Dynasty Digital': { bg: 'bg-[#FF5A5F]/10', text: 'text-[#FF5A5F]', border: 'border-[#FF5A5F]/30' },
  Equipment: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  Insurance: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Fees: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  Other: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

export function ExpensesView({
  expenses,
  clients,
  payments,
  onOpenNewExpense,
  onEditExpense,
  onDeleteExpense,
  onSelectClient,
}: ExpensesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [recurringFilter, setRecurringFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'vendor'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Metrics calculations
  const metrics = useMemo(() => {
    let monthlyFixed = 0;
    let loggedThisMonth = 0;
    let clientLinkedMonthly = 0;

    for (const e of expenses) {
      const amt = Number(e.amount) || 0;
      if (e.recurring === 'monthly') {
        monthlyFixed += amt;
        loggedThisMonth += amt;
        if (e.clientId) clientLinkedMonthly += amt;
      } else if (e.recurring === 'yearly') {
        monthlyFixed += amt / 12;
        loggedThisMonth += amt / 12;
        if (e.clientId) clientLinkedMonthly += amt / 12;
      } else if (e.recurring === 'one-time') {
        if (e.date && e.date.startsWith(currentMonthKey)) {
          loggedThisMonth += amt;
          if (e.clientId) clientLinkedMonthly += amt;
        }
      }
    }

    // Stripe fees this month
    const cardPaymentsThisMonth = payments.filter((p) => {
      return (
        p.status === 'Paid' &&
        p.method === 'Card/Stripe' &&
        p.date &&
        p.date.startsWith(currentMonthKey)
      );
    });

    const stripeFeesThisMonth = cardPaymentsThisMonth.reduce(
      (sum, p) => sum + calculateStripeFee(p),
      0
    );

    return {
      monthlyFixed,
      loggedThisMonth,
      clientLinkedMonthly,
      stripeFeesThisMonth,
      cardPaymentsCount: cardPaymentsThisMonth.length,
    };
  }, [expenses, payments, currentMonthKey]);

  // Filtered & sorted expenses list
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchVendor = e.vendor.toLowerCase().includes(q);
          const matchNotes = (e.notes || '').toLowerCase().includes(q);
          const client = clients.find((c) => c.id === e.clientId);
          const matchClient = (client?.businessName || '').toLowerCase().includes(q);
          if (!matchVendor && !matchNotes && !matchClient) return false;
        }

        // Category filter
        if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

        // Recurring filter
        if (recurringFilter !== 'all' && e.recurring !== recurringFilter) return false;

        // Client filter
        if (clientFilter === 'overhead') {
          if (e.clientId) return false;
        } else if (clientFilter === 'client_tied') {
          if (!e.clientId) return false;
        } else if (clientFilter !== 'all') {
          if (e.clientId !== clientFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortBy === 'amount') cmp = a.amount - b.amount;
        else if (sortBy === 'vendor') cmp = a.vendor.localeCompare(b.vendor);
        return sortOrder === 'desc' ? -cmp : cmp;
      });
  }, [expenses, clients, searchQuery, categoryFilter, recurringFilter, clientFilter, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Monthly Fixed Costs */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Monthly Fixed Costs</span>
            <Wallet className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <div className="font-mono text-2xl font-bold text-white tracking-tight">
            {formatCurrency(metrics.monthlyFixed)}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-1">
            Software, hosting & overhead
          </div>
        </div>

        {/* Operating Outflow This Month */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Expenses This Month</span>
            <TrendingDown className="w-4 h-4 text-[#FF5A5F]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#FF5A5F] tracking-tight">
            {formatCurrency(metrics.loggedThisMonth)}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-1">
            Includes monthly + one-off
          </div>
        </div>

        {/* Client-Tied Costs */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Client Pass-Through</span>
            <Building2 className="w-4 h-4 text-[#F5A524]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#F5A524] tracking-tight">
            {formatCurrency(metrics.clientLinkedMonthly)}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-1">
            Tied directly to accounts
          </div>
        </div>

        {/* Stripe Processing Fee Estimate */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Stripe Fees (2.9%+$0.30)</span>
            <CreditCard className="w-4 h-4 text-[#7CFF6B]" />
          </div>
          <div className="font-mono text-2xl font-bold text-[#A9ADC6] tracking-tight">
            {formatCurrency(metrics.stripeFeesThisMonth)}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-1">
            {metrics.cardPaymentsCount} card charges in period
          </div>
        </div>
      </div>

      {/* Main Container: Controls & List */}
      <div className="rounded-2xl bg-[#11131F] border border-[#262A40] overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-[#262A40] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#A9ADC6]" />
              <input
                type="text"
                placeholder="Search vendor, notes, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-[#07080F] border border-[#262A40] rounded-xl text-xs sm:text-sm text-white placeholder-[#5A5F7D] focus:outline-none focus:border-[#22D3EE] transition-colors"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#07080F] border border-[#262A40] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#22D3EE] transition-colors"
            >
              <option value="all">All Categories</option>
              <option value="Software/Tools">Software/Tools</option>
              <option value="Hosting">Hosting</option>
              <option value="Subcontractor">Subcontractor</option>
              <option value="Ads for Dynasty Digital">Ads for Dynasty Digital</option>
              <option value="Equipment">Equipment</option>
              <option value="Insurance">Insurance</option>
              <option value="Fees">Fees</option>
              <option value="Other">Other</option>
            </select>

            {/* Recurring Filter */}
            <select
              value={recurringFilter}
              onChange={(e) => setRecurringFilter(e.target.value)}
              className="px-3 py-2 bg-[#07080F] border border-[#262A40] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#22D3EE] transition-colors"
            >
              <option value="all">All Terms</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one-time">One-time</option>
            </select>

            {/* Client Allocation Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="hidden sm:block px-3 py-2 bg-[#07080F] border border-[#262A40] rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#22D3EE] transition-colors"
            >
              <option value="all">All Allocations</option>
              <option value="overhead">Agency Overhead Only</option>
              <option value="client_tied">Client-Tied Costs Only</option>
            </select>
          </div>

          {/* Action & Sort */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={() => {
                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-xs font-mono text-[#A9ADC6] hover:text-white transition-colors"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortOrder.toUpperCase()}</span>
            </button>

            <button
              onClick={() => onOpenNewExpense()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324ad4] text-xs sm:text-sm font-semibold text-white shadow-lg shadow-[#3D5AFE]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262A40] bg-[#07080F]/40 text-[#A9ADC6] font-mono uppercase tracking-wider text-[11px]">
                <th
                  onClick={() => {
                    setSortBy('date');
                    setSortOrder(sortBy === 'date' && sortOrder === 'desc' ? 'asc' : 'desc');
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  Date
                </th>
                <th
                  onClick={() => {
                    setSortBy('vendor');
                    setSortOrder(sortBy === 'vendor' && sortOrder === 'desc' ? 'asc' : 'desc');
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-white"
                >
                  Vendor & Notes
                </th>
                <th className="py-3 px-4">Category</th>
                <th
                  onClick={() => {
                    setSortBy('amount');
                    setSortOrder(sortBy === 'amount' && sortOrder === 'desc' ? 'asc' : 'desc');
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-white text-right"
                >
                  Amount
                </th>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-4">Tied Client</th>
                <th className="py-3 px-4 text-center">Receipt</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262A40]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#A9ADC6] italic">
                    No operating expenses found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const catStyle = CATEGORY_COLORS[exp.category] || {
                    bg: 'bg-gray-500/10',
                    text: 'text-gray-400',
                    border: 'border-gray-500/20',
                  };
                  const client = exp.clientId ? clients.find((c) => c.id === exp.clientId) : null;

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-[#181B2C]/50 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-white whitespace-nowrap">
                        {formatDate(exp.date)}
                      </td>

                      {/* Vendor & Notes */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white group-hover:text-[#22D3EE] transition-colors">
                          {exp.vendor}
                        </div>
                        {exp.notes && (
                          <div className="text-[11px] text-[#A9ADC6] line-clamp-1 mt-0.5">
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {exp.category}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>

                      {/* Cycle */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider ${
                            exp.recurring === 'monthly'
                              ? 'bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20'
                              : exp.recurring === 'yearly'
                              ? 'bg-[#7CFF6B]/10 text-[#7CFF6B] border border-[#7CFF6B]/20'
                              : 'bg-white/5 text-[#A9ADC6] border border-white/10'
                          }`}
                        >
                          {exp.recurring}
                        </span>
                      </td>

                      {/* Tied Client */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {client ? (
                          <button
                            onClick={() => onSelectClient(client.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#07080F] border border-[#262A40] hover:border-[#22D3EE] text-[#22D3EE] font-medium transition-colors"
                          >
                            <Building2 className="w-3 h-3" />
                            <span>{client.businessName}</span>
                          </button>
                        ) : (
                          <span className="text-[#A9ADC6] text-[11px] font-mono">Overhead</span>
                        )}
                      </td>

                      {/* Receipt Link */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {exp.receiptLink ? (
                          <a
                            href={exp.receiptLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1.5 rounded-lg bg-[#07080F] hover:bg-[#181B2C] border border-[#262A40] text-[#22D3EE] transition-colors"
                            title="Open receipt or invoice"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-[#5A5F7D]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onEditExpense(exp)}
                            className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
                            title="Edit expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteExpense(exp.id)}
                            className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-[#FF5A5F] hover:bg-[#FF5A5F]/10 transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
  );
}
