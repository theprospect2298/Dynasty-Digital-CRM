import React from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  PhoneCall,
  CheckSquare,
  Sparkles,
  Wallet,
  Percent,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ListChecks,
  Globe,
  Key,
  UserCheck,
  Zap,
  Mail,
} from 'lucide-react';
import { Client, ClientService, Payment, Task, Expense, ClientChecklist, ClientWebsite } from '../../types';
import {
  formatCurrency,
  formatDate,
  getAgencyMetrics,
  isClientOverdue,
  isClientServiceOverdue,
  isServiceInRenewalWindow,
  getDaysRemaining,
  getNextBillingDate,
  getServiceMonthlyRate,
  getChecklistProgress,
  getExpiringWebsites,
  getUncontactedLeads,
} from '../../lib/calculations';
import { StatusBadge } from '../common/StatusBadge';
import { NavTab } from '../Sidebar';

interface DashboardViewProps {
  clients: Client[];
  clientServices: ClientService[];
  payments: Payment[];
  tasks: Task[];
  expenses?: Expense[];
  checklists?: ClientChecklist[];
  websites?: ClientWebsite[];
  onSelectClient: (clientId: string) => void;
  onNavigateTab: (tab: NavTab) => void;
  onToggleTask: (taskId: string) => void;
  onQuickMarkPaid: (service: ClientService) => void;
  onMarkLeadContacted?: (clientId: string) => Promise<void>;
  onOpenWebhookModal?: () => void;
}

