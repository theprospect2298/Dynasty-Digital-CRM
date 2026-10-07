import {
  Client,
  ClientService,
  Payment,
  Expense,
  ClientChecklist,
  ClientPerformanceEntry,
  ClientWebsite,
} from '../types';

/**
 * Format currency as standard $1,234.00
 */
export function formatCurrency(amount: number | undefined | null): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Estimate Stripe fee (2.9% + $0.30 on Card/Stripe payments)
 */
export function calculateStripeFee(payment: Payment): number {
  if (payment.method !== 'Card/Stripe' || payment.status !== 'Paid') return 0;
  const amt = Number(payment.amount) || 0;
  if (amt <= 0) return 0;
  return Math.round((amt * 0.029 + 0.3) * 100) / 100;
}

/**
 * Calculate client-linked monthly costs
 */
export function getClientMonthlyExpenses(expenses: Expense[], clientId: string): number {
  return expenses
    .filter((e) => e.clientId === clientId)
    .reduce((sum, e) => {
      const amt = Number(e.amount) || 0;
      if (e.recurring === 'monthly') return sum + amt;
      if (e.recurring === 'yearly') return sum + amt / 12;
      return sum;
    }, 0);
}

/**
 * Calculate per-client profit and margin %
 */
export function getClientProfitMetrics(
  client: Client,
  clientServices: ClientService[],
  expenses: Expense[]
) {
  const mrr = getClientMRR(clientServices, client.id);
  const monthlyCosts = getClientMonthlyExpenses(expenses, client.id);
  const monthlyProfit = mrr - monthlyCosts;
  const marginPercent = mrr > 0 ? Math.round(((mrr - monthlyCosts) / mrr) * 1000) / 10 : 0;

  return {
    mrr,
    monthlyCosts,
    monthlyProfit,
    marginPercent,
  };
}

/**
 * Format date string (YYYY-MM-DD or ISO) as 'MMM D, YYYY' (e.g. Oct 7, 2026)
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  // Parse manually or using Date to avoid timezone offset shifts for YYYY-MM-DD
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate net monthly rate for a client service after discount
 */
export function getServiceMonthlyRate(service: ClientService): number {
  if (service.billingType !== 'monthly') return 0;
  let price = Number(service.price) || 0;
  const discountVal = Number(service.discountValue) || 0;
  if (service.discountType === 'percent') {
    price = price * (1 - discountVal / 100);
  } else if (service.discountType === 'fixed') {
    price = Math.max(0, price - discountVal);
  }
  return Math.round(price * 100) / 100;
}

/**
 * Client MRR: sum of the client's Active monthly services after discounts
 */
export function getClientMRR(clientServices: ClientService[], clientId: string): number {
  return clientServices
    .filter((s) => s.clientId === clientId && s.status === 'Active' && s.billingType === 'monthly')
    .reduce((sum, s) => sum + getServiceMonthlyRate(s), 0);
}

/**
 * Lifetime value per client = sum of Paid payments
 */
