import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  MapPin,
  Tag,
  DollarSign,
  TrendingUp,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Plus,
  Briefcase,
  FolderGit2,
  CheckSquare,
  History,
  FileText,
  Clock,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Edit2,
  Trash2,
  ExternalLink,
  Wallet,
  FileCheck,
  AlertTriangle,
  Download,
  FolderOpen,
  Link as LinkIcon,
  ListChecks,
} from 'lucide-react';
import {
  Client,
  ClientService,
  Payment,
  Project,
  Task,
  ActivityLog,
  ServiceStatus,
  Expense,
  Invoice,
  ClientDocuments,
  ClientChecklist,
  ChecklistTemplate,
  ClientPerformanceEntry,
  ClientWebsite,
  AppSettings,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  getClientMRR,
  getClientLifetimeValue,
  getClientCommittedUntil,
  isClientOverdue,
  isClientServiceOverdue,
  getServiceContractValue,
  getDaysRemaining,
  getServiceMonthlyRate,
  getClientProfitMetrics,
  getClientChecklistsProgress,
  hasAdsOrGbpServices,
  getDomainDaysRemaining,
} from '../../lib/calculations';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { downloadInvoicePdf } from '../../lib/pdfGenerator';
import {
  getSettings,
  savePerformanceEntry,
  deletePerformanceEntry,
  saveWebsite,
  deleteWebsite,
} from '../../lib/db';
import { ClientDocumentsModal } from '../modals/ClientDocumentsModal';
import { ClientChecklistsTab } from './ClientChecklistsTab';
import { ClientPerformanceTab } from './ClientPerformanceTab';
import { ClientWebsitesTab } from './ClientWebsitesTab';

interface ClientProfileViewProps {
  client: Client;
  clientServices: ClientService[];
  payments: Payment[];
  invoices?: Invoice[];
  projects: Project[];
  tasks: Task[];
  activities: ActivityLog[];
  expenses?: Expense[];
  onBack: () => void;
  onEditClient: () => void;
  onOpenNewService: () => void;
  onEditService: (service: ClientService) => void;
  onRenewService: (serviceId: string, months: number) => void;
  onConvertToMonthToMonth: (serviceId: string) => void;
  onChangeServiceStatus: (serviceId: string, status: ServiceStatus) => void;
  onDeleteService: (serviceId: string) => void;
  onOpenNewPayment: () => void;
  onEditPayment: (payment: Payment) => void;
  onDeletePayment: (paymentId: string) => void;
  onOpenNewInvoice?: (clientId: string) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  onOpenNewProject: () => void;
  onEditProject: (project: Project) => void;
  onOpenNewTask: () => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenLogActivity: () => void;
  onSaveNotes: (notes: string) => void;
  onOpenNewExpense?: (clientId: string) => void;
  onSaveDocuments?: (documents: ClientDocuments) => Promise<void>;
  checklists?: ClientChecklist[];
  checklistTemplates?: ChecklistTemplate[];
  onToggleChecklistItem?: (checklistId: string, itemId: string) => void;
  onAddChecklistItem?: (checklistId: string, label: string) => void;
  onDeleteChecklistItem?: (checklistId: string, itemId: string) => void;
  onDeleteChecklist?: (checklistId: string) => void;
  onCreateChecklistFromTemplate?: (
    clientId: string,
    templateId: string,
    serviceId?: string,
    title?: string
  ) => void;
  performanceEntries?: ClientPerformanceEntry[];
  settings?: AppSettings;
  onSavePerformanceEntry?: (
    entry: Partial<ClientPerformanceEntry> & { clientId: string; month: string }
  ) => Promise<ClientPerformanceEntry>;
  onDeletePerformanceEntry?: (id: string) => Promise<void>;
  websites?: ClientWebsite[];
  onSaveWebsite?: (
    website: Partial<ClientWebsite> & { clientId: string; domain: string }
  ) => Promise<ClientWebsite>;
  onDeleteWebsite?: (id: string) => Promise<void>;
}

type ProfileTab =
  | 'overview'
  | 'services'
  | 'websites'
  | 'performance'
  | 'checklists'
  | 'invoices'
  | 'documents'
  | 'payments'
  | 'projects'
  | 'tasks'
  | 'activity'
  | 'notes';