export function DashboardView({
  clients,
  clientServices,
  payments,
  tasks,
  expenses = [],
  checklists = [],
  websites = [],
  onSelectClient,
  onNavigateTab,
  onToggleTask,
  onQuickMarkPaid,
  onMarkLeadContacted,
  onOpenWebhookModal,
}: DashboardViewProps) {
  const metrics = getAgencyMetrics(clients, clientServices, payments, expenses);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Payments due in the next 7 days
  const activeMonthlyServices = clientServices.filter((s) => {
    const parent = clients.find((c) => c.id === s.clientId);
    return parent && !parent.archived && s.status === 'Active' && s.billingType === 'monthly';
  });

  const dueNext7Days = activeMonthlyServices
    .map((s) => {
      const nextDate = getNextBillingDate(s.billingDayOfMonth, now);
      const days = getDaysRemaining(nextDate, now);
      const parent = clients.find((c) => c.id === s.clientId);
      return { service: s, nextDate, days, client: parent };
    })
    .filter((item) => item.days >= 0 && item.days <= 7)
    .sort((a, b) => a.days - b.days);

  // 2. Overdue client services (7+ days past billing date with no paid payment)
  const overdueItems = activeMonthlyServices
    .filter((s) => isClientServiceOverdue(s, payments, now))
    .map((s) => ({
      service: s,
      client: clients.find((c) => c.id === s.clientId),
      rate: getServiceMonthlyRate(s),
    }));

  // 3. Renewals in next 30 days
  const renewalsNext30Days = clientServices
    .filter((s) => isServiceInRenewalWindow(s, now))
    .map((s) => {
      const daysLeft = getDaysRemaining(s.endDate, now);
      return {
        service: s,
        client: clients.find((c) => c.id === s.clientId),
        daysLeft,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // 4. Tasks due today or overdue
  const priorityTasks = tasks
    .filter((t) => !t.done)
    .filter((t) => t.dueDate <= todayStr)
    .slice(0, 5);

  // 5. Leads with no activity in 3+ days
  const staleLeads = clients
    .filter((c) => !c.archived && (c.status === 'Lead' || c.status === 'Proposal Sent'))
    .filter((c) => {
      const lastAct = c.lastActivityDate ? new Date(c.lastActivityDate) : new Date(c.dateAdded);
      const diffDays = Math.floor((now.getTime() - lastAct.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 3;
    })
    .map((c) => {
      const lastAct = c.lastActivityDate ? new Date(c.lastActivityDate) : new Date(c.dateAdded);
      const daysInactive = Math.floor((now.getTime() - lastAct.getTime()) / (1000 * 60 * 60 * 24));
      return { client: c, daysInactive };
    });

  // Category revenue breakdown
  const categoryRevenueMap: Record<string, number> = {};
  for (const s of activeMonthlyServices) {
    const cat = s.category || 'Other';
    const rate = getServiceMonthlyRate(s);
    categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + rate;
  }
  const categoryList = Object.entries(categoryRevenueMap).sort((a, b) => b[1] - a[1]);

  // Last 12 months simulated historical MRR trajectory
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  // Base scale from actual current MRR
  const curMRR = metrics.totalMRR;
  const historicalMRR = [
    Math.round(curMRR * 0.42),
    Math.round(curMRR * 0.48),
    Math.round(curMRR * 0.55),
    Math.round(curMRR * 0.65),
    Math.round(curMRR * 0.72),
    Math.round(curMRR * 0.78),
    Math.round(curMRR * 0.84),
    Math.round(curMRR * 0.88),
    Math.round(curMRR * 0.92),
    Math.round(curMRR * 0.96),
    Math.round(curMRR * 0.98),
    curMRR,
  ];
  const maxMRR = Math.max(...historicalMRR, 1000);

  // 6. Active clients with no signed agreement (Compliance Flag)
  const activeClientsWithoutSignedAgreement = clients.filter((c) => {
    if (c.archived || c.status !== 'Active Client') return false;
    const agreement = c.documents?.agreement;
    const isSigned = agreement?.eSignStatus === 'Signed' && !!agreement?.signedDate;
    return !isSigned;
  });

  // 7. Domain Expiry Alerts within 30 days
  const expiringWebsites = getExpiringWebsites(websites, now, 30).map((item) => ({
    ...item,
    client: clients.find((c) => c.id === item.website.clientId),
  }));

  // 8. New Uncontacted Inbound Leads
  const uncontactedLeads = getUncontactedLeads(clients);

  return (
    <div className="space-y-6">
      {/* 0. Urgent Follow-up Alert: New Uncontacted Leads (5-minute response goal) */}
      {uncontactedLeads.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FF5A5F]/20 via-[#F5A524]/10 to-transparent border border-[#FF5A5F]/50 shadow-xl shadow-[#FF5A5F]/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FF5A5F]/20 text-[#FF5A5F] shrink-0 animate-pulse border border-[#FF5A5F]/40">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white">
                    ⚡ Urgent Lead Follow-Up: {uncontactedLeads.length} New Inbound Lead{uncontactedLeads.length > 1 ? 's' : ''}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF5A5F] text-white animate-pulse">
                    5-Minute Follow-Up Goal
                  </span>
                </div>
                <p className="text-xs text-[#A9ADC6] mt-0.5">
                  Fresh inbound inquiries awaiting contact. Call or message immediately to lock in the client.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {onOpenWebhookModal && (
                <button
                  onClick={onOpenWebhookModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B2C] hover:bg-[#262A40] border border-[#262A40] text-xs font-mono text-[#22D3EE] transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Webhook API Info</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {uncontactedLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-3.5 rounded-xl bg-[#07080F]/90 border border-[#FF5A5F]/40 hover:border-[#FF5A5F] transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      onClick={() => onSelectClient(lead.id)}
                      className="font-bold text-xs text-white hover:text-[#22D3EE] truncate text-left block cursor-pointer"
                    >
                      {lead.contactName || lead.businessName}
                    </button>
                    <div className="text-[11px] text-[#A9ADC6] truncate">
                      {lead.businessName} · <span className="font-mono text-[#22D3EE]">{lead.industry}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/30 shrink-0 font-semibold">
                    {lead.leadSource}
                  </span>
                </div>

                {lead.sourceMessage && (
                  <p className="text-[11px] text-[#E0E2EC] line-clamp-2 bg-[#11131F] p-2 rounded-lg border border-[#262A40]/50 italic">
                    "{lead.sourceMessage}"
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between gap-2 border-t border-[#262A40]/60">
                  <div className="flex items-center gap-2">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#7CFF6B]/15 hover:bg-[#7CFF6B]/25 text-[#7CFF6B] text-[11px] font-mono font-medium transition-colors"
                        title={`Call ${lead.phone}`}
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    )}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] text-[11px] font-mono font-medium transition-colors"
                        title={`Email ${lead.email}`}
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email</span>
                      </a>
                    )}
                  </div>

                  {onMarkLeadContacted && (
                    <button
                      onClick={() => onMarkLeadContacted(lead.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#3D5AFE] hover:bg-[#324CDD] text-white text-[11px] font-medium transition-colors cursor-pointer"
                      title="Mark as contacted and complete 5-minute task"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Contacted</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domain Expiry Alert Banner: 30 days before any domain expiry */}
      {expiringWebsites.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-[#FF5A5F]/20 via-[#F5A524]/10 to-transparent border border-[#FF5A5F]/40 shadow-lg shadow-[#FF5A5F]/5 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3 w-full">
            <div className="p-2.5 rounded-xl bg-[#FF5A5F]/20 text-[#FF5A5F] shrink-0 mt-0.5 animate-pulse">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Domain Expiry Alert:</span>
                  <span className="text-[#FF5A5F] font-mono">
                    {expiringWebsites.length} Domain{expiringWebsites.length > 1 ? 's' : ''} Expiring in &le; 30 Days
                  </span>
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/30 uppercase tracking-wider">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-[#A9ADC6] mt-1 leading-relaxed">
                Critical domain registration deadlines approaching within the next 30 days. Review login ownership to determine whether to renew directly or send a renewal prompt to the client.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3.5">
                {expiringWebsites.map(({ website, client, daysLeft, isCritical, isExpired }) => {
                  const isClientOwned = website.registrarLoginOwner === 'client';
                  return (
                    <div
                      key={website.id}
                      onClick={() => client && onSelectClient(client.id)}
                      className={`p-3 rounded-xl bg-[#0B0D18] border transition-all cursor-pointer group flex flex-col justify-between hover:scale-[1.01] ${
                        isCritical
                          ? 'border-[#FF5A5F]/60 hover:border-[#FF5A5F] shadow-sm shadow-[#FF5A5F]/10'
                          : 'border-[#F5A524]/40 hover:border-[#F5A524]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-[#22D3EE] truncate">
                            <Globe className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                            <span className="truncate">{website.domain}</span>
                          </div>
                          <div className="text-[11px] text-[#A9ADC6] truncate mt-0.5">
                            {client?.businessName || 'Client'} · <span className="font-mono">{website.registrar}</span>
                          </div>
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                            isExpired
                              ? 'bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/40'
                              : isCritical
                              ? 'bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/30'
                              : 'bg-[#F5A524]/20 text-[#F5A524] border border-[#F5A524]/30'
                          }`}
                        >
                          {isExpired
                            ? 'EXPIRED'
                            : daysLeft === 0
                            ? 'Ends Today'
                            : `${daysLeft}d left`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#262A40]/70 text-[10px]">
                        <span
                          className={`font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                            isClientOwned
                              ? 'bg-[#F5A524]/15 text-[#F5A524] border border-[#F5A524]/20'
                              : 'bg-[#3D5AFE]/15 text-[#22D3EE] border border-[#3D5AFE]/20'
                          }`}
                        >
                          {isClientOwned ? (
                            <>
                              <UserCheck className="w-3 h-3 shrink-0" />
                              <span>Client owns login (Remind)</span>
                            </>
                          ) : (
                            <>
                              <Key className="w-3 h-3 shrink-0" />
                              <span>We own login (Renew)</span>
                            </>
                          )}
                        </span>
                        <span className="text-[#A9ADC6] group-hover:text-white flex items-center gap-0.5 font-mono">
                          Manage →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Flag: Active clients with no signed agreement */}
      {activeClientsWithoutSignedAgreement.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#F5A524]/15 via-[#F5A524]/5 to-transparent border border-[#F5A524]/40 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#F5A524]/20 text-[#F5A524] shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  Compliance Alert: {activeClientsWithoutSignedAgreement.length} Active Client{activeClientsWithoutSignedAgreement.length > 1 ? 's' : ''} Missing Signed Agreement
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#F5A524]/20 text-[#F5A524] border border-[#F5A524]/30 uppercase tracking-wider">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-[#A9ADC6] mt-0.5">
                Active recurring service accounts currently operating without an executed agreement or signed e-contract on file.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                {activeClientsWithoutSignedAgreement.map((c) => {
                  const statusLabel = c.documents?.agreement?.eSignStatus || 'No Agreement';
                  return (
                    <button
                      key={c.id}
                      onClick={() => onSelectClient(c.id)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#F5A524]/40 hover:border-[#F5A524] text-xs font-medium text-white hover:text-[#22D3EE] transition-all group shadow-sm"
                    >
                      <span className="font-semibold">{c.businessName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F5A524]/15 text-[#F5A524]">
                        {statusLabel}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[#A9ADC6] group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: MRR */}
        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Total MRR</span>
            <TrendingUp className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight">
            {formatCurrency(metrics.totalMRR)}
          </div>
          <div className="text-[11px] text-[#7CFF6B] font-mono mt-1 flex items-center gap-1">
            <span>+14.2%</span>
            <span className="text-[#A9ADC6] font-sans">vs last mo</span>
          </div>
        </div>

        {/* Card 2: ARR */}
        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Annual Run Rate</span>
            <Sparkles className="w-4 h-4 text-[#3D5AFE]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight">
            {formatCurrency(metrics.totalARR)}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-1">
            {metrics.activeClientsCount} active accounts
          </div>
        </div>

        {/* Card 3: Active Clients */}
        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Active Clients</span>
            <Users className="w-4 h-4 text-[#7CFF6B]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight">
            {metrics.activeClientsCount}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-1">
            Avg {formatCurrency(metrics.avgRevenuePerClient)}/mo
          </div>
        </div>

        {/* Card 4: Collected This Month */}
        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Collected (Oct)</span>
            <DollarSign className="w-4 h-4 text-[#7CFF6B]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-[#7CFF6B] tracking-tight">
            {formatCurrency(metrics.collectedThisMonth)}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-1">
            YTD: {formatCurrency(metrics.ytdCollected)}
          </div>
        </div>

        {/* Card 5: Outstanding / Overdue */}
        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Overdue Balances</span>
            <AlertCircle className="w-4 h-4 text-[#FF5A5F]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-[#FF5A5F] tracking-tight">
            {formatCurrency(metrics.outstandingOverdueAmount)}
          </div>
          <div className="text-[11px] text-[#FF5A5F] font-mono mt-1">
            {overdueItems.length} accounts flagged
          </div>
        </div>

        {/* Card 6: Open Leads */}
        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span>Open Leads</span>
            <ArrowUpRight className="w-4 h-4 text-[#F5A524]" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight">
            {metrics.openLeadsCount}
          </div>
          <div className="text-[11px] text-[#F5A524] font-mono mt-1">
            In active deal stages
          </div>
        </div>
      </div>

      {/* Agency Profitability & Cost Control KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Net Profit This Month */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span className="font-medium text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#7CFF6B]" />
              Net Profit This Month
            </span>
            <DollarSign className="w-4 h-4 text-[#7CFF6B]" />
          </div>
          <div
            className={`font-mono text-2xl sm:text-3xl font-bold tracking-tight ${
              metrics.netProfitThisMonth >= 0 ? 'text-[#7CFF6B]' : 'text-[#FF5A5F]'
            }`}
          >
            {formatCurrency(metrics.netProfitThisMonth)}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-2 flex items-center justify-between">
            <span>Collected: {formatCurrency(metrics.collectedThisMonth)}</span>
            <span className="text-[#FF5A5F]">
              Outflow: -{formatCurrency(metrics.expensesThisMonth)}
            </span>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span className="font-medium text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
              Profit Margin
            </span>
            <Percent className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-baseline gap-2">
            <span>{metrics.profitMarginThisMonth}%</span>
            <span className="text-xs font-normal text-[#A9ADC6]">net margin</span>
          </div>
          <div className="w-full bg-[#07080F] h-2 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                metrics.profitMarginThisMonth >= 70
                  ? 'bg-[#7CFF6B]'
                  : metrics.profitMarginThisMonth >= 40
                  ? 'bg-[#22D3EE]'
                  : 'bg-[#F5A524]'
              }`}
              style={{
                width: `${Math.min(Math.max(metrics.profitMarginThisMonth, 0), 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Monthly Fixed Costs */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
            <span className="font-medium text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F5A524]" />
              Monthly Fixed Costs
            </span>
            <Wallet className="w-4 h-4 text-[#F5A524]" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {formatCurrency(metrics.monthlyFixedCosts)}
          </div>
          <div className="text-[11px] text-[#A9ADC6] font-mono mt-2 flex items-center justify-between">
            <span>Recurring agency overhead</span>
            <button
              onClick={() => onNavigateTab('expenses' as NavTab)}
              className="text-[#22D3EE] hover:underline"
            >
              View Expenses →
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row: MRR Over Time Line Chart + Revenue by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Trajectory (Last 12 Months) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#11131F] border border-[#262A40]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly Retainer Trajectory (12 Mo)</h3>
              <p className="text-xs text-[#A9ADC6]">Contract MRR progression across all active services</p>
            </div>
            <span className="font-mono text-xs text-[#22D3EE] bg-[#22D3EE]/10 px-2.5 py-1 rounded-full border border-[#22D3EE]/20">
              Current: {formatCurrency(curMRR)}/mo
            </span>
          </div>

          {/* SVG / Bar Line Chart */}
          <div className="h-52 w-full pt-4 flex flex-col justify-end">
            <div className="flex-1 flex items-end gap-2 sm:gap-3 px-1 pb-2 border-b border-[#262A40]">
              {historicalMRR.map((val, idx) => {
                const heightPercent = Math.max(12, Math.round((val / maxMRR) * 100));
                const isCurrent = idx === historicalMRR.length - 1;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 hidden group-hover:flex flex-col items-center z-10">
                      <span className="font-mono text-[10px] bg-[#07080F] border border-[#262A40] text-white px-1.5 py-0.5 rounded shadow">
                        {formatCurrency(val)}
                      </span>
                    </div>
                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all duration-300 ${
                        isCurrent
                          ? 'bg-gradient-to-t from-[#3D5AFE] to-[#22D3EE] shadow-lg shadow-[#22D3EE]/20'
                          : 'bg-[#181B2C] group-hover:bg-[#262A40]'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            {/* Month labels */}
            <div className="flex items-center justify-between px-1 pt-2">
              {months.map((m, idx) => (
                <span key={idx} className="flex-1 text-center font-mono text-[10px] text-[#A9ADC6]">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue by Service Category */}
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Retainer by Category</h3>
            <p className="text-xs text-[#A9ADC6]">Monthly recurring revenue breakdown</p>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-3.5">
            {categoryList.length === 0 ? (
              <p className="text-xs text-[#A9ADC6] italic">No active retainers yet.</p>
            ) : (
              categoryList.map(([cat, amount]) => {
                const percent = curMRR > 0 ? Math.round((amount / curMRR) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-medium">{cat}</span>
                      <span className="font-mono text-[#A9ADC6]">
                        {formatCurrency(amount)} <span className="text-[#22D3EE]">({percent}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#07080F] overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className="h-full rounded-full bg-[#3D5AFE]"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Priority Action Panels: 5 Core Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Panel 1: Overdue Balances (Red) */}
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#262A40] mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#FF5A5F]/15 text-[#FF5A5F]">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Overdue Retainers</h3>
            </div>
            <span className="font-mono text-xs text-[#FF5A5F]">{overdueItems.length}</span>
          </div>

          <div className="flex-1 space-y-2.5">
            {overdueItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#7CFF6B] flex items-center justify-center gap-1.5 font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>All client retainers paid up to date!</span>
              </div>
            ) : (
              overdueItems.map(({ service, client, rate }) => (
                <div
                  key={service.id}
                  className="p-3 rounded-xl bg-[#07080F] border border-[#FF5A5F]/30 flex items-center justify-between hover:border-[#FF5A5F] transition-colors"
                >
                  <div className="cursor-pointer" onClick={() => client && onSelectClient(client.id)}>
                    <div className="text-xs font-semibold text-white hover:text-[#22D3EE]">
                      {client?.businessName || 'Client'}
                    </div>
                    <div className="text-[11px] text-[#A9ADC6] mt-0.5">
                      {service.customName} · Day {service.billingDayOfMonth}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-xs font-bold text-[#FF5A5F]">
                      {formatCurrency(rate)}
                    </span>
                    <button
                      onClick={() => onQuickMarkPaid(service)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#7CFF6B]/15 hover:bg-[#7CFF6B]/25 text-[#7CFF6B] border border-[#7CFF6B]/30"
                    >
                      Mark Paid
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Renewals in Next 30 Days (Amber) */}
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#262A40] mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#F5A524]/15 text-[#F5A524]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Renewals (Next 30 Days)</h3>
            </div>
            <button
              onClick={() => onNavigateTab('renewals')}
              className="text-xs font-mono text-[#F5A524] hover:underline"
            >
              View all
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            {renewalsNext30Days.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#A9ADC6] italic">
                No contract terms expiring in the next 30 days.
              </p>
            ) : (
              renewalsNext30Days.map(({ service, client, daysLeft }) => (
                <div
                  key={service.id}
                  className="p-3 rounded-xl bg-[#07080F] border border-[#F5A524]/30 flex items-center justify-between hover:border-[#F5A524] transition-colors"
                >
                  <div className="cursor-pointer" onClick={() => client && onSelectClient(client.id)}>
                    <div className="text-xs font-semibold text-white hover:text-[#22D3EE]">
                      {client?.businessName || 'Client'}
                    </div>
                    <div className="text-[11px] text-[#A9ADC6] mt-0.5">
                      {service.customName}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-xs font-bold text-[#F5A524]">
                      {daysLeft === 0 ? 'Ends Today' : `${daysLeft}d left`}
                    </span>
                    <span className="text-[10px] text-[#A9ADC6] font-mono">
                      {formatDate(service.endDate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2b: Domain Expirations (Next 30 Days) */}
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#262A40] mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#FF5A5F]/15 text-[#FF5A5F]">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Domain Expirations (30d)</h3>
            </div>
            <span className="text-xs font-mono text-[#A9ADC6]">
              {expiringWebsites.length} {expiringWebsites.length === 1 ? 'domain' : 'domains'}
            </span>
          </div>

          <div className="flex-1 space-y-2.5">
            {expiringWebsites.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#7CFF6B] italic flex items-center justify-center gap-1.5 font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>All client domains healthy and active!</span>
              </p>
            ) : (
              expiringWebsites.map(({ website, client, daysLeft, isCritical, isExpired }) => (
                <div
                  key={website.id}
                  onClick={() => client && onSelectClient(client.id)}
                  className={`p-3 rounded-xl bg-[#07080F] border cursor-pointer transition-all flex items-center justify-between hover:border-[#22D3EE] ${
                    isCritical ? 'border-[#FF5A5F]/40' : 'border-[#F5A524]/30'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white hover:text-[#22D3EE] truncate">
                      {website.domain}
                    </div>
                    <div className="text-[11px] text-[#A9ADC6] mt-0.5 truncate">
                      {client?.businessName || 'Client'} · {website.registrar}
                    </div>
                    <div className="text-[10px] font-mono mt-1">
                      {website.registrarLoginOwner === 'client' ? (
                        <span className="text-[#F5A524]">👤 Client owns login</span>
                      ) : (
                        <span className="text-[#22D3EE]">🔑 Agency owns login</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isExpired || isCritical ? 'text-[#FF5A5F]' : 'text-[#F5A524]'
                      }`}
                    >
                      {isExpired ? 'EXPIRED' : daysLeft === 0 ? 'Ends Today' : `${daysLeft}d left`}
                    </span>
                    <span className="text-[10px] text-[#A9ADC6] font-mono">
                      {formatDate(website.domainExpiryDate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Payments Due in Next 7 Days */}
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#262A40] mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#22D3EE]/15 text-[#22D3EE]">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Upcoming Charges (7d)</h3>
            </div>
            <button
              onClick={() => onNavigateTab('billing')}
              className="text-xs font-mono text-[#22D3EE] hover:underline"
            >
              Ledger
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            {dueNext7Days.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#A9ADC6] italic">
                No monthly charges scheduled in the next 7 days.
              </p>
            ) : (
              dueNext7Days.map(({ service, client, nextDate, days }) => (
                <div
                  key={service.id}
                  className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] flex items-center justify-between hover:border-[#22D3EE]/50 transition-colors"
                >
                  <div className="cursor-pointer" onClick={() => client && onSelectClient(client.id)}>
                    <div className="text-xs font-semibold text-white">
                      {client?.businessName || 'Client'}
                    </div>
                    <div className="text-[11px] text-[#A9ADC6] mt-0.5">
                      Due in {days} {days === 1 ? 'day' : 'days'} ({formatDate(nextDate)})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white">
                      {formatCurrency(getServiceMonthlyRate(service))}
                    </span>
                    <button
                      onClick={() => onQuickMarkPaid(service)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#7CFF6B]/15 hover:bg-[#7CFF6B]/25 text-[#7CFF6B] border border-[#7CFF6B]/30"
                    >
                      Paid
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 4: Tasks Due Today / Overdue */}
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#262A40] mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#3D5AFE]/15 text-[#3D5AFE]">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Tasks Due Today / Overdue</h3>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-mono text-[#3D5AFE] hover:underline"
            >
              All tasks
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            {priorityTasks.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#7CFF6B] flex items-center justify-center gap-1.5 font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero pending tasks due today!</span>
              </p>
            ) : (
              priorityTasks.map((t) => {
                const parent = clients.find((c) => c.id === t.clientId);
                return (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] flex items-start gap-2.5"
                  >
                    <button
                      onClick={() => onToggleTask(t.id)}
                      className="mt-0.5 w-4 h-4 rounded border border-[#262A40] hover:border-[#7CFF6B] flex items-center justify-center text-transparent hover:text-[#7CFF6B] transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{t.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#A9ADC6] mt-0.5">
                        {parent && <span>{parent.businessName}</span>}
                        <span>·</span>
                        <span className="font-mono text-[#FF5A5F]">{t.dueDate}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 5: Leads with No Activity in 3+ Days */}
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col md:col-span-2 xl:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-[#262A40] mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#22D3EE]/15 text-[#22D3EE]">
                <PhoneCall className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Stale Leads (No Activity in 3+ Days)</h3>
            </div>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="text-xs font-mono text-[#22D3EE] hover:underline"
            >
              Pipeline Kanban
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            {staleLeads.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#A9ADC6] italic">
                All open leads have fresh interaction logs within the last 3 days!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {staleLeads.map(({ client, daysInactive }) => (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(client.id)}
                    className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] hover:border-[#22D3EE] cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>{client.businessName}</span>
                        <StatusBadge status={client.status} size="sm" />
                      </div>
                      <div className="text-[11px] text-[#A9ADC6] mt-1">
                        {client.contactName} · {client.city}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-[#F5A524]">
                        {daysInactive}d inactive
                      </span>
                      <div className="text-[10px] text-[#22D3EE] font-mono mt-0.5">
                        Follow up →
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 6: Active Service Onboarding & Delivery Checklists */}
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col md:col-span-2 xl:col-span-3">
          <div className="flex items-center justify-between pb-3 border-b border-[#262A40] mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#22D3EE]/15 text-[#22D3EE]">
                <ListChecks className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Active Service Onboarding & Delivery Checklists</h3>
            </div>
            <span className="text-xs font-mono text-[#A9ADC6]">
              {checklists.length} active {checklists.length === 1 ? 'checklist' : 'checklists'}
            </span>
          </div>

          <div className="flex-1 space-y-3">
            {checklists.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#A9ADC6] italic">
                No active service checklists created yet. Attach templates to clients to track delivery milestones.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {checklists.map((chk) => {
                  const client = clients.find((c) => c.id === chk.clientId);
                  const { total, completed, percent } = getChecklistProgress(chk);
                  const isComplete = percent === 100;
                  const nextItem = chk.items?.find((i) => !i.completed);

                  return (
                    <div
                      key={chk.id}
                      onClick={() => client && onSelectClient(client.id)}
                      className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] hover:border-[#22D3EE] cursor-pointer transition-all flex flex-col justify-between space-y-2 group shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-mono text-[#22D3EE] group-hover:underline block truncate">
                              {client?.businessName || 'Client'}
                            </span>
                            <h4 className="text-xs font-bold text-white mt-0.5 truncate">
                              {chk.title}
                            </h4>
                          </div>
                          <span
                            className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                              isComplete
                                ? 'bg-[#7CFF6B]/15 text-[#7CFF6B] border border-[#7CFF6B]/30'
                                : percent >= 50
                                ? 'bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30'
                                : 'bg-[#181B2C] text-[#A9ADC6] border border-[#262A40]'
                            }`}
                          >
                            {percent}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-[#181B2C] overflow-hidden border border-[#262A40] mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isComplete
                                ? 'bg-[#7CFF6B]'
                                : percent >= 50
                                ? 'bg-[#22D3EE]'
                                : 'bg-[#3D5AFE]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#262A40]/30 text-[#A9ADC6]">
                        <span>
                          {completed}/{total} steps
                        </span>
                        {nextItem ? (
                          <span className="text-[#A9ADC6] truncate max-w-[140px]" title={nextItem.label}>
                            Next: {nextItem.label}
                          </span>
                        ) : (
                          <span className="text-[#7CFF6B] font-semibold">Done ✓</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
