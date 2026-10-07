import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Award,
  Phone,
  Compass,
  Globe,
  Plus,
  FileText,
  Download,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  HelpCircle,
  ArrowUpRight,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Client, ClientService, ClientPerformanceEntry, AppSettings } from '../../types';
import {
  formatCurrency,
  formatMonthLabel,
  calculateCostPerLead,
  calculateROAS,
  hasAdsOrGbpServices,
  getPerformanceMetricsSummary,
} from '../../lib/calculations';
import { downloadPerformanceReportPdf } from '../../lib/pdfGenerator';
import { useToast } from '../../context/ToastContext';

interface ClientPerformanceTabProps {
  client: Client;
  clientServices: ClientService[];
  performanceEntries: ClientPerformanceEntry[];
  settings: AppSettings;
  onSaveEntry: (
    entry: Partial<ClientPerformanceEntry> & { clientId: string; month: string }
  ) => Promise<ClientPerformanceEntry>;
  onDeleteEntry: (id: string) => Promise<void>;
  onOpenNewService?: () => void;
}

export function ClientPerformanceTab({
  client,
  clientServices,
  performanceEntries,
  settings,
  onSaveEntry,
  onDeleteEntry,
  onOpenNewService,
}: ClientPerformanceTabProps) {
  const { toast } = useToast();

  // Client-specific entries sorted descending by month
  const clientEntries = useMemo(() => {
    return (performanceEntries || [])
      .filter((e) => e.clientId === client.id)
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [performanceEntries, client.id]);

  // Selected month for overview cards (defaults to latest recorded month, or current month)
  const defaultMonth = clientEntries[0]?.month || new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'ads_roas' | 'leads_cpl' | 'gbp'>('all');

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ClientPerformanceEntry | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportMonth, setReportMonth] = useState<string>(defaultMonth);
  const [reportWhatChanged, setReportWhatChanged] = useState<string>('');
  const [reportNextMonthPlan, setReportNextMonthPlan] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Check if client has contracted Ads or GBP retainers
  const clientHasAdsOrGbp = useMemo(() => {
    return hasAdsOrGbpServices(clientServices, client.id);
  }, [clientServices, client.id]);

  const adsAndGbpServices = useMemo(() => {
    return clientServices.filter((s) => {
      const cat = (s.category || '').toLowerCase();
      const name = (s.customName || '').toLowerCase();
      return (
        cat.includes('ads') ||
        cat.includes('google business') ||
        cat.includes('gbp') ||
        name.includes('ads') ||
        name.includes('google business') ||
        name.includes('gbp') ||
        (typeof s.adSpendBudget === 'number' && s.adSpendBudget > 0)
      );
    });
  }, [clientServices]);

  // Active entry selected for top KPI cards
  const activeOverviewEntry = useMemo(() => {
    return (
      clientEntries.find((e) => e.month === selectedMonth) ||
      clientEntries[0] ||
      null
    );
  }, [clientEntries, selectedMonth]);

  // Aggregated summary
  const summary = useMemo(() => {
    return getPerformanceMetricsSummary(clientEntries);
  }, [clientEntries]);

  // Open "Generate Monthly Report" modal
  const handleOpenReportModal = (monthToReport?: string) => {
    const targetMonth = monthToReport || activeOverviewEntry?.month || defaultMonth;
    setReportMonth(targetMonth);
    const existing = clientEntries.find((e) => e.month === targetMonth);
    if (existing) {
      setReportWhatChanged(existing.whatWeChanged || '');
      setReportNextMonthPlan(existing.nextMonthPlan || '');
    } else {
      setReportWhatChanged(
        'Campaign optimization, audience refinement, search term negative keyword additions, and weekly Google Business Profile posting.'
      );
      setReportNextMonthPlan(
        'Scale top converting ad sets, test seasonal promotional creative hook, and expand local Google Maps citations and review outreach.'
      );
    }
    setIsReportModalOpen(true);
  };

  // Sync report text fields when report month selector changes
  const handleReportMonthChange = (newMonth: string) => {
    setReportMonth(newMonth);
    const existing = clientEntries.find((e) => e.month === newMonth);
    if (existing) {
      setReportWhatChanged(existing.whatWeChanged || '');
      setReportNextMonthPlan(existing.nextMonthPlan || '');
    }
  };

  // Execute download of 1-Page PDF
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const existing = clientEntries.find((e) => e.month === reportMonth);

      // Create or update entry with the latest edited narrative fields
      const entryToPrint: ClientPerformanceEntry = existing
        ? {
            ...existing,
            whatWeChanged: reportWhatChanged,
            nextMonthPlan: reportNextMonthPlan,
          }
        : {
            id: `perf_${client.id}_${reportMonth.replace('-', '_')}`,
            clientId: client.id,
            month: reportMonth,
            adSpend: 0,
            leads: 0,
            costPerLead: 0,
            bookedJobs: 0,
            revenueFromAds: 0,
            roas: 0,
            gbpCalls: 0,
            gbpDirectionRequests: 0,
            gbpWebsiteClicks: 0,
            whatWeChanged: reportWhatChanged,
            nextMonthPlan: reportNextMonthPlan,
            createdAt: new Date().toISOString(),
          };

      // Auto-save edited narrative back to database
      await onSaveEntry(entryToPrint);

      // Generate & download PDF
      downloadPerformanceReportPdf(entryToPrint, client, settings);
      toast(`Downloaded 1-page performance report for ${formatMonthLabel(reportMonth)}`);
      setIsReportModalOpen(false);
    } catch (err) {
      console.error(err);
      toast('Failed to generate report PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Open entry modal for Add or Edit
  const handleOpenEntryModal = (entry?: ClientPerformanceEntry) => {
    if (entry) {
      setEditingEntry(entry);
    } else {
      setEditingEntry(null);
    }
    setIsEntryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Services Retainer Banner / Context */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-[#3D5AFE]/15 text-[#3D5AFE]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Monthly Performance & Attribution
                {clientHasAdsOrGbp ? (
                  <span className="font-mono text-[11px] font-semibold text-[#7CFF6B] bg-[#7CFF6B]/15 border border-[#7CFF6B]/30 px-2 py-0.5 rounded-full">
                    Active Retainer
                  </span>
                ) : (
                  <span className="font-mono text-[11px] font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                    No Active Ads/GBP Retainer
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#A9ADC6]">
                Track monthly ad spend, leads, auto cost-per-lead, booked revenue, ROAS, and Google Business Profile engagement.
              </p>
            </div>
          </div>

          {/* Active ads/GBP service pills */}
          {adsAndGbpServices.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] text-[#A9ADC6] font-medium">Contracted Services:</span>
              {adsAndGbpServices.map((srv) => (
                <div
                  key={srv.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#07080F] border border-[#262A40] text-xs text-slate-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
                  <span className="font-medium">{srv.customName}</span>
                  <span className="text-[#22D3EE] font-mono">{formatCurrency(srv.price)}/mo</span>
                  {srv.adSpendBudget ? (
                    <span className="text-emerald-400 font-mono text-[11px]">
                      (${srv.adSpendBudget.toLocaleString()} media budget)
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1 text-xs text-amber-300/90">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Tip: Add an Ads Management or Google Business Profile service under the Services tab to establish retainer milestones.
              </span>
              {onOpenNewService && (
                <button
                  onClick={onOpenNewService}
                  className="underline hover:text-white font-medium ml-1 cursor-pointer"
                >
                  + Add Service Now
                </button>
              )}
            </div>
          )}
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => handleOpenEntryModal()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#11131F] border border-[#262A40] text-xs font-semibold text-white hover:border-[#22D3EE] hover:text-[#22D3EE] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#22D3EE]" />
            <span>+ Log Monthly Numbers</span>
          </button>

          <button
            onClick={() => handleOpenReportModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#3D5AFE] to-[#22D3EE] text-white font-semibold text-xs sm:text-sm hover:opacity-95 shadow-lg shadow-[#3D5AFE]/25 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Monthly Report</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Month Selector & KPI Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#22D3EE]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A9ADC6]">
              Snapshot For:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-xs font-bold text-white focus:outline-none focus:border-[#22D3EE] cursor-pointer"
            >
              {clientEntries.map((e) => (
                <option key={e.month} value={e.month}>
                  {formatMonthLabel(e.month)}
                </option>
              ))}
              {clientEntries.length === 0 && (
                <option value={defaultMonth}>{formatMonthLabel(defaultMonth)} (No data yet)</option>
              )}
            </select>
          </div>

          {activeOverviewEntry && (
            <div className="flex items-center gap-3 text-xs text-[#A9ADC6]">
              <span>
                All-Time Spend:{' '}
                <strong className="text-white font-mono">
                  {formatCurrency(summary.totalAdSpend)}
                </strong>
              </span>
              <span>•</span>
              <span>
                Total Ad Revenue:{' '}
                <strong className="text-emerald-400 font-mono">
                  {formatCurrency(summary.totalRevenueFromAds)}
                </strong>
              </span>
              <span>•</span>
              <span>
                Avg ROAS:{' '}
                <strong className="text-[#22D3EE] font-mono">{summary.overallROAS}x</strong>
              </span>
            </div>
          )}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Ad Spend */}
          <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A9ADC6] block mb-1">
              Ad Spend
            </span>
            <div className="font-mono text-lg sm:text-xl font-bold text-white">
              {formatCurrency(activeOverviewEntry?.adSpend || 0)}
            </div>
            <div className="text-[10px] text-[#A9ADC6] mt-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-[#22D3EE]" />
              <span>Media budget</span>
            </div>
          </div>

          {/* Card 2: Leads */}
          <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A9ADC6] block mb-1">
              Leads
            </span>
            <div className="font-mono text-lg sm:text-xl font-bold text-[#22D3EE]">
              {activeOverviewEntry?.leads || 0}
            </div>
            <div className="text-[10px] text-[#A9ADC6] mt-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-[#22D3EE]" />
              <span>Form & call leads</span>
            </div>
          </div>

          {/* Card 3: Cost Per Lead (CPL) Auto */}
          <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A9ADC6]">
                Cost / Lead
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#3D5AFE]/20 text-[#3D5AFE] font-semibold">
                Auto
              </span>
            </div>
            <div className="font-mono text-lg sm:text-xl font-bold text-white">
              {formatCurrency(
                activeOverviewEntry?.costPerLead ||
                  calculateCostPerLead(
                    activeOverviewEntry?.adSpend || 0,
                    activeOverviewEntry?.leads || 0
                  )
              )}
            </div>
            <div className="text-[10px] text-[#A9ADC6] mt-1">Spend ÷ Leads</div>
          </div>

          {/* Card 4: Booked Jobs */}
          <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A9ADC6]">
                Booked Jobs
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                Client
              </span>
            </div>
            <div className="font-mono text-lg sm:text-xl font-bold text-white">
              {activeOverviewEntry?.bookedJobs || 0}
            </div>
            <div className="text-[10px] text-emerald-400 mt-1">
              {activeOverviewEntry && activeOverviewEntry.leads > 0
                ? `${Math.round(
                    ((activeOverviewEntry.bookedJobs || 0) / activeOverviewEntry.leads) * 100
                  )}% conversion`
                : 'Closed jobs'}
            </div>
          </div>

          {/* Card 5: Revenue from Ads */}
          <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A9ADC6] block mb-1">
              Ad Revenue
            </span>
            <div className="font-mono text-lg sm:text-xl font-bold text-emerald-400">
              {formatCurrency(activeOverviewEntry?.revenueFromAds || 0)}
            </div>
            <div className="text-[10px] text-[#A9ADC6] mt-1">Closed client revenue</div>
          </div>

          {/* Card 6: ROAS Auto */}
          <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40] bg-gradient-to-br from-[#11131F] to-[#3D5AFE]/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#A9ADC6]">
                ROAS
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                Auto
              </span>
            </div>
            <div className="font-mono text-lg sm:text-xl font-bold text-emerald-300">
              {(
                activeOverviewEntry?.roas ||
                calculateROAS(
                  activeOverviewEntry?.revenueFromAds || 0,
                  activeOverviewEntry?.adSpend || 0
                )
              ).toFixed(2)}
              x
            </div>
            <div className="text-[10px] text-slate-300 mt-1">Revenue ÷ Spend</div>
          </div>
        </div>

        {/* GBP Strip */}
        <div className="p-4 rounded-xl bg-[#11131F]/70 border border-[#262A40] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Google Business Profile (GBP) Local Search Impact
              </span>
              <span className="text-[11px] text-[#A9ADC6]">
                Phone calls, directions, and website traffic directly generated from Google Maps listing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#7CFF6B]" />
              <div>
                <span className="font-mono text-sm font-bold text-white">
                  {activeOverviewEntry?.gbpCalls || 0}
                </span>
                <span className="text-[10px] text-[#A9ADC6] block">Calls</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[#22D3EE]" />
              <div>
                <span className="font-mono text-sm font-bold text-white">
                  {activeOverviewEntry?.gbpDirectionRequests || 0}
                </span>
                <span className="text-[10px] text-[#A9ADC6] block">Directions</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#F5A524]" />
              <div>
                <span className="font-mono text-sm font-bold text-white">
                  {activeOverviewEntry?.gbpWebsiteClicks || 0}
                </span>
                <span className="text-[10px] text-[#A9ADC6] block">Clicks</span>
              </div>
            </div>

            <div className="pl-3 border-l border-[#262A40]">
              <span className="font-mono text-xs font-bold text-[#7CFF6B]">
                {(activeOverviewEntry?.gbpCalls || 0) +
                  (activeOverviewEntry?.gbpDirectionRequests || 0) +
                  (activeOverviewEntry?.gbpWebsiteClicks || 0)}{' '}
                Total Actions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Trend Charts Per Client */}
      <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#22D3EE]" />
              Performance Trends Over Time
            </h3>
            <p className="text-xs text-[#A9ADC6]">
              Visualizing advertising velocity, lead economics, and Google Business local footprint across recorded months.
            </p>
          </div>

          {/* Chart View Selector */}
          <div className="inline-flex rounded-lg bg-[#07080F] p-1 border border-[#262A40]">
            {[
              { id: 'all', label: 'All Trends' },
              { id: 'ads_roas', label: 'Spend & ROAS' },
              { id: 'leads_cpl', label: 'Leads & CPL' },
              { id: 'gbp', label: 'Google Business' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChartTab(tab.id as any)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeChartTab === tab.id
                    ? 'bg-[#3D5AFE] text-white'
                    : 'text-[#A9ADC6] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Interactive Trend Visualizations */}
        {clientEntries.length === 0 ? (
          <div className="py-12 text-center text-[#A9ADC6] text-xs border border-dashed border-[#262A40] rounded-xl">
            No monthly performance entries logged yet. Click "+ Log Monthly Numbers" to record your first month.
          </div>
        ) : (
          <div className="pt-2">
            <InteractivePerformanceCharts
              entries={[...clientEntries].reverse()} // Chronological left-to-right
              activeTab={activeChartTab}
            />
          </div>
        )}
      </div>

      {/* 4. Monthly Entries Table & Editorial Fields */}
      <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Monthly Entries Log & Strategy Review</h3>
            <p className="text-xs text-[#A9ADC6]">
              Click any month to generate its one-page PDF report or edit its numbers and strategy narrative.
            </p>
          </div>
          <button
            onClick={() => handleOpenEntryModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Month</span>
          </button>
        </div>

        {clientEntries.length === 0 ? (
          <div className="py-8 text-center text-[#A9ADC6] text-xs">
            No entries found for this client.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#262A40] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#07080F] text-[#A9ADC6] uppercase font-mono text-[10px] tracking-wider border-b border-[#262A40]">
                <tr>
                  <th className="py-3 px-3.5">Month</th>
                  <th className="py-3 px-3">Ad Spend</th>
                  <th className="py-3 px-3">Leads</th>
                  <th className="py-3 px-3">Cost / Lead</th>
                  <th className="py-3 px-3">Booked Jobs</th>
                  <th className="py-3 px-3">Revenue</th>
                  <th className="py-3 px-3">ROAS</th>
                  <th className="py-3 px-3">GBP Activity</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262A40] text-slate-200">
                {clientEntries.map((entry) => {
                  const cpl = entry.costPerLead || calculateCostPerLead(entry.adSpend, entry.leads);
                  const roas = entry.roas || calculateROAS(entry.revenueFromAds, entry.adSpend);
                  const gbpTotal =
                    (entry.gbpCalls || 0) +
                    (entry.gbpDirectionRequests || 0) +
                    (entry.gbpWebsiteClicks || 0);

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-[#151828] transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{formatMonthLabel(entry.month)}</span>
                          {entry.month === defaultMonth && (
                            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#3D5AFE]/20 text-[#3D5AFE]">
                              Latest
                            </span>
                          )}
                        </div>
                        {entry.whatWeChanged && (
                          <div className="text-[11px] text-[#A9ADC6] font-normal truncate max-w-[220px] mt-0.5">
                            {entry.whatWeChanged}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-white whitespace-nowrap">
                        {formatCurrency(entry.adSpend)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#22D3EE] font-bold whitespace-nowrap">
                        {entry.leads}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                        {formatCurrency(cpl)}
                      </td>
                      <td className="py-3 px-3 font-mono text-white whitespace-nowrap">
                        {entry.bookedJobs}
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-400 font-bold whitespace-nowrap">
                        {formatCurrency(entry.revenueFromAds)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                            roas >= 4
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : roas >= 2.5
                              ? 'bg-[#3D5AFE]/20 text-[#3D5AFE] border border-[#3D5AFE]/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {roas.toFixed(2)}x
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[#A9ADC6] whitespace-nowrap">
                        <span title={`Calls: ${entry.gbpCalls || 0}, Directions: ${entry.gbpDirectionRequests || 0}, Clicks: ${entry.gbpWebsiteClicks || 0}`}>
                          {gbpTotal} actions ({entry.gbpCalls || 0} calls)
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Generate Monthly Report PDF */}
                          <button
                            onClick={() => handleOpenReportModal(entry.month)}
                            title="Generate one-page PDF report for this month"
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3D5AFE]/15 hover:bg-[#3D5AFE] text-[#3D5AFE] hover:text-white transition-all text-xs font-semibold cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Report</span>
                          </button>

                          <button
                            onClick={() => handleOpenEntryModal(entry)}
                            title="Edit numbers and strategy notes"
                            className="p-1.5 rounded hover:bg-[#262A40] text-[#A9ADC6] hover:text-white transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={async () => {
                              if (confirm(`Delete performance entry for ${formatMonthLabel(entry.month)}?`)) {
                                await onDeleteEntry(entry.id);
                                toast('Performance record deleted');
                              }
                            }}
                            title="Delete entry"
                            className="p-1.5 rounded hover:bg-rose-500/10 text-[#A9ADC6] hover:text-[#FF5A5F] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT MONTHLY PERFORMANCE ENTRY            */}
      {/* ======================================================== */}
      {isEntryModalOpen && (
        <MonthlyEntryModal
          clientId={client.id}
          existingEntry={editingEntry}
          onClose={() => {
            setIsEntryModalOpen(false);
            setEditingEntry(null);
          }}
          onSave={async (savedData) => {
            await onSaveEntry(savedData);
            toast('Monthly performance numbers saved');
            setIsEntryModalOpen(false);
            setEditingEntry(null);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 2: GENERATE ONE-PAGE MONTHLY PDF REPORT (DYNASTY)  */}
      {/* ======================================================== */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#0F111E] border border-[#262A40] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-[#262A40] flex items-center justify-between bg-[#11131F]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-r from-[#3D5AFE] to-[#22D3EE] text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Generate Monthly Client Report
                  </h3>
                  <p className="text-xs text-[#A9ADC6]">
                    Dynasty Digital 1-Page Executive PDF • {client.businessName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={reportMonth}
                  onChange={(e) => handleReportMonthChange(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#07080F] border border-[#262A40] text-xs font-bold text-white focus:outline-none focus:border-[#22D3EE] cursor-pointer"
                >
                  {clientEntries.map((e) => (
                    <option key={e.month} value={e.month}>
                      {formatMonthLabel(e.month)}
                    </option>
                  ))}
                  {clientEntries.length === 0 && (
                    <option value={reportMonth}>{formatMonthLabel(reportMonth)}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Selected Month Metrics Summary Card */}
              {(() => {
                const entry = clientEntries.find((e) => e.month === reportMonth);
                const cpl = entry ? entry.costPerLead || calculateCostPerLead(entry.adSpend, entry.leads) : 0;
                const roas = entry ? entry.roas || calculateROAS(entry.revenueFromAds, entry.adSpend) : 0;

                return (
                  <div className="p-4 rounded-xl bg-[#07080F] border border-[#262A40] space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#A9ADC6]">
                      <span>Reporting Numbers for {formatMonthLabel(reportMonth)}:</span>
                      <button
                        onClick={() => {
                          setIsReportModalOpen(false);
                          if (entry) handleOpenEntryModal(entry);
                        }}
                        className="text-[#22D3EE] hover:underline text-[11px] font-medium"
                      >
                        Edit Numbers
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1">
                      <div className="p-2 rounded-lg bg-[#11131F]">
                        <span className="text-[10px] text-[#A9ADC6] block">Ad Spend</span>
                        <span className="font-mono text-xs font-bold text-white">
                          {formatCurrency(entry?.adSpend || 0)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#11131F]">
                        <span className="text-[10px] text-[#A9ADC6] block">Leads</span>
                        <span className="font-mono text-xs font-bold text-[#22D3EE]">
                          {entry?.leads || 0}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#11131F]">
                        <span className="text-[10px] text-[#A9ADC6] block">Cost / Lead</span>
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {formatCurrency(cpl)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#11131F]">
                        <span className="text-[10px] text-[#A9ADC6] block">Booked</span>
                        <span className="font-mono text-xs font-bold text-white">
                          {entry?.bookedJobs || 0}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#11131F]">
                        <span className="text-[10px] text-[#A9ADC6] block">Revenue</span>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          {formatCurrency(entry?.revenueFromAds || 0)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#11131F]">
                        <span className="text-[10px] text-[#A9ADC6] block">ROAS</span>
                        <span className="font-mono text-xs font-bold text-emerald-300">
                          {roas.toFixed(2)}x
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 text-[11px] text-[#A9ADC6] flex items-center gap-3">
                      <span>GBP Calls: <strong className="text-white">{entry?.gbpCalls || 0}</strong></span>
                      <span>•</span>
                      <span>Directions: <strong className="text-white">{entry?.gbpDirectionRequests || 0}</strong></span>
                      <span>•</span>
                      <span>Website Clicks: <strong className="text-white">{entry?.gbpWebsiteClicks || 0}</strong></span>
                    </div>
                  </div>
                );
              })()}

              {/* Editable Text Field: What We Changed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3D5AFE]" />
                    What We Changed This Month (Optimizations Executed)
                  </label>
                  <span className="text-[10px] text-[#A9ADC6]">Editable for PDF report</span>
                </div>
                <textarea
                  rows={4}
                  value={reportWhatChanged}
                  onChange={(e) => setReportWhatChanged(e.target.value)}
                  placeholder="Detail campaign changes, audience targeting updates, search term negative keyword additions, ad creatives rotated, or Google Business posts created..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080F] border border-[#262A40] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#22D3EE] leading-relaxed resize-none"
                />
              </div>

              {/* Editable Text Field: Next Month's Plan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                    Next Month's Strategic Plan (Initiatives & Focus)
                  </label>
                  <span className="text-[10px] text-[#A9ADC6]">Editable for PDF report</span>
                </div>
                <textarea
                  rows={4}
                  value={reportNextMonthPlan}
                  onChange={(e) => setReportNextMonthPlan(e.target.value)}
                  placeholder="Outline key strategic initiatives for next month: scaling ad budgets, seasonal promotions, review acquisition campaigns, local services ads rollout..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080F] border border-[#262A40] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#22D3EE] leading-relaxed resize-none"
                />
              </div>

              {/* PDF Guarantee notice */}
              <div className="p-3 rounded-xl bg-[#3D5AFE]/10 border border-[#3D5AFE]/25 text-[11px] text-[#A9ADC6] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#22D3EE] shrink-0" />
                <span>
                  This report will be rendered strictly as an executive <strong>one-page PDF</strong> in Dynasty Digital branding featuring client metrics, KPI tiles, and your strategy roadmap.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#262A40] bg-[#11131F] flex items-center justify-between gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#A9ADC6] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3D5AFE] to-[#22D3EE] text-white font-bold text-xs sm:text-sm hover:opacity-95 shadow-lg shadow-[#3D5AFE]/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download 1-Page PDF Summary'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// COMPONENT: Interactive SVG Performance Charts
// ========================================================
function InteractivePerformanceCharts({
  entries,
  activeTab,
}: {
  entries: ClientPerformanceEntry[];
  activeTab: 'all' | 'ads_roas' | 'leads_cpl' | 'gbp';
}) {
  if (entries.length === 0) return null;

  // Max values for chart scales
  const maxSpend = Math.max(...entries.map((e) => e.adSpend || 0), 100);
  const maxRevenue = Math.max(...entries.map((e) => e.revenueFromAds || 0), 100);
  const maxFinance = Math.max(maxSpend, maxRevenue);
  const maxLeads = Math.max(...entries.map((e) => e.leads || 0), 10);
  const maxCpl = Math.max(
    ...entries.map((e) => e.costPerLead || calculateCostPerLead(e.adSpend, e.leads)),
    10
  );
  const maxGbp = Math.max(
    ...entries.map(
      (e) => (e.gbpCalls || 0) + (e.gbpDirectionRequests || 0) + (e.gbpWebsiteClicks || 0)
    ),
    10
  );

  return (
    <div className="space-y-4">
      {/* 1. Spend vs Revenue & ROAS */}
      {(activeTab === 'all' || activeTab === 'ads_roas') && (
        <div className="p-4 rounded-xl bg-[#07080F] border border-[#262A40] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3D5AFE]" />
              Ad Spend vs Ad-Driven Revenue & ROAS
            </span>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#3D5AFE]" /> Spend
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Revenue
              </span>
              <span className="text-[#22D3EE] font-bold">ROAS Badges</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {entries.map((entry) => {
              const roas = entry.roas || calculateROAS(entry.revenueFromAds, entry.adSpend);
              const spendHeight = Math.max(12, Math.round((entry.adSpend / maxFinance) * 90));
              const revHeight = Math.max(12, Math.round((entry.revenueFromAds / maxFinance) * 90));

              return (
                <div
                  key={entry.month}
                  className="p-3 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between h-44 hover:border-[#3D5AFE] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white">
                      {formatMonthLabel(entry.month).split(' ')[0]}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/20">
                      {roas.toFixed(1)}x
                    </span>
                  </div>

                  {/* Dual Bar Display */}
                  <div className="flex items-end justify-center gap-2 h-24 pt-2">
                    {/* Spend Bar */}
                    <div className="flex flex-col items-center gap-1 w-5">
                      <div
                        style={{ height: `${spendHeight}px` }}
                        className="w-full bg-[#3D5AFE] rounded-t-sm"
                        title={`Spend: ${formatCurrency(entry.adSpend)}`}
                      />
                    </div>
                    {/* Revenue Bar */}
                    <div className="flex flex-col items-center gap-1 w-5">
                      <div
                        style={{ height: `${revHeight}px` }}
                        className="w-full bg-emerald-400 rounded-t-sm"
                        title={`Revenue: ${formatCurrency(entry.revenueFromAds)}`}
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#262A40] pt-1.5 text-[10px] font-mono flex items-center justify-between">
                    <span className="text-slate-300">${Math.round(entry.adSpend)}</span>
                    <span className="text-emerald-400 font-bold">${Math.round(entry.revenueFromAds)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Leads vs Cost Per Lead */}
      {(activeTab === 'all' || activeTab === 'leads_cpl') && (
        <div className="p-4 rounded-xl bg-[#07080F] border border-[#262A40] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE]" />
              Monthly Lead Volume & Cost Per Lead (CPL)
            </span>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-[#22D3EE]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#22D3EE]" /> Leads Count
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-400" /> Cost / Lead ($)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {entries.map((entry) => {
              const cpl = entry.costPerLead || calculateCostPerLead(entry.adSpend, entry.leads);
              const leadHeight = Math.max(12, Math.round((entry.leads / maxLeads) * 90));
              const cplHeight = Math.max(12, Math.round((cpl / maxCpl) * 90));

              return (
                <div
                  key={entry.month}
                  className="p-3 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between h-44 hover:border-[#22D3EE] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white">
                      {formatMonthLabel(entry.month).split(' ')[0]}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-[#22D3EE]">
                      {entry.leads} leads
                    </span>
                  </div>

                  <div className="flex items-end justify-center gap-2 h-24 pt-2">
                    {/* Leads bar */}
                    <div className="flex flex-col items-center gap-1 w-5">
                      <div
                        style={{ height: `${leadHeight}px` }}
                        className="w-full bg-[#22D3EE] rounded-t-sm"
                        title={`Leads: ${entry.leads}`}
                      />
                    </div>
                    {/* CPL bar */}
                    <div className="flex flex-col items-center gap-1 w-5">
                      <div
                        style={{ height: `${cplHeight}px` }}
                        className="w-full bg-purple-400 rounded-t-sm"
                        title={`CPL: ${formatCurrency(cpl)}`}
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#262A40] pt-1.5 text-[10px] font-mono flex items-center justify-between">
                    <span className="text-[#22D3EE] font-bold">{entry.leads} Lds</span>
                    <span className="text-purple-300">${cpl.toFixed(0)} CPL</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Google Business Profile Growth */}
      {(activeTab === 'all' || activeTab === 'gbp') && (
        <div className="p-4 rounded-xl bg-[#07080F] border border-[#262A40] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7CFF6B]" />
              Google Business Profile (Calls, Directions & Clicks)
            </span>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-[#7CFF6B]">
                <span className="w-2 h-2 rounded-full bg-[#7CFF6B]" /> Calls
              </span>
              <span className="flex items-center gap-1.5 text-[#22D3EE]">
                <span className="w-2 h-2 rounded-full bg-[#22D3EE]" /> Directions
              </span>
              <span className="flex items-center gap-1.5 text-[#F5A524]">
                <span className="w-2 h-2 rounded-full bg-[#F5A524]" /> Website Clicks
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            {entries.map((entry) => {
              const calls = entry.gbpCalls || 0;
              const directions = entry.gbpDirectionRequests || 0;
              const clicks = entry.gbpWebsiteClicks || 0;
              const totalActions = calls + directions + clicks;

              return (
                <div
                  key={entry.month}
                  className="p-3 rounded-xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between h-44 hover:border-[#7CFF6B] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white">
                      {formatMonthLabel(entry.month).split(' ')[0]}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-[#7CFF6B]">
                      {totalActions}
                    </span>
                  </div>

                  <div className="flex items-end justify-center gap-1.5 h-24 pt-2">
                    <div
                      style={{ height: `${Math.max(8, Math.round((calls / maxGbp) * 90))}px` }}
                      className="w-3 bg-[#7CFF6B] rounded-t-sm"
                      title={`Calls: ${calls}`}
                    />
                    <div
                      style={{ height: `${Math.max(8, Math.round((directions / maxGbp) * 90))}px` }}
                      className="w-3 bg-[#22D3EE] rounded-t-sm"
                      title={`Directions: ${directions}`}
                    />
                    <div
                      style={{ height: `${Math.max(8, Math.round((clicks / maxGbp) * 90))}px` }}
                      className="w-3 bg-[#F5A524] rounded-t-sm"
                      title={`Website Clicks: ${clicks}`}
                    />
                  </div>

                  <div className="border-t border-[#262A40] pt-1.5 text-[10px] font-mono flex items-center justify-between text-[#A9ADC6]">
                    <span>{calls}c</span>
                    <span>{directions}d</span>
                    <span>{clicks}w</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// COMPONENT: Monthly Entry Add / Edit Modal
// ========================================================
function MonthlyEntryModal({
  clientId,
  existingEntry,
  onClose,
  onSave,
}: {
  clientId: string;
  existingEntry: ClientPerformanceEntry | null;
  onClose: () => void;
  onSave: (entry: Partial<ClientPerformanceEntry> & { clientId: string; month: string }) => Promise<void>;
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [month, setMonth] = useState(existingEntry?.month || currentMonth);
  const [adSpend, setAdSpend] = useState<string>(
    existingEntry ? String(existingEntry.adSpend) : '1500'
  );
  const [leads, setLeads] = useState<string>(
    existingEntry ? String(existingEntry.leads) : '25'
  );
  const [bookedJobs, setBookedJobs] = useState<string>(
    existingEntry ? String(existingEntry.bookedJobs) : '10'
  );
  const [revenueFromAds, setRevenueFromAds] = useState<string>(
    existingEntry ? String(existingEntry.revenueFromAds) : '8500'
  );
  const [gbpCalls, setGbpCalls] = useState<string>(
    existingEntry ? String(existingEntry.gbpCalls) : '35'
  );
  const [gbpDirectionRequests, setGbpDirectionRequests] = useState<string>(
    existingEntry ? String(existingEntry.gbpDirectionRequests) : '15'
  );
  const [gbpWebsiteClicks, setGbpWebsiteClicks] = useState<string>(
    existingEntry ? String(existingEntry.gbpWebsiteClicks) : '80'
  );
  const [whatWeChanged, setWhatWeChanged] = useState(existingEntry?.whatWeChanged || '');
  const [nextMonthPlan, setNextMonthPlan] = useState(existingEntry?.nextMonthPlan || '');
  const [notes, setNotes] = useState(existingEntry?.notes || '');
  const [saving, setSaving] = useState(false);

  // Dynamic calculations in real-time
  const numSpend = Math.max(0, parseFloat(adSpend) || 0);
  const numLeads = Math.max(0, parseInt(leads, 10) || 0);
  const numRev = Math.max(0, parseFloat(revenueFromAds) || 0);
  const autoCpl = numLeads > 0 ? (numSpend / numLeads).toFixed(2) : '0.00';
  const autoRoas = numSpend > 0 ? (numRev / numSpend).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: existingEntry?.id,
        clientId,
        month,
        adSpend: numSpend,
        leads: numLeads,
        costPerLead: parseFloat(autoCpl),
        bookedJobs: Math.max(0, parseInt(bookedJobs, 10) || 0),
        revenueFromAds: numRev,
        roas: parseFloat(autoRoas),
        gbpCalls: Math.max(0, parseInt(gbpCalls, 10) || 0),
        gbpDirectionRequests: Math.max(0, parseInt(gbpDirectionRequests, 10) || 0),
        gbpWebsiteClicks: Math.max(0, parseInt(gbpWebsiteClicks, 10) || 0),
        whatWeChanged,
        nextMonthPlan,
        notes,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0F111E] border border-[#262A40] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#262A40] flex items-center justify-between bg-[#11131F]">
          <div>
            <h3 className="text-base font-bold text-white">
              {existingEntry ? 'Edit Monthly Performance Entry' : 'Log Monthly Performance Numbers'}
            </h3>
            <p className="text-xs text-[#A9ADC6]">
              All calculations (Cost per Lead & ROAS) are calculated automatically in real time.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#262A40] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Month selector */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1">
              Reporting Month (YYYY-MM)
            </label>
            <input
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-white focus:outline-none focus:border-[#22D3EE]"
            />
          </div>

          {/* Paid Ads Section */}
          <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] space-y-3">
            <span className="font-bold text-white text-xs block">
              Paid Advertising Numbers
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#A9ADC6] mb-1 font-medium">Monthly Ad Spend ($)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={adSpend}
                  onChange={(e) => setAdSpend(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div>
                <label className="block text-[#A9ADC6] mb-1 font-medium">Leads Generated (Count)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={leads}
                  onChange={(e) => setLeads(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
            </div>

            {/* Auto CPL Live Preview */}
            <div className="p-2 rounded-lg bg-[#11131F] flex items-center justify-between text-xs">
              <span className="text-[#A9ADC6]">Cost Per Lead (Auto-Calculated):</span>
              <span className="font-mono font-bold text-[#22D3EE]">${autoCpl} / lead</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#A9ADC6] mb-1 font-medium">Booked Jobs (Client-Reported)</label>
                <input
                  type="number"
                  min="0"
                  value={bookedJobs}
                  onChange={(e) => setBookedJobs(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div>
                <label className="block text-[#A9ADC6] mb-1 font-medium">Revenue From Ads ($)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={revenueFromAds}
                  onChange={(e) => setRevenueFromAds(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
            </div>

            {/* Auto ROAS Live Preview */}
            <div className="p-2 rounded-lg bg-[#11131F] flex items-center justify-between text-xs">
              <span className="text-[#A9ADC6]">Return on Ad Spend (Auto-Calculated ROAS):</span>
              <span className="font-mono font-bold text-emerald-400">{autoRoas}x</span>
            </div>
          </div>

          {/* GBP Metrics Section */}
          <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] space-y-3">
            <span className="font-bold text-white text-xs block">
              Google Business Profile (GBP) Metrics
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[#A9ADC6] mb-1 font-medium">Calls</label>
                <input
                  type="number"
                  min="0"
                  value={gbpCalls}
                  onChange={(e) => setGbpCalls(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div>
                <label className="block text-[#A9ADC6] mb-1 font-medium">Directions</label>
                <input
                  type="number"
                  min="0"
                  value={gbpDirectionRequests}
                  onChange={(e) => setGbpDirectionRequests(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div>
                <label className="block text-[#A9ADC6] mb-1 font-medium">Website Clicks</label>
                <input
                  type="number"
                  min="0"
                  value={gbpWebsiteClicks}
                  onChange={(e) => setGbpWebsiteClicks(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] text-white font-mono focus:outline-none focus:border-[#22D3EE]"
                />
              </div>
            </div>
          </div>

          {/* Strategy Editorial Fields */}
          <div>
            <label className="block text-[#A9ADC6] mb-1 font-medium">
              What We Changed This Month
            </label>
            <textarea
              rows={3}
              value={whatWeChanged}
              onChange={(e) => setWhatWeChanged(e.target.value)}
              placeholder="e.g. Added negative keywords for DIY queries; launched 2 new video hook ad sets; posted weekly geotagged job site photos to Google Business..."
              className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-white focus:outline-none focus:border-[#22D3EE] resize-none"
            />
          </div>

          <div>
            <label className="block text-[#A9ADC6] mb-1 font-medium">
              Next Month's Strategic Plan
            </label>
            <textarea
              rows={3}
              value={nextMonthPlan}
              onChange={(e) => setNextMonthPlan(e.target.value)}
              placeholder="e.g. Scale budget on winning ad creative; prep holiday promotion; automate post-service review request sequence..."
              className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-white focus:outline-none focus:border-[#22D3EE] resize-none"
            />
          </div>

          <div>
            <label className="block text-[#A9ADC6] mb-1 font-medium">Internal Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Client confirmed $2,400 average ticket on booked jobs."
              className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-white focus:outline-none focus:border-[#22D3EE]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#262A40] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-[#A9ADC6] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324bda] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Performance Numbers'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