export function ClientProfileView({
  client,
  clientServices,
  payments,
  invoices = [],
  projects,
  tasks,
  activities,
  checklists = [],
  checklistTemplates = [],
  performanceEntries = [],
  settings,
  onSavePerformanceEntry,
  onDeletePerformanceEntry,
  websites = [],
  onSaveWebsite,
  onDeleteWebsite,
  onBack,
  onEditClient,
  onOpenNewService,
  onEditService,
  onRenewService,
  onConvertToMonthToMonth,
  onChangeServiceStatus,
  onDeleteService,
  onOpenNewPayment,
  onEditPayment,
  onDeletePayment,
  onOpenNewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onOpenNewProject,
  onEditProject,
  onOpenNewTask,
  onToggleTask,
  onDeleteTask,
  onOpenLogActivity,
  onSaveNotes,
  onOpenNewExpense,
  onSaveDocuments,
  onToggleChecklistItem,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onDeleteChecklist,
  onCreateChecklistFromTemplate,
  expenses = [],
}: ClientProfileViewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [copiedAccess, setCopiedAccess] = useState(false);
  const [notesDraft, setNotesDraft] = useState(client.notes || '');
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);

  const mrr = getClientMRR(clientServices, client.id);
  const ltv = getClientLifetimeValue(payments, client.id);
  const committedUntil = getClientCommittedUntil(clientServices, client.id);
  const overdue = isClientOverdue(client, clientServices, payments);
  const profitMetrics = getClientProfitMetrics(client, clientServices, expenses);
  const clientExpenses = expenses.filter((e) => e.clientId === client.id);
  const clientInvoices = invoices.filter((i) => i.clientId === client.id);
  const clientChecklists = checklists.filter((c) => c.clientId === client.id);
  const clientChecklistsProgress = getClientChecklistsProgress(checklists, client.id);
  const isAdsOrGbpClient = hasAdsOrGbpServices(clientServices, client.id) || (performanceEntries && performanceEntries.length > 0);
  const clientPerformanceEntries = (performanceEntries || []).filter((p) => p.clientId === client.id);
  const clientWebsites = (websites || []).filter((w) => w.clientId === client.id);

  const clientTasks = tasks.filter((t) => t.clientId === client.id);
  const clientProjects = projects.filter((p) => p.clientId === client.id);
  const clientActivities = activities.filter((a) => a.clientId === client.id);

  const isAgreementSigned =
    client.documents?.agreement?.eSignStatus === 'Signed' &&
    !!client.documents?.agreement?.signedDate;

  const handleCopyAccess = () => {
    if (client.accessInfo) {
      navigator.clipboard.writeText(client.accessInfo);
      setCopiedAccess(true);
      toast('Access locations copied to clipboard');
      setTimeout(() => setCopiedAccess(false), 2000);
    }
  };

  const handleSaveNotesClick = () => {
    onSaveNotes(notesDraft);
    toast('Client notes saved');
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-[#11131F] border border-[#262A40] text-[#A9ADC6] hover:text-white hover:border-[#22D3EE] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {client.businessName}
              </h1>
              <StatusBadge status={client.status} size="md" />

              {/* Agreement Compliance Indicator */}
              {client.status === 'Active Client' && (
                isAgreementSigned ? (
                  <span
                    className="font-mono text-xs text-[#7CFF6B] bg-[#7CFF6B]/15 border border-[#7CFF6B]/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold"
                    title={`Agreement Signed on ${client.documents?.agreement?.signedDate}`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Agreement Signed
                  </span>
                ) : (
                  <span
                    className="font-mono text-xs text-[#F5A524] bg-[#F5A524]/15 border border-[#F5A524]/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold"
                    title="No executed agreement signed on file"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    No Signed Agreement
                  </span>
                )
              )}

              {overdue && (
                <span className="font-mono text-xs text-[#FF5A5F] bg-[#FF5A5F]/15 border border-[#FF5A5F]/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  OVERDUE
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#A9ADC6] mt-1">
              <span>{client.contactName || 'No contact named'}</span>
              <span>·</span>
              <span>{client.city}</span>
              <span>·</span>
              <span className="font-mono text-[#22D3EE]">{client.industry}</span>
              <span>·</span>
              <span>Source: {client.leadSource}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenNewInvoice?.(client.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-xs font-semibold text-[#22D3EE] border border-[#22D3EE]/30 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Invoice</span>
          </button>
          <button
            onClick={() => setIsDocumentsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] hover:text-white text-xs font-medium text-[#A9ADC6] transition-colors"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Documents</span>
          </button>
          <button
            onClick={onEditClient}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] hover:text-white text-xs font-medium text-[#A9ADC6] transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={onOpenLogActivity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Activity</span>
          </button>
        </div>
      </div>

      {/* Profile KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
          <span className="text-xs text-[#A9ADC6] block mb-1">Retainer MRR</span>
          <div className="font-mono text-xl sm:text-2xl font-bold text-white">
            {formatCurrency(mrr)}
          </div>
          <span className="text-[10px] text-[#22D3EE] font-mono mt-0.5 block">
            {clientServices.filter((s) => s.status === 'Active' && s.billingType === 'monthly').length} active retainers
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
          <span className="text-xs text-[#A9ADC6] block mb-1">Net Monthly Profit</span>
          <div
            className={`font-mono text-xl sm:text-2xl font-bold ${
              profitMetrics.monthlyProfit >= 0 ? 'text-[#7CFF6B]' : 'text-[#FF5A5F]'
            }`}
          >
            {formatCurrency(profitMetrics.monthlyProfit)}
          </div>
          <span className="text-[10px] text-[#7CFF6B] font-mono mt-0.5 block">
            {profitMetrics.marginPercent}% margin
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
          <span className="text-xs text-[#A9ADC6] block mb-1">Direct Client Costs</span>
          <div className="font-mono text-xl sm:text-2xl font-bold text-[#FF5A5F]">
            {profitMetrics.monthlyCosts > 0 ? `-${formatCurrency(profitMetrics.monthlyCosts)}` : '$0.00'}
          </div>
          <span className="text-[10px] text-[#A9ADC6] font-mono mt-0.5 block">
            {clientExpenses.length} dedicated costs
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
          <span className="text-xs text-[#A9ADC6] block mb-1">Lifetime Value (LTV)</span>
          <div className="font-mono text-xl sm:text-2xl font-bold text-white">
            {formatCurrency(ltv)}
          </div>
          <span className="text-[10px] text-[#A9ADC6] font-mono mt-0.5 block">
            {payments.filter((p) => p.status === 'Paid').length} paid invoices
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#11131F] border border-[#262A40]">
          <span className="text-xs text-[#A9ADC6] block mb-1">Committed Until</span>
          <div className="font-mono text-lg sm:text-xl font-bold text-white">
            {committedUntil ? formatDate(committedUntil) : 'Month-to-month'}
          </div>
          <span className="text-[10px] text-[#A9ADC6] font-mono mt-0.5 block">
            {committedUntil
              ? `${Math.max(0, getDaysRemaining(committedUntil))}d remaining`
              : 'Rolling term'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#262A40] pb-px">
        {[
          { id: 'overview' as ProfileTab, label: 'Overview', icon: Building2 },
          { id: 'services' as ProfileTab, label: `Services (${clientServices.length})`, icon: Briefcase },
          { id: 'websites' as ProfileTab, label: `Websites (${clientWebsites.length})`, icon: Globe },
          ...(isAdsOrGbpClient
            ? [
                {
                  id: 'performance' as ProfileTab,
                  label:
                    clientPerformanceEntries.length > 0
                      ? `Performance (${clientPerformanceEntries.length})`
                      : 'Performance',
                  icon: TrendingUp,
                },
              ]
            : []),
          {
            id: 'checklists' as ProfileTab,
            label:
              clientChecklistsProgress.total > 0
                ? `Checklists (${clientChecklistsProgress.percent}%)`
                : `Checklists (${clientChecklists.length})`,
            icon: ListChecks,
          },
          { id: 'invoices' as ProfileTab, label: `Invoices (${clientInvoices.length})`, icon: FileText },
          { id: 'documents' as ProfileTab, label: 'Documents', icon: FileCheck },
          { id: 'payments' as ProfileTab, label: `Payments (${payments.length})`, icon: DollarSign },
          { id: 'projects' as ProfileTab, label: `Projects (${clientProjects.length})`, icon: FolderGit2 },
          { id: 'tasks' as ProfileTab, label: `Tasks (${clientTasks.length})`, icon: CheckSquare },
          { id: 'activity' as ProfileTab, label: `Timeline (${clientActivities.length})`, icon: History },
          { id: 'notes' as ProfileTab, label: 'Notes', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-[#22D3EE] text-[#22D3EE] bg-[#11131F]/40'
                  : 'border-transparent text-[#A9ADC6] hover:text-white hover:bg-[#11131F]/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Details & Quick Channels */}
          <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-4">
            <h3 className="text-sm font-semibold text-white">Direct Communication Channels</h3>

            <div className="space-y-3 text-xs">
              {client.phone ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#07080F] border border-[#262A40]">
                  <div className="flex items-center gap-2.5 text-[#A9ADC6]">
                    <Phone className="w-4 h-4 text-[#7CFF6B]" />
                    <span className="font-mono text-white text-sm">{client.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${client.phone}`}
                      className="px-2.5 py-1 rounded bg-[#3D5AFE]/20 text-[#3D5AFE] hover:bg-[#3D5AFE] hover:text-white font-mono text-[11px] transition-colors"
                    >
                      Call
                    </a>
                    <a
                      href={`sms:${client.phone}`}
                      className="px-2.5 py-1 rounded bg-[#22D3EE]/20 text-[#22D3EE] hover:bg-[#22D3EE] hover:text-[#07080F] font-mono text-[11px] transition-colors"
                    >
                      Text
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-[#A9ADC6] italic">No phone number on file</p>
              )}

              {client.email ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#07080F] border border-[#262A40]">
                  <div className="flex items-center gap-2.5 text-[#A9ADC6] truncate">
                    <Mail className="w-4 h-4 text-[#22D3EE] shrink-0" />
                    <span className="text-white truncate">{client.email}</span>
                  </div>
                  <a
                    href={`mailto:${client.email}`}
                    className="px-2.5 py-1 rounded bg-[#3D5AFE]/20 text-[#3D5AFE] hover:bg-[#3D5AFE] hover:text-white font-mono text-[11px] transition-colors shrink-0"
                  >
                    Email
                  </a>
                </div>
              ) : (
                <p className="text-[#A9ADC6] italic">No email address on file</p>
              )}

              {client.website || clientWebsites.length > 0 ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#07080F] border border-[#262A40]">
                  <div className="flex items-center gap-2.5 text-[#A9ADC6] truncate">
                    <Globe className="w-4 h-4 text-[#F5A524] shrink-0" />
                    <span className="text-white truncate font-mono text-xs">
                      {clientWebsites[0]?.domain || client.website}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('websites')}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/30 transition-colors cursor-pointer"
                    >
                      Websites ({clientWebsites.length}) →
                    </button>
                    {(client.website || clientWebsites[0]?.liveUrl) && (
                      <a
                        href={clientWebsites[0]?.liveUrl || (client.website?.startsWith('http') ? client.website : `https://${client.website}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-[#A9ADC6] hover:text-white transition-colors"
                        title="Open live URL"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#07080F] border border-[#262A40]">
                  <p className="text-[#A9ADC6] italic text-xs">No website URL recorded</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('websites')}
                    className="text-[10px] font-mono text-[#22D3EE] hover:underline cursor-pointer"
                  >
                    + Add Website
                  </button>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] text-xs space-y-1">
                <div className="flex items-center gap-2 text-[#A9ADC6]">
                  <MapPin className="w-4 h-4 text-[#FF5A5F]" />
                  <span>{client.address ? `${client.address}, ` : ''}{client.city}</span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {client.tags && client.tags.length > 0 && (
              <div className="pt-2">
                <span className="text-xs text-[#A9ADC6] block mb-2">Account Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {client.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full text-xs font-mono bg-[#07080F] border border-[#262A40] text-[#22D3EE]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Where Access Lives & Notes Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Where Access Lives */}
            <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#22D3EE]" />
                  <h3 className="text-sm font-semibold text-white">Where Access Lives</h3>
                </div>
                {client.accessInfo && (
                  <button
                    onClick={handleCopyAccess}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#22D3EE] hover:underline cursor-pointer"
                  >
                    {copiedAccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#7CFF6B]" />
                        <span className="text-[#7CFF6B]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy details</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-[#A9ADC6] mb-3">
                Platform locations, delegation IDs & client-side portals (passwords never stored here)
              </p>
              <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] font-mono text-xs text-white leading-relaxed whitespace-pre-wrap">
                {client.accessInfo || 'No access delegation notes recorded for this account.'}
              </div>
            </div>

            {/* Websites & Domain Infrastructure Preview */}
            <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#22D3EE]" />
                  <h3 className="text-sm font-semibold text-white">Websites & Infrastructure</h3>
                </div>
                <button
                  onClick={() => setActiveTab('websites')}
                  className="text-xs text-[#22D3EE] font-mono hover:underline cursor-pointer"
                >
                  Manage Websites ({clientWebsites.length}) →
                </button>
              </div>

              {clientWebsites.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#07080F] border border-[#262A40] flex items-center justify-between">
                  <p className="text-xs text-[#A9ADC6]">No website infrastructure records added yet.</p>
                  <button
                    onClick={() => setActiveTab('websites')}
                    className="px-2.5 py-1 rounded-lg bg-[#3D5AFE]/20 text-[#22D3EE] hover:bg-[#3D5AFE]/30 text-xs font-mono transition-colors cursor-pointer"
                  >
                    + Add Domain
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientWebsites.map((w) => {
                    const daysLeft = getDomainDaysRemaining(w.domainExpiryDate);
                    const isExpiringSoon = daysLeft <= 30;
                    return (
                      <div
                        key={w.id}
                        className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs font-mono">{w.domain}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181B2C] text-[#A9ADC6] border border-[#262A40]">
                              {w.registrar}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                w.registrarLoginOwner === 'client'
                                  ? 'bg-[#F5A524]/15 text-[#F5A524] border border-[#F5A524]/30'
                                  : 'bg-[#3D5AFE]/15 text-[#22D3EE] border border-[#3D5AFE]/30'
                              }`}
                            >
                              {w.registrarLoginOwner === 'client' ? 'Client Login' : 'Agency Login'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                w.sslStatus === 'Active'
                                  ? 'bg-[#7CFF6B]/15 text-[#7CFF6B]'
                                  : 'bg-[#FF5A5F]/15 text-[#FF5A5F]'
                              }`}
                            >
                              SSL: {w.sslStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#A9ADC6] font-mono">
                            <span>Host: {w.hostingPlatform}</span>
                            <span>•</span>
                            <span className={isExpiringSoon ? 'text-[#FF5A5F] font-bold' : ''}>
                              Expires: {formatDate(w.domainExpiryDate)} ({daysLeft < 0 ? 'Expired' : `${daysLeft}d left`})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {w.uptimeMonitorLink && (
                            <a
                              href={w.uptimeMonitorLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded text-[10px] font-mono bg-[#181B2C] hover:bg-[#22D3EE]/20 text-[#22D3EE] border border-[#262A40] transition-colors"
                              title="Uptime Monitor"
                            >
                              Uptime
                            </a>
                          )}
                          <a
                            href={w.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded text-[#A9ADC6] hover:text-white transition-colors"
                            title="Open Live Site"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Notes preview */}
            <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Account Notes & Strategy</h3>
                <button
                  onClick={() => setActiveTab('notes')}
                  className="text-xs text-[#22D3EE] font-mono hover:underline"
                >
                  Open full editor →
                </button>
              </div>
              <p className="text-xs text-[#A9ADC6] leading-relaxed line-clamp-3">
                {client.notes || 'No general notes entered yet.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SERVICES TAB */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Purchased Services & Retainers</h3>
              <p className="text-xs text-[#A9ADC6]">
                Track custom pricing, billing dates, discounts, commitments & renewals
              </p>
            </div>
            <button
              onClick={onOpenNewService}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Attach Service</span>
            </button>
          </div>

          {clientServices.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#11131F] border border-[#262A40] space-y-3">
              <Briefcase className="w-8 h-8 mx-auto text-[#262A40]" />
              <p className="text-sm font-medium text-white">No services attached to this client yet.</p>
              <p className="text-xs text-[#A9ADC6]">
                Select from the agency catalog to add a website build or monthly care plan.
              </p>
              <button
                onClick={onOpenNewService}
                className="px-4 py-2 rounded-lg bg-[#3D5AFE] text-xs font-medium text-white inline-block"
              >
                Attach First Service
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {clientServices.map((service) => {
                const contractVal = getServiceContractValue(service);
                const isOverdue = isClientServiceOverdue(service, payments);
                const daysLeft = service.endDate ? getDaysRemaining(service.endDate) : 999;
                const monthlyRate = getServiceMonthlyRate(service);

                return (
                  <div
                    key={service.id}
                    className={`p-5 rounded-2xl bg-[#11131F] border transition-all space-y-3 ${
                      isOverdue
                        ? 'border-[#FF5A5F]/40 shadow-sm shadow-[#FF5A5F]/10'
                        : 'border-[#262A40] hover:border-[#22D3EE]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{service.customName}</h4>
                          <StatusBadge status={service.status} size="sm" />
                          {isOverdue && (
                            <span className="font-mono text-[9px] text-[#FF5A5F] bg-[#FF5A5F]/15 px-1.5 py-0.5 rounded border border-[#FF5A5F]/30">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#A9ADC6] font-mono mt-0.5 block">
                          {service.category || 'Service'} · {service.billingType === 'monthly' ? 'Monthly Retainer' : 'One-time Build'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-base font-bold text-white">
                          {formatCurrency(service.billingType === 'monthly' ? monthlyRate : service.price)}
                        </span>
                        <span className="text-[10px] text-[#A9ADC6] block">
                          {service.billingType === 'monthly' ? '/month' : 'one-time'}
                        </span>
                      </div>
                    </div>

                    {/* Service Financial Details */}
                    <div className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-[#A9ADC6] block">Setup Fee:</span>
                        <span className="text-white">{formatCurrency(service.setupFee)}</span>
                      </div>
                      <div>
                        <span className="text-[#A9ADC6] block">Discount:</span>
                        <span className="text-white">
                          {service.discountValue > 0
                            ? service.discountType === 'percent'
                              ? `${service.discountValue}%`
                              : formatCurrency(service.discountValue)
                            : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A9ADC6] block">Contract Val:</span>
                        <span className="text-[#7CFF6B]">{formatCurrency(contractVal)}</span>
                      </div>
                      <div>
                        <span className="text-[#A9ADC6] block">Billing Day:</span>
                        <span className="text-white">Day {service.billingDayOfMonth}</span>
                      </div>
                    </div>

                    {/* Term & Renewal countdown */}
                    <div className="flex items-center justify-between text-xs text-[#A9ADC6] pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#22D3EE]" />
                        <span>Term: {formatDate(service.startDate)} → {formatDate(service.endDate)}</span>
                      </div>
                      {service.endDate && (
                        <span
                          className={`font-mono text-xs ${
                            daysLeft <= 0
                              ? 'text-[#FF5A5F]'
                              : daysLeft <= 30
                              ? 'text-[#F5A524]'
                              : 'text-[#7CFF6B]'
                          }`}
                        >
                          {daysLeft <= 0 ? 'Matured / Expired' : `${daysLeft}d left`}
                        </span>
                      )}
                    </div>

                    {/* Quick Term Actions (Renew, Month-to-month, Pause, Delete) */}
                    <div className="pt-2 border-t border-[#262A40]/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onRenewService(service.id, 12)}
                          className="px-2 py-1 rounded bg-[#181B2C] hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] text-[11px] font-mono text-[#A9ADC6] border border-[#262A40] transition-colors"
                          title="Extend term by 12 months"
                        >
                          +12 mo
                        </button>
                        <button
                          onClick={() => onRenewService(service.id, 3)}
                          className="px-2 py-1 rounded bg-[#181B2C] hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] text-[11px] font-mono text-[#A9ADC6] border border-[#262A40] transition-colors"
                          title="Extend term by 3 months"
                        >
                          +3 mo
                        </button>
                        <button
                          onClick={() => onConvertToMonthToMonth(service.id)}
                          className="px-2 py-1 rounded bg-[#181B2C] hover:bg-white/10 text-[11px] font-mono text-[#A9ADC6] border border-[#262A40] transition-colors"
                          title="Convert to rolling month-to-month"
                        >
                          Rolling
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {service.status === 'Active' ? (
                          <button
                            onClick={() => onChangeServiceStatus(service.id, 'Paused')}
                            className="p-1.5 rounded text-[#A9ADC6] hover:text-[#F5A524] hover:bg-[#181B2C]"
                            title="Pause Service"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onChangeServiceStatus(service.id, 'Active')}
                            className="p-1.5 rounded text-[#A9ADC6] hover:text-[#7CFF6B] hover:bg-[#181B2C]"
                            title="Activate Service"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEditService(service)}
                          className="p-1.5 rounded text-[#A9ADC6] hover:text-white hover:bg-[#181B2C]"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteService(service.id)}
                          className="p-1.5 rounded text-[#A9ADC6] hover:text-[#FF5A5F] hover:bg-[#181B2C]"
                          title="Delete Service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2a. WEBSITES TAB */}
      {activeTab === 'websites' && (
        <ClientWebsitesTab
          client={client}
          websites={websites || []}
          onSaveWebsite={async (w) => {
            if (onSaveWebsite) {
              return await onSaveWebsite(w);
            }
            return await saveWebsite(w);
          }}
          onDeleteWebsite={async (id) => {
            if (onDeleteWebsite) {
              await onDeleteWebsite(id);
            } else {
              await deleteWebsite(id);
            }
          }}
        />
      )}

      {/* 2b. PERFORMANCE TAB (FOR CLIENTS WITH ADS OR GBP SERVICES) */}
      {activeTab === 'performance' && (
        <ClientPerformanceTab
          client={client}
          clientServices={clientServices}
          performanceEntries={performanceEntries}
          settings={settings || getSettings()}
          onSaveEntry={async (entry) => {
            if (onSavePerformanceEntry) {
              return await onSavePerformanceEntry(entry);
            }
            return await savePerformanceEntry(entry);
          }}
          onDeleteEntry={async (id) => {
            if (onDeletePerformanceEntry) {
              await onDeletePerformanceEntry(id);
            } else {
              await deletePerformanceEntry(id);
            }
          }}
          onOpenNewService={onOpenNewService}
        />
      )}

      {/* 3. PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Payment Ledger</h3>
              <p className="text-xs text-[#A9ADC6]">
                Track all deposits, monthly retainers, ACH and Stripe transactions
              </p>
            </div>
            <button
              onClick={onOpenNewPayment}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Payment</span>
            </button>
          </div>

          <div className="rounded-2xl bg-[#11131F] border border-[#262A40] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#262A40] bg-[#07080F]/60 text-[11px] font-mono uppercase tracking-wider text-[#A9ADC6]">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262A40]/40">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#A9ADC6] italic">
                        No payments recorded yet for this client.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#181B2C]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-white">
                          {p.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#A9ADC6]">
                          {formatDate(p.date)}
                        </td>
                        <td className="py-3 px-4 text-white">{p.type}</td>
                        <td className="py-3 px-4 text-[#A9ADC6]">{p.method}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={p.status} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditPayment(p)}
                              className="p-1 text-[#A9ADC6] hover:text-white"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeletePayment(p.id)}
                              className="p-1 text-[#A9ADC6] hover:text-[#FF5A5F]"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Client Invoices & PDF Billing</h3>
              <p className="text-xs text-[#A9ADC6]">
                Generate branded Dynasty Digital PDF invoices, track payment status, and export for client remittance
              </p>
            </div>
            <button
              onClick={() => onOpenNewInvoice?.(client.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-semibold text-white transition-all shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate Invoice</span>
            </button>
          </div>

          {/* Quick Invoice Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#11131F] border border-[#262A40]">
              <span className="text-xs text-[#A9ADC6] block mb-0.5">Total Invoiced</span>
              <span className="text-lg font-bold font-mono text-white">
                {formatCurrency(clientInvoices.reduce((acc, i) => acc + i.total, 0))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#11131F] border border-[#262A40]">
              <span className="text-xs text-[#A9ADC6] block mb-0.5">Paid Invoices</span>
              <span className="text-lg font-bold font-mono text-[#7CFF6B]">
                {formatCurrency(
                  clientInvoices.filter((i) => i.status === 'Paid').reduce((acc, i) => acc + i.total, 0)
                )}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#11131F] border border-[#262A40]">
              <span className="text-xs text-[#A9ADC6] block mb-0.5">Outstanding / Due</span>
              <span className="text-lg font-bold font-mono text-[#F5A524]">
                {formatCurrency(
                  clientInvoices.filter((i) => i.status !== 'Paid').reduce((acc, i) => acc + i.total, 0)
                )}
              </span>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="rounded-xl border border-[#262A40] bg-[#11131F] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#262A40] bg-[#0E0F17] text-[#A9ADC6]">
                    <th className="py-3 px-4 font-semibold">Invoice #</th>
                    <th className="py-3 px-4 font-semibold">Issue Date</th>
                    <th className="py-3 px-4 font-semibold">Due Date</th>
                    <th className="py-3 px-4 font-semibold">Line Items</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262A40]/50">
                  {clientInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#A9ADC6] italic">
                        No invoices generated for {client.businessName} yet. Click "+ Generate Invoice" to create one.
                      </td>
                    </tr>
                  ) : (
                    clientInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#181B2C]/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#A9ADC6]">
                          {formatDate(inv.issueDate)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#A9ADC6]">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="py-3.5 px-4 text-white">
                          <span className="truncate max-w-[200px] block">
                            {inv.lineItems[0]?.description || 'Service Retainer'}
                            {inv.lineItems.length > 1 && (
                              <span className="text-[10px] text-[#A9ADC6] ml-1">
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
                            <button
                              onClick={() => downloadInvoicePdf(inv, client, getSettings())}
                              className="px-2 py-1 rounded bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/30 font-medium text-[11px] flex items-center gap-1 transition-colors"
                              title="Download Branded PDF"
                            >
                              <Download className="w-3 h-3" />
                              <span>PDF</span>
                            </button>
                            {onEditInvoice && (
                              <button
                                onClick={() => onEditInvoice(inv)}
                                className="p-1 text-[#A9ADC6] hover:text-white"
                                title="Edit Invoice"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteInvoice && (
                              <button
                                onClick={() => onDeleteInvoice(inv.id)}
                                className="p-1 text-[#A9ADC6] hover:text-[#FF5A5F]"
                                title="Delete Invoice"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Client Documents & Legal Records</h3>
              <p className="text-xs text-[#A9ADC6]">
                Track proposal links, signed Master Services Agreement (MSA), payment terms versions, and client assets
              </p>
            </div>
            <button
              onClick={() => setIsDocumentsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-semibold text-white transition-all shadow-sm shrink-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Manage Documents</span>
            </button>
          </div>

          {/* Compliance Alert if active client is missing signed agreement */}
          {client.status === 'Active Client' && !isAgreementSigned && (
            <div className="p-4 rounded-xl bg-[#F5A524]/10 border border-[#F5A524]/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F5A524] shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Compliance Alert: No Signed Agreement On File
                </h4>
                <p className="text-xs text-[#A9ADC6] mt-0.5">
                  This account has active services running without a verified signed agreement. Click "Manage Documents" to update the e-signature status or upload the signed contract URL.
                </p>
              </div>
              <button
                onClick={() => setIsDocumentsModalOpen(true)}
                className="px-3 py-1 rounded-lg bg-[#F5A524]/20 hover:bg-[#F5A524]/30 text-[#F5A524] text-xs font-semibold border border-[#F5A524]/40 shrink-0 transition-colors"
              >
                Update Agreement
              </button>
            </div>
          )}

          {/* Core Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Proposal Card */}
            <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-[#22D3EE]" />
                    <span>Proposal</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      client.documents?.proposal?.acceptedDate
                        ? 'bg-[#7CFF6B]/15 text-[#7CFF6B]'
                        : client.documents?.proposal?.sentDate
                        ? 'bg-[#22D3EE]/15 text-[#22D3EE]'
                        : 'bg-[#A9ADC6]/15 text-[#A9ADC6]'
                    }`}
                  >
                    {client.documents?.proposal?.acceptedDate
                      ? 'Accepted'
                      : client.documents?.proposal?.sentDate
                      ? 'Sent'
                      : 'Not Sent'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#A9ADC6]">
                    <span>Sent Date:</span>
                    <span className="font-mono text-white">
                      {client.documents?.proposal?.sentDate
                        ? formatDate(client.documents.proposal.sentDate)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A9ADC6]">
                    <span>Accepted Date:</span>
                    <span className="font-mono text-white">
                      {client.documents?.proposal?.acceptedDate
                        ? formatDate(client.documents.proposal.acceptedDate)
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {client.documents?.proposal?.link ? (
                  <a
                    href={client.documents.proposal.link}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-[#181A2A] hover:bg-[#22D3EE]/10 border border-[#262A40] hover:border-[#22D3EE]/40 text-xs font-medium text-[#22D3EE] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>View Proposal File</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    onClick={() => setIsDocumentsModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl bg-[#181A2A] hover:bg-white/5 border border-dashed border-[#262A40] text-xs text-[#A9ADC6] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>+ Add Proposal Link</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Agreement Card */}
            <div
              className={`p-5 rounded-2xl bg-[#11131F] border flex flex-col justify-between space-y-4 ${
                isAgreementSigned ? 'border-[#7CFF6B]/30' : 'border-[#F5A524]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <ShieldCheck
                      className={`w-4 h-4 ${isAgreementSigned ? 'text-[#7CFF6B]' : 'text-[#F5A524]'}`}
                    />
                    <span>Agreement (MSA)</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      isAgreementSigned
                        ? 'bg-[#7CFF6B]/15 text-[#7CFF6B]'
                        : 'bg-[#F5A524]/15 text-[#F5A524]'
                    }`}
                  >
                    {client.documents?.agreement?.eSignStatus || 'Not Sent'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#A9ADC6]">
                    <span>E-Sign Status:</span>
                    <span className="font-semibold text-white">
                      {client.documents?.agreement?.eSignStatus || 'Not Sent'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A9ADC6]">
                    <span>Signed Date:</span>
                    <span className="font-mono text-white">
                      {client.documents?.agreement?.signedDate
                        ? formatDate(client.documents.agreement.signedDate)
                        : 'Pending Signature'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                {client.documents?.agreement?.link ? (
                  <a
                    href={client.documents.agreement.link}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-[#181A2A] hover:bg-[#7CFF6B]/10 border border-[#262A40] hover:border-[#7CFF6B]/40 text-xs font-medium text-[#7CFF6B] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>View Agreement</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    onClick={() => setIsDocumentsModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl bg-[#181A2A] hover:bg-white/5 border border-dashed border-[#262A40] text-xs text-[#A9ADC6] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>+ Add Agreement Link</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Payment Terms Card */}
            <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <Calendar className="w-4 h-4 text-[#3D5AFE]" />
                    <span>Payment Terms</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3D5AFE]/15 text-[#3D5AFE] font-semibold">
                    Policy
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[#A9ADC6] block text-[11px]">Version:</span>
                    <span className="font-mono font-bold text-white">
                      {client.documents?.paymentTermsVersion || 'DD-Standard Net 15 v2026.1'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A9ADC6] block text-[11px]">Summary:</span>
                    <p className="text-white text-[11px] leading-relaxed">
                      {client.documents?.paymentTermsSummary ||
                        'Net 15 - Automated ACH via Stripe on the 1st of every month.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setIsDocumentsModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[#181A2A] hover:bg-white/5 border border-[#262A40] text-xs font-medium text-[#A9ADC6] hover:text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Terms Policy</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Additional File Links */}
          <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-[#F5A524]" />
                  <span>Additional Client Files & External Links</span>
                </h4>
                <p className="text-xs text-[#A9ADC6] mt-0.5">
                  Brand asset folders, photo drives, credential vaults, and client briefs
                </p>
              </div>
              <button
                onClick={() => setIsDocumentsModalOpen(true)}
                className="flex items-center gap-1 text-xs text-[#22D3EE] hover:underline"
              >
                <Plus className="w-3 h-3" />
                <span>Add Link</span>
              </button>
            </div>

            {(!client.documents?.fileLinks || client.documents.fileLinks.length === 0) ? (
              <div className="py-6 text-center text-xs text-[#A9ADC6] italic border border-dashed border-[#262A40] rounded-xl">
                No additional file links saved yet. Click "Add Link" to attach Google Drive, Dropbox, or Figma links.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {client.documents.fileLinks.map((fl) => (
                  <div
                    key={fl.id}
                    className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] flex items-center justify-between gap-3 hover:border-[#22D3EE]/40 transition-colors"
                  >
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#181A2A] text-[#A9ADC6] border border-[#262A40]">
                          {fl.category || 'File'}
                        </span>
                        <span className="font-semibold text-white text-xs truncate">
                          {fl.title}
                        </span>
                      </div>
                      {fl.addedDate && (
                        <span className="text-[10px] text-[#A9ADC6] font-mono mt-0.5 block">
                          Added {formatDate(fl.addedDate)}
                        </span>
                      )}
                    </div>
                    <a
                      href={fl.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-[#181A2A] hover:bg-[#22D3EE]/20 text-[#22D3EE] transition-colors shrink-0"
                      title="Open Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CHECKLISTS TAB */}
      {activeTab === 'checklists' && (
        <ClientChecklistsTab
          client={client}
          clientServices={clientServices}
          checklists={checklists}
          templates={checklistTemplates}
          onToggleItem={(chkId, itemId) => onToggleChecklistItem?.(chkId, itemId)}
          onAddItem={(chkId, label) => onAddChecklistItem?.(chkId, label)}
          onDeleteItem={(chkId, itemId) => onDeleteChecklistItem?.(chkId, itemId)}
          onDeleteChecklist={(chkId) => onDeleteChecklist?.(chkId)}
          onCreateFromTemplate={(cId, tId, sId, title) =>
            onCreateChecklistFromTemplate?.(cId, tId, sId, title)
          }
        />
      )}

      {/* 4. PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Website Build Projects</h3>
              <p className="text-xs text-[#A9ADC6]">
                Design stages, mockups, deposits and launch deadlines
              </p>
            </div>
            <button
              onClick={onOpenNewProject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
          </div>

          {clientProjects.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#11131F] border border-[#262A40] space-y-3">
              <FolderGit2 className="w-8 h-8 mx-auto text-[#262A40]" />
              <p className="text-sm font-medium text-white">No build projects currently active.</p>
              <p className="text-xs text-[#A9ADC6]">
                Create a project to track landing page or multi-page build stages.
              </p>
              <button
                onClick={onOpenNewProject}
                className="px-4 py-2 rounded-lg bg-[#3D5AFE] text-xs font-medium text-white inline-block"
              >
                Create Build Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{proj.name}</h4>
                      <div className="mt-1">
                        <StatusBadge status={proj.stage} size="sm" />
                      </div>
                    </div>
                    <button
                      onClick={() => onEditProject(proj)}
                      className="p-1.5 rounded text-[#A9ADC6] hover:text-white hover:bg-[#181B2C]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] text-xs font-mono grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[#A9ADC6] text-[10px] block">Mockup Due:</span>
                      <span className="text-white">{formatDate(proj.mockupDue)}</span>
                    </div>
                    <div>
                      <span className="text-[#A9ADC6] text-[10px] block">Target Launch:</span>
                      <span className="text-[#22D3EE]">{formatDate(proj.targetLaunch)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span
                      className={`flex items-center gap-1 ${
                        proj.depositPaid ? 'text-[#7CFF6B]' : 'text-[#A9ADC6]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Deposit Paid
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        proj.finalPaid ? 'text-[#7CFF6B]' : 'text-[#A9ADC6]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Final Paid
                    </span>
                  </div>

                  {(proj.previewLink || proj.liveLink) && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      {proj.previewLink && (
                        <a
                          href={proj.previewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#22D3EE] hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Preview
                        </a>
                      )}
                      {proj.liveLink && (
                        <a
                          href={proj.liveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#7CFF6B] hover:underline flex items-center gap-1 ml-2"
                        >
                          <ExternalLink className="w-3 h-3" /> Live Site
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Client Action Items</h3>
              <p className="text-xs text-[#A9ADC6]">Deliverables, reports & client-specific reminders</p>
            </div>
            <button
              onClick={onOpenNewTask}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          <div className="space-y-2">
            {clientTasks.length === 0 ? (
              <p className="p-8 text-center text-xs text-[#A9ADC6] italic bg-[#11131F] rounded-xl border border-[#262A40]">
                No pending tasks assigned to this client.
              </p>
            ) : (
              clientTasks.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                    t.done
                      ? 'bg-[#11131F]/40 border-[#262A40]/40 opacity-60'
                      : 'bg-[#11131F] border-[#262A40] hover:border-[#22D3EE]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleTask(t.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        t.done
                          ? 'bg-[#7CFF6B] border-[#7CFF6B] text-[#07080F]'
                          : 'border-[#262A40] hover:border-[#7CFF6B]'
                      }`}
                    >
                      {t.done && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                    <div>
                      <p
                        className={`text-xs font-medium ${
                          t.done ? 'line-through text-[#A9ADC6]' : 'text-white'
                        }`}
                      >
                        {t.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#A9ADC6] mt-0.5">
                        <span className="font-mono">Due: {formatDate(t.dueDate)}</span>
                        <span>·</span>
                        <StatusBadge status={t.priority} size="sm" />
                        <span>·</span>
                        <span>{t.type}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteTask(t.id)}
                    className="p-1 text-[#A9ADC6] hover:text-[#FF5A5F]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6. TIMELINE / ACTIVITY TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Client Activity Timeline</h3>
              <p className="text-xs text-[#A9ADC6]">
                Automated logs of status changes, payments, services, and communication records
              </p>
            </div>
            <button
              onClick={onOpenLogActivity}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Interaction</span>
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-6">
            {clientActivities.length === 0 ? (
              <p className="text-xs text-[#A9ADC6] italic text-center py-6">
                No activity logged yet for this account.
              </p>
            ) : (
              clientActivities.map((act) => (
                <div key={act.id} className="relative flex items-start gap-3.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] mt-1 shrink-0 shadow-sm shadow-[#22D3EE]" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{act.title}</span>
                      <span className="text-[10px] text-[#A9ADC6] font-mono">
                        {formatDate(act.timestamp)}
                      </span>
                    </div>
                    {act.description && (
                      <p className="text-[#A9ADC6] mt-1 leading-relaxed">{act.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 7. NOTES TAB */}
      {activeTab === 'notes' && (
        <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Account Notes & Strategy</h3>
              <p className="text-xs text-[#A9ADC6]">
                Long-form client history, preferences, proposals & goals
              </p>
            </div>
            <button
              onClick={handleSaveNotesClick}
              className="px-4 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
            >
              Save Notes
            </button>
          </div>

          <textarea
            rows={10}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Type comprehensive notes for this client..."
            className="w-full p-4 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-xl text-sm text-white placeholder-[#A9ADC6]/40 leading-relaxed font-sans"
          />
        </div>
      )}

      {/* Client Documents Edit Modal */}
      <ClientDocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        client={client}
        onSave={async (docs) => {
          if (onSaveDocuments) {
            await onSaveDocuments(docs);
          }
          toast('Client documents updated successfully');
        }}
      />
    </div>
  );
}