export function getClientLifetimeValue(payments: Payment[], clientId: string): number {
  return payments
    .filter((p) => p.clientId === clientId && p.status === 'Paid')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/**
 * Contract value per service = setup + one-time price + (monthly price after discount * minimum term)
 */
export function getServiceContractValue(service: ClientService): number {
  const setup = Number(service.setupFee) || 0;
  if (service.billingType === 'one-time') {
    const discountVal = Number(service.discountValue) || 0;
    let base = Number(service.price) || 0;
    if (service.discountType === 'percent') {
      base = base * (1 - discountVal / 100);
    } else if (service.discountType === 'fixed') {
      base = Math.max(0, base - discountVal);
    }
    return setup + Math.max(0, base);
  } else {
    const monthlyRate = getServiceMonthlyRate(service);
    const term = Math.max(1, Number(service.minimumTermMonths) || 1);
    return setup + monthlyRate * term;
  }
}

/**
 * "Committed until" date per client = the latest end date of their active minimum terms
 */
export function getClientCommittedUntil(clientServices: ClientService[], clientId: string): string | null {
  const activeServices = clientServices.filter(
    (s) => s.clientId === clientId && (s.status === 'Active' || s.status === 'Pending') && s.endDate
  );
  if (activeServices.length === 0) return null;
  const sorted = [...activeServices].sort((a, b) => b.endDate.localeCompare(a.endDate));
  return sorted[0].endDate;
}

/**
 * Calculate difference in days between target date (YYYY-MM-DD) and reference date
 */
export function getDaysRemaining(endDateStr: string, refDate: Date = new Date()): number {
  if (!endDateStr) return 999;
  const parts = endDateStr.split('T')[0].split('-');
  if (parts.length !== 3) return 999;
  const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const now = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Renewal window check: services ending within 30 days
 */
export function isServiceInRenewalWindow(service: ClientService, refDate: Date = new Date()): boolean {
  if (service.status !== 'Active' || !service.endDate) return false;
  const days = getDaysRemaining(service.endDate, refDate);
  return days <= 30 && days >= 0;
}

/**
 * Compute the next billing date for a monthly service from billingDayOfMonth
 */
export function getNextBillingDate(billingDay: number, refDate: Date = new Date()): string {
  const day = Math.min(Math.max(1, billingDay || 1), 28); // Cap at 28 to safely cover all months
  const curYear = refDate.getFullYear();
  const curMonth = refDate.getMonth();
  const curDay = refDate.getDate();

  let targetDate: Date;
  if (curDay <= day) {
    targetDate = new Date(curYear, curMonth, day);
  } else {
    targetDate = new Date(curYear, curMonth + 1, day);
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Overdue logic:
 * A monthly service with no Paid payment for the current billing period 7+ days after its billing date -> flag client red.
 */
export function isClientServiceOverdue(
  service: ClientService,
  payments: Payment[],
  refDate: Date = new Date()
): boolean {
  if (service.status !== 'Active' || service.billingType !== 'monthly') {
    return false;
  }
  const day = Math.min(Math.max(1, service.billingDayOfMonth || 1), 28);
  const curDay = refDate.getDate();
  const curMonth = refDate.getMonth();
  const curYear = refDate.getFullYear();

  // If we haven't reached day + 7 in the current month, check previous month's billing date
  let lastBillingDate: Date;
  if (curDay >= day) {
    lastBillingDate = new Date(curYear, curMonth, day);
  } else {
    lastBillingDate = new Date(curYear, curMonth - 1, day);
  }

  const daysSinceBilling = Math.floor(
    (refDate.getTime() - lastBillingDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceBilling < 7) {
    return false;
  }

  // Look for any Paid payment in the 30-day window following that billing cycle
  const cycleStart = new Date(lastBillingDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2-day margin
  const cycleEnd = new Date(lastBillingDate.getTime() + 32 * 24 * 60 * 60 * 1000);

  const hasPaidPayment = payments.some((p) => {
    if (p.clientId !== service.clientId || p.status !== 'Paid') return false;
    const pDate = new Date(p.date);
    // If specific service ID attached or it is a monthly payment
    const serviceMatch = !p.clientServiceId || p.clientServiceId === service.id;
    return serviceMatch && pDate >= cycleStart && pDate <= cycleEnd;
  });

  return !hasPaidPayment;
}

export function isClientOverdue(
  client: Client,
  clientServices: ClientService[],
  payments: Payment[],
  refDate: Date = new Date()
): boolean {
  if (client.status !== 'Active Client') return false;
  const services = clientServices.filter((s) => s.clientId === client.id && s.status === 'Active');
  return services.some((s) => isClientServiceOverdue(s, payments, refDate));
}

/**
 * Calculate agency financial aggregates:
 * - Total MRR
 * - ARR (MRR * 12)
 * - Active Clients count
 * - Average revenue per client (MRR / active clients)
 * - One-time revenue this month
 * - Recurring revenue this month
 * - Total collected this month
 * - Year to date collected
 * - Outstanding / overdue amount
 */
export function getAgencyMetrics(
  clients: Client[],
  clientServices: ClientService[],
  payments: Payment[],
  expenses: Expense[] = [],
  refDate: Date = new Date()
) {
  const activeClients = clients.filter((c) => !c.archived && c.status === 'Active Client');
  const activeClientsCount = activeClients.length;

  // Total MRR from all active monthly services of active clients
  const activeServices = clientServices.filter((s) => {
    const parentClient = clients.find((c) => c.id === s.clientId);
    return parentClient && !parentClient.archived && s.status === 'Active' && s.billingType === 'monthly';
  });

  const totalMRR = activeServices.reduce((sum, s) => sum + getServiceMonthlyRate(s), 0);
  const totalARR = totalMRR * 12;
  const avgRevenuePerClient = activeClientsCount > 0 ? totalMRR / activeClientsCount : 0;

  // Payments collected this month
  const curYear = refDate.getFullYear();
  const curMonth = refDate.getMonth();
  const curMonthKey = `${curYear}-${String(curMonth + 1).padStart(2, '0')}`;

  const paidPayments = payments.filter((p) => p.status === 'Paid');

  let oneTimeThisMonth = 0;
  let recurringThisMonth = 0;
  let collectedThisMonth = 0;
  let ytdCollected = 0;
  let stripeFeesThisMonth = 0;

  for (const p of paidPayments) {
    const pDate = new Date(p.date);
    if (!isNaN(pDate.getTime())) {
      if (pDate.getFullYear() === curYear) {
        ytdCollected += Number(p.amount) || 0;
        if (pDate.getMonth() === curMonth) {
          collectedThisMonth += Number(p.amount) || 0;
          if (p.method === 'Card/Stripe') {
            stripeFeesThisMonth += calculateStripeFee(p);
          }
          if (p.type === 'Monthly') {
            recurringThisMonth += Number(p.amount) || 0;
          } else {
            oneTimeThisMonth += Number(p.amount) || 0;
          }
        }
      }
    }
  }

  // Monthly Expenses & Fixed Costs
  let monthlyFixedCosts = 0;
  let expensesThisMonth = 0;

  for (const e of expenses) {
    const amt = Number(e.amount) || 0;
    if (e.recurring === 'monthly') {
      monthlyFixedCosts += amt;
      expensesThisMonth += amt;
    } else if (e.recurring === 'yearly') {
      monthlyFixedCosts += amt / 12;
      expensesThisMonth += amt / 12;
    } else if (e.recurring === 'one-time') {
      // If one-time expense fell into this month
      if (e.date && e.date.startsWith(curMonthKey)) {
        expensesThisMonth += amt;
      }
    }
  }

  // Net Profit & Profit Margin
  const netProfitThisMonth = collectedThisMonth - expensesThisMonth;
  const profitMarginThisMonth =
    collectedThisMonth > 0 ? Math.round((netProfitThisMonth / collectedThisMonth) * 1000) / 10 : 0;

  // Outstanding / overdue amount
  let outstandingOverdueAmount = 0;
  for (const client of activeClients) {
    const clientServs = clientServices.filter((s) => s.clientId === client.id && s.status === 'Active');
    for (const s of clientServs) {
      if (isClientServiceOverdue(s, payments, refDate)) {
        outstandingOverdueAmount += getServiceMonthlyRate(s);
      }
    }
  }

  // Open leads count
  const openLeadsCount = clients.filter(
    (c) => !c.archived && (c.status === 'Lead' || c.status === 'Proposal Sent')
  ).length;

  return {
    totalMRR,
    totalARR,
    activeClientsCount,
    avgRevenuePerClient,
    oneTimeThisMonth,
    recurringThisMonth,
    collectedThisMonth,
    ytdCollected,
    monthlyFixedCosts,
    expensesThisMonth,
    netProfitThisMonth,
    profitMarginThisMonth,
    stripeFeesThisMonth,
    outstandingOverdueAmount,
    openLeadsCount,
  };
}

/**
 * Calculate progress of a single checklist
 */
export function getChecklistProgress(checklist: ClientChecklist): {
  total: number;
  completed: number;
  percent: number;
} {
  const total = checklist.items?.length || 0;
  if (total === 0) return { total: 0, completed: 0, percent: 0 };
  const completed = checklist.items.filter((i) => i.completed).length;
  const percent = Math.round((completed / total) * 100);
  return { total, completed, percent };
}

/**
 * Calculate aggregated progress across all checklists for a client
 */
export function getClientChecklistsProgress(
  checklists: ClientChecklist[],
  clientId: string
): {
  total: number;
  completed: number;
  percent: number;
  count: number;
} {
  const clientChecklists = (checklists || []).filter((c) => c.clientId === clientId);
  if (clientChecklists.length === 0) return { total: 0, completed: 0, percent: 0, count: 0 };

  let total = 0;
  let completed = 0;
  for (const chk of clientChecklists) {
    total += chk.items?.length || 0;
    completed += chk.items?.filter((i) => i.completed).length || 0;
  }

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percent, count: clientChecklists.length };
}

/**
  * Calculate Cost Per Lead (adSpend / leads)
  */
export function calculateCostPerLead(adSpend: number, leads: number): number {
  if (!leads || leads <= 0) return 0;
  const spend = Number(adSpend) || 0;
  return Math.round((spend / leads) * 100) / 100;
}

/**
  * Calculate ROAS (revenueFromAds / adSpend)
  */
export function calculateROAS(revenueFromAds: number, adSpend: number): number {
  if (!adSpend || adSpend <= 0) return 0;
  const rev = Number(revenueFromAds) || 0;
  return Math.round((rev / adSpend) * 100) / 100;
}

/**
  * Check if client has active or contracted Ads Management or Google Business Profile services
  */
export function hasAdsOrGbpServices(clientServices: ClientService[], clientId?: string): boolean {
  const targetServices = clientId
    ? clientServices.filter((s) => s.clientId === clientId)
    : clientServices;

  return targetServices.some((s) => {
    const cat = (s.category || '').toLowerCase();
    const name = (s.customName || '').toLowerCase();
    return (
      cat.includes('ads') ||
      cat.includes('google business') ||
      cat.includes('gbp') ||
      name.includes('ads') ||
      name.includes('meta ads') ||
      name.includes('google ads') ||
      name.includes('google business') ||
      name.includes('gbp') ||
      name.includes('lead gen') ||
      (typeof s.adSpendBudget === 'number' && s.adSpendBudget > 0)
    );
  });
}

/**
  * Format YYYY-MM to readable month string (e.g. "2026-10" -> "October 2026")
  */
export function formatMonthLabel(monthStr: string): string {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const date = new Date(year, month, 1);
  if (isNaN(date.getTime())) return monthStr;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
  * Aggregated performance summary across entries
  */
export function getPerformanceMetricsSummary(entries: ClientPerformanceEntry[]) {
  if (!entries || entries.length === 0) {
    return {
      totalAdSpend: 0,
      totalLeads: 0,
      avgCostPerLead: 0,
      totalBookedJobs: 0,
      totalRevenueFromAds: 0,
      overallROAS: 0,
      totalGbpCalls: 0,
      totalGbpDirections: 0,
      totalGbpClicks: 0,
      totalGbpActions: 0,
      count: 0,
    };
  }

  let totalAdSpend = 0;
  let totalLeads = 0;
  let totalBookedJobs = 0;
  let totalRevenueFromAds = 0;
  let totalGbpCalls = 0;
  let totalGbpDirections = 0;
  let totalGbpClicks = 0;

  for (const entry of entries) {
    totalAdSpend += Number(entry.adSpend) || 0;
    totalLeads += Number(entry.leads) || 0;
    totalBookedJobs += Number(entry.bookedJobs) || 0;
    totalRevenueFromAds += Number(entry.revenueFromAds) || 0;
    totalGbpCalls += Number(entry.gbpCalls) || 0;
    totalGbpDirections += Number(entry.gbpDirectionRequests) || 0;
    totalGbpClicks += Number(entry.gbpWebsiteClicks) || 0;
  }

  const avgCostPerLead = calculateCostPerLead(totalAdSpend, totalLeads);
  const overallROAS = calculateROAS(totalRevenueFromAds, totalAdSpend);
  const totalGbpActions = totalGbpCalls + totalGbpDirections + totalGbpClicks;

  return {
    totalAdSpend,
    totalLeads,
    avgCostPerLead,
    totalBookedJobs,
    totalRevenueFromAds,
    overallROAS,
    totalGbpCalls,
    totalGbpDirections,
    totalGbpClicks,
    totalGbpActions,
    count: entries.length,
  };
}

/**
 * Calculate days remaining until a domain expires.
 * Negative number means expired.
 */
export function getDomainDaysRemaining(domainExpiryDate: string | undefined | null, now: Date = new Date()): number {
  if (!domainExpiryDate) return 9999;
  const parts = domainExpiryDate.split('T')[0].split('-');
  if (parts.length !== 3) return 9999;
  const expYear = parseInt(parts[0], 10);
  const expMonth = parseInt(parts[1], 10) - 1;
  const expDay = parseInt(parts[2], 10);

  const expDate = new Date(expYear, expMonth, expDay);
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = expDate.getTime() - nowDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface ExpiringWebsiteItem {
  website: ClientWebsite;
  daysLeft: number;
  isExpired: boolean;
  isCritical: boolean; // 7 days or less
}

/**
 * Filter and sort websites expiring within a threshold (default 30 days)
 */
export function getExpiringWebsites(
  websites: ClientWebsite[],
  now: Date = new Date(),
  thresholdDays: number = 30
): ExpiringWebsiteItem[] {
  if (!websites || websites.length === 0) return [];

  const results: ExpiringWebsiteItem[] = [];

  for (const w of websites) {
    if (!w.domainExpiryDate) continue;
    const daysLeft = getDomainDaysRemaining(w.domainExpiryDate, now);
    if (daysLeft <= thresholdDays) {
      results.push({
        website: w,
        daysLeft,
        isExpired: daysLeft < 0,
        isCritical: daysLeft <= 7,
      });
    }
  }

  // Sort earliest expiry first
  return results.sort((a, b) => a.daysLeft - b.daysLeft);
}

/**
 * Check whether a client has an active Website Care Plan
 */
export function hasActiveCarePlan(clientServices: ClientService[], clientId?: string): boolean {
  const targetServices = clientId
    ? clientServices.filter((s) => s.clientId === clientId)
    : clientServices;

  return targetServices.some((s) => {
    if (s.status !== 'Active') return false;
    const cat = (s.category || '').toLowerCase();
    const name = (s.customName || '').toLowerCase();
    return cat.includes('care plan') || name.includes('care plan');
  });
}

/**
 * Return all uncontacted inbound leads needing urgent 5-minute follow-up
 */
export function getUncontactedLeads(clients: Client[]): Client[] {
  if (!clients) return [];
  return clients.filter(
    (c) => !c.archived && c.status === 'Lead' && c.leadContacted === false
  );
}

export function isUncontactedLead(client: Client): boolean {
  return !client.archived && client.status === 'Lead' && client.leadContacted === false;
}
