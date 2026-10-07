import React, { useState, useEffect } from 'react';
import {
  loadDatabase,
  subscribeToDb,
  subscribeToSyncStatus,
  initializeFirestoreSync,
  cleanupFirestoreSync,
  SyncState,
  saveClient,
  archiveClient,
  restoreClient,
  saveCatalogItem,
  deleteCatalogItem,
  saveClientService,
  renewClientService,
  convertToMonthToMonth,
  deleteClientService,
  savePayment,
  deletePayment,
  saveProject,
  deleteProject,
  saveTask,
  toggleTaskDone,
  deleteTask,
  saveExpense,
  deleteExpense,
  saveInvoice,
  deleteInvoice,
  getNextInvoiceNumber,
  saveChecklist,
  deleteChecklist,
  toggleChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
  createChecklistFromTemplate,
  spawnChecklistsForService,
  saveChecklistTemplate,
  deleteChecklistTemplate,
  resetDefaultChecklistTemplates,
  logActivity,
  saveSettings,
  runAutomatedTaskChecks,
  exportAllDataJson,
  importAllDataJson,
  exportClientsCsv,
  clearSampleData,
  restoreSampleData,
  migrateLocalStorageToFirestore,
  isQuotaExceededNotice,
  dismissQuotaNotice,
  savePerformanceEntry,
  deletePerformanceEntry,
  saveWebsite,
  deleteWebsite,
} from './lib/db';
import { AlertTriangle } from 'lucide-react';
import {
  Client,
  ServiceCatalogItem,
  ClientService,
  Payment,
  Project,
  Task,
  ActivityLog,
  AppSettings,
  ClientStatus,
  ProjectStage,
  ServiceStatus,
  Expense,
  ExpenseCategory,
  Invoice,
  ClientDocuments,
  ClientChecklist,
  ChecklistTemplate,
} from './types';
import { getAgencyMetrics, isClientOverdue } from './lib/calculations';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { PinLockScreen } from './components/PinLockScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { AccessDeniedScreen } from './components/auth/AccessDeniedScreen';

// Views
import { DashboardView } from './components/views/DashboardView';
import { ClientsView } from './components/views/ClientsView';
import { ClientProfileView } from './components/views/ClientProfileView';
import { PipelineView } from './components/views/PipelineView';
import { ProjectsView } from './components/views/ProjectsView';
import { BillingView } from './components/views/BillingView';
import { ExpensesView } from './components/views/ExpensesView';
import { RenewalsView } from './components/views/RenewalsView';
import { TasksView } from './components/views/TasksView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

// Modals
import { ClientModal } from './components/modals/ClientModal';
import { ServiceModal } from './components/modals/ServiceModal';
import { PaymentModal } from './components/modals/PaymentModal';
import { ProjectModal } from './components/modals/ProjectModal';
import { TaskModal } from './components/modals/TaskModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { ActivityModal } from './components/modals/ActivityModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { ConfirmationModal } from './components/modals/ConfirmationModal';

function CRMContent() {
  const { toast } = useToast();
  const { user, loading, isAllowedOwner, logout } = useAuth();

  // Database reactive state
  const [dbData, setDbData] = useState(() => loadDatabase());
  const [syncStatus, setSyncStatus] = useState<SyncState>('saved');
  const [isQuickLocked, setIsQuickLocked] = useState(false);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modal triggers & editing state
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [defaultNewClientStatus, setDefaultNewClientStatus] = useState<ClientStatus>('Active Client');

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ClientService | null>(null);
  const [preselectedClientIdForService, setPreselectedClientIdForService] = useState<string | undefined>();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [preselectedClientIdForPayment, setPreselectedClientIdForPayment] = useState<string | undefined>();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [preselectedClientIdForProject, setPreselectedClientIdForProject] = useState<string | undefined>();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [preselectedClientIdForTask, setPreselectedClientIdForTask] = useState<string | undefined>();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [preselectedClientIdForExpense, setPreselectedClientIdForExpense] = useState<string | undefined>();

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [preselectedClientIdForInvoice, setPreselectedClientIdForInvoice] = useState<string | undefined>();

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityClientId, setActivityClientId] = useState<string | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  // Subscribe to DB and Sync status
  useEffect(() => {
    const unsubDb = subscribeToDb(() => {
      setDbData(loadDatabase());
    });
    const unsubSync = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => {
      unsubDb();
      unsubSync();
    };
  }, []);

  // When user logs in as allowed owner, initialize Firestore real-time listeners
  useEffect(() => {
    if (user && isAllowedOwner) {
      const unsub = initializeFirestoreSync();
      // Run automated task checks
      setTimeout(() => runAutomatedTaskChecks(), 2500);
      return unsub;
    } else {
      cleanupFirestoreSync();
    }
  }, [user, isAllowedOwner]);

  // Global Keyboard Shortcuts (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080F]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#11131F] border border-[#262A40] flex items-center justify-center animate-pulse">
            <span className="font-mono text-sm font-bold text-[#22D3EE]">DD</span>
          </div>
          <span className="font-mono text-xs text-[#A9ADC6] tracking-wider uppercase">
            Loading Dynasty Digital CRM...
          </span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Login Screen with Google
  if (!user) {
    return <LoginScreen />;
  }

  // 3. Authenticated but NOT the allowed owner -> Access Denied Screen
  if (!isAllowedOwner) {
    return <AccessDeniedScreen />;
  }

  const {
    clients,
    catalog,
    clientServices,
    payments,
    invoices = [],
    projects,
    tasks,
    activities,
    expenses = [],
    checklists = [],
    checklistTemplates = [],
    performanceEntries = [],
    websites = [],
    settings,
  } = dbData;

  // Active client object if profile view open
  const activeClient = selectedClientId ? clients.find((c) => c.id === selectedClientId) : null;

  // Calculations
  const metrics = getAgencyMetrics(clients, clientServices, payments, expenses);
  const overdueCount = clients.filter(
    (c) => !c.archived && isClientOverdue(c, clientServices, payments)
  ).length;
  const openTasksCount = tasks.filter((t) => !t.done).length;

  // 1-Click "Mark as Paid" action
  const handleQuickMarkPaid = async (service: ClientService, monthKey?: string) => {
    const dateStr = monthKey
      ? `${monthKey}-${String(service.billingDayOfMonth || 1).padStart(2, '0')}`
      : new Date().toISOString().split('T')[0];

    try {
      await savePayment({
        clientId: service.clientId,
        clientServiceId: service.id,
        amount: service.price,
        date: dateStr,
        method: 'Card/Stripe',
        type: 'Monthly',
        status: 'Paid',
        invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        notes: `Reconciled retainer for ${service.customName}`,
      });
      toast(`Logged payment: ${service.customName} ($${service.price}) marked Paid`);
    } catch (err) {
      toast('Failed to record payment', 'error');
    }
  };

  // Renew Service
  const handleRenewService = async (serviceId: string, months: number) => {
    try {
      const renewed = await renewClientService(serviceId, months);
      if (renewed) {
        toast(`Contract extended by ${months} months (Commitment until ${renewed.endDate})`);
      }
    } catch (e) {
      toast('Failed to renew service', 'error');
    }
  };

  // Convert to Month-to-month
  const handleConvertToMonthToMonth = async (serviceId: string) => {
    try {
      const converted = await convertToMonthToMonth(serviceId);
      if (converted) {
        toast(`Service converted to rolling month-to-month retainer`);
      }
    } catch (e) {
      toast('Failed to convert service', 'error');
    }
  };

  // Change Service Status
  const handleChangeServiceStatus = async (serviceId: string, newStatus: ServiceStatus) => {
    const s = clientServices.find((item) => item.id === serviceId);
    if (s) {
      await saveClientService({ ...s, status: newStatus });
      toast(`Service status changed to ${newStatus}`);
    }
  };

  // Client Archive confirmation
  const handleArchiveClient = (clientId: string) => {
    const c = clients.find((item) => item.id === clientId);
    setConfirmState({
      isOpen: true,
      title: `Archive ${c?.businessName || 'Client'}?`,
      message: `The client will be moved to archived records and hidden from active views. You can restore them anytime.`,
      confirmLabel: 'Archive Client',
      action: async () => {
        await archiveClient(clientId);
        toast(`Client archived`);
        if (selectedClientId === clientId) {
          setSelectedClientId(null);
        }
      },
    });
  };

  const handleRestoreClient = async (clientId: string) => {
    await restoreClient(clientId);
    toast(`Client restored from archive`);
  };

  // Expenses management handlers
  const handleSaveExpense = async (
    expenseData: Partial<Expense> & { vendor: string; amount: number; category: ExpenseCategory }
  ) => {
    try {
      await saveExpense(expenseData);
      toast(expenseData.id ? 'Expense updated' : 'Operating expense logged');
    } catch (e) {
      toast('Failed to record expense', 'error');
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    const exp = expenses.find((item) => item.id === expenseId);
    setConfirmState({
      isOpen: true,
      title: `Delete Expense?`,
      message: `Are you sure you want to remove "${exp?.vendor || 'this expense'}" ($${exp?.amount})? This operation cannot be reversed.`,
      confirmLabel: 'Delete Expense',
      action: async () => {
        await deleteExpense(expenseId);
        toast('Expense entry deleted');
      },
    });
  };

  // LocalStorage to Firestore Migration
  const handleMigrateLocalStorage = async () => {
    try {
      const result = await migrateLocalStorageToFirestore();
      toast(
        `Migration complete! Transferred ${result.clients} clients, ${result.services} services & ${result.payments} payments to Firestore.`
      );
    } catch (err: any) {
      console.error(err);
      toast('Migration failed: ' + (err?.message || 'Check connection'), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#07080F] text-[#FFFFFF] flex">
      {/* Optional Quick-Lock PIN Screen after sign-in */}
      {isQuickLocked && (
        <PinLockScreen
          correctPin={settings.pinCode || '1234'}
          agencyName={settings.agencyName || 'Dynasty Digital'}
          onUnlock={() => setIsQuickLocked(false)}
        />
      )}

      {/* Left Sidebar with Sync Status */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedClientId(null);
        }}
        mrr={metrics.totalMRR}
        openTasksCount={openTasksCount}
        overdueCount={overdueCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLock={() => setIsQuickLocked(true)}
        syncStatus={syncStatus}
        userEmail={user.email}
        onSignOut={logout}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenGlobalSearch={() => setIsSearchModalOpen(true)}
          onOpenNewClient={(status = 'Active Client') => {
            setEditingClient(null);
            setDefaultNewClientStatus(status);
            setIsClientModalOpen(true);
          }}
          onOpenNewPayment={() => {
            setEditingPayment(null);
            setPreselectedClientIdForPayment(selectedClientId || undefined);
            setIsPaymentModalOpen(true);
          }}
          onOpenNewService={() => {
            setEditingService(null);
            setPreselectedClientIdForService(selectedClientId || undefined);
            setIsServiceModalOpen(true);
          }}
          onOpenNewTask={() => {
            setEditingTask(null);
            setPreselectedClientIdForTask(selectedClientId || undefined);
            setIsTaskModalOpen(true);
          }}
          onOpenNewProject={() => {
            setEditingProject(null);
            setPreselectedClientIdForProject(selectedClientId || undefined);
            setIsProjectModalOpen(true);
          }}
          onOpenNewExpense={() => {
            setEditingExpense(null);
            setPreselectedClientIdForExpense(selectedClientId || undefined);
            setIsExpenseModalOpen(true);
          }}
        />

        {/* Quota Notice Banner */}
        {(syncStatus === 'quota-exceeded' || isQuotaExceededNotice()) && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-amber-200 text-xs sm:text-sm">
                  Firebase Quota Limit Reached (Daily Free Tier) • Local Storage Active
                </p>
                <p className="text-[#A9ADC6] text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                  Dynasty CRM is operating smoothly in local offline storage mode. All client records, checklists, services, and invoices are saved securely in your browser and will automatically re-sync when your daily cloud quota resets.
                </p>
              </div>
            </div>
            <button
              onClick={() => dismissQuotaNotice()}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium shrink-0 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* If a client is selected, show ClientProfileView */}
          {activeClient ? (
            <ClientProfileView
              client={activeClient}
              clientServices={clientServices.filter((s) => s.clientId === activeClient.id)}
              payments={payments.filter((p) => p.clientId === activeClient.id)}
              invoices={invoices.filter((i) => i.clientId === activeClient.id)}
              projects={projects.filter((p) => p.clientId === activeClient.id)}
              tasks={tasks.filter((t) => t.clientId === activeClient.id)}
              activities={activities.filter((a) => a.clientId === activeClient.id)}
              checklists={checklists.filter((c) => c.clientId === activeClient.id)}
              checklistTemplates={checklistTemplates}
              expenses={expenses}
              onBack={() => setSelectedClientId(null)}
              onEditClient={() => {
                setEditingClient(activeClient);
                setIsClientModalOpen(true);
              }}
              onOpenNewService={() => {
                setEditingService(null);
                setPreselectedClientIdForService(activeClient.id);
                setIsServiceModalOpen(true);
              }}
              onEditService={(srv) => {
                setEditingService(srv);
                setPreselectedClientIdForService(activeClient.id);
                setIsServiceModalOpen(true);
              }}
              onRenewService={handleRenewService}
              onConvertToMonthToMonth={handleConvertToMonthToMonth}
              onChangeServiceStatus={handleChangeServiceStatus}
              onDeleteService={async (srvId) => {
                await deleteClientService(srvId);
                toast('Service deleted');
              }}
              onOpenNewPayment={() => {
                setEditingPayment(null);
                setPreselectedClientIdForPayment(activeClient.id);
                setIsPaymentModalOpen(true);
              }}
              onEditPayment={(pay) => {
                setEditingPayment(pay);
                setPreselectedClientIdForPayment(activeClient.id);
                setIsPaymentModalOpen(true);
              }}
              onDeletePayment={async (payId) => {
                await deletePayment(payId);
                toast('Payment record removed');
              }}
              onOpenNewProject={() => {
                setEditingProject(null);
                setPreselectedClientIdForProject(activeClient.id);
                setIsProjectModalOpen(true);
              }}
              onEditProject={(proj) => {
                setEditingProject(proj);
                setPreselectedClientIdForProject(activeClient.id);
                setIsProjectModalOpen(true);
              }}
              onOpenNewTask={() => {
                setEditingTask(null);
                setPreselectedClientIdForTask(activeClient.id);
                setIsTaskModalOpen(true);
              }}
              onToggleTask={(tId) => toggleTaskDone(tId)}
              onDeleteTask={async (tId) => {
                await deleteTask(tId);
                toast('Task deleted');
              }}
              onOpenLogActivity={() => {
                setActivityClientId(activeClient.id);
                setIsActivityModalOpen(true);
              }}
              onSaveNotes={async (newNotes) => {
                await saveClient({ ...activeClient, notes: newNotes });
              }}
              onOpenNewExpense={(clientId) => {
                setEditingExpense(null);
                setPreselectedClientIdForExpense(clientId);
                setIsExpenseModalOpen(true);
              }}
              onOpenNewInvoice={(clientId) => {
                setEditingInvoice(null);
                setPreselectedClientIdForInvoice(clientId);
                setIsInvoiceModalOpen(true);
              }}
              onEditInvoice={(inv) => {
                setEditingInvoice(inv);
                setPreselectedClientIdForInvoice(inv.clientId);
                setIsInvoiceModalOpen(true);
              }}
              onDeleteInvoice={async (invId) => {
                await deleteInvoice(invId);
                toast('Invoice removed');
              }}
              onSaveDocuments={async (docs) => {
                await saveClient({ ...activeClient, documents: docs });
                toast('Client documents updated');
              }}
              onToggleChecklistItem={async (chkId, itemId) => {
                await toggleChecklistItem(chkId, itemId);
              }}
              onAddChecklistItem={async (chkId, label) => {
                await addChecklistItem(chkId, label);
                toast('Step added to checklist');
              }}
              onDeleteChecklistItem={async (chkId, itemId) => {
                await deleteChecklistItem(chkId, itemId);
              }}
              onDeleteChecklist={async (chkId) => {
                await deleteChecklist(chkId);
                toast('Checklist deleted');
              }}
              onCreateChecklistFromTemplate={async (cId, tId, sId, title) => {
                await createChecklistFromTemplate(cId, tId, sId, title);
                toast('Checklist generated from template');
              }}
              performanceEntries={performanceEntries.filter((p) => p.clientId === activeClient.id)}
              settings={settings}
              onSavePerformanceEntry={async (entry) => {
                const saved = await savePerformanceEntry(entry);
                return saved;
              }}
              onDeletePerformanceEntry={async (id) => {
                await deletePerformanceEntry(id);
              }}
              websites={websites.filter((w) => w.clientId === activeClient.id)}
              onSaveWebsite={async (w) => {
                const saved = await saveWebsite(w);
                toast('Website infrastructure saved');
                return saved;
              }}
              onDeleteWebsite={async (id) => {
                await deleteWebsite(id);
                toast('Website record removed');
              }}
            />
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  clients={clients}
                  clientServices={clientServices}
                  payments={payments}
                  tasks={tasks}
                  expenses={expenses}
                  checklists={checklists}
                  websites={websites}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                  onNavigateTab={(tab) => setCurrentTab(tab)}
                  onToggleTask={(tId) => toggleTaskDone(tId)}
                  onQuickMarkPaid={handleQuickMarkPaid}
                />
              )}

              {currentTab === 'clients' && (
                <ClientsView
                  clients={clients}
                  clientServices={clientServices}
                  payments={payments}
                  checklists={checklists}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                  onOpenNewClient={() => {
                    setEditingClient(null);
                    setDefaultNewClientStatus('Active Client');
                    setIsClientModalOpen(true);
                  }}
                  onArchiveClient={handleArchiveClient}
                  onRestoreClient={handleRestoreClient}
                />
              )}

              {currentTab === 'pipeline' && (
                <PipelineView
                  clients={clients}
                  clientServices={clientServices}
                  checklists={checklists}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                  onOpenNewClient={(st) => {
                    setEditingClient(null);
                    setDefaultNewClientStatus(st);
                    setIsClientModalOpen(true);
                  }}
                  onChangeClientStatus={async (cId, newStatus) => {
                    const c = clients.find((item) => item.id === cId);
                    if (c) {
                      await saveClient({ ...c, status: newStatus });
                      toast(`Moved ${c.businessName} to ${newStatus}`);
                    }
                  }}
                />
              )}

              {currentTab === 'projects' && (
                <ProjectsView
                  projects={projects}
                  clients={clients}
                  checklists={checklists}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                  onOpenNewProject={() => {
                    setEditingProject(null);
                    setPreselectedClientIdForProject(undefined);
                    setIsProjectModalOpen(true);
                  }}
                  onEditProject={(proj) => {
                    setEditingProject(proj);
                    setPreselectedClientIdForProject(proj.clientId);
                    setIsProjectModalOpen(true);
                  }}
                  onDeleteProject={async (projId) => {
                    await deleteProject(projId);
                    toast('Project removed');
                  }}
                  onChangeProjectStage={async (projId, newStage) => {
                    const p = projects.find((item) => item.id === projId);
                    if (p) {
                      await saveProject({ ...p, stage: newStage });
                      toast(`Project moved to stage ${newStage}`);
                    }
                  }}
                  onTogglePaymentFlag={async (projId, field) => {
                    const p = projects.find((item) => item.id === projId);
                    if (p) {
                      const updated = { ...p, [field]: !p[field] };
                      await saveProject(updated);
                      toast(`Updated ${field === 'depositPaid' ? 'deposit' : 'final payment'} flag`);
                    }
                  }}
                />
              )}

              {currentTab === 'billing' && (
                <BillingView
                  clients={clients}
                  clientServices={clientServices}
                  payments={payments}
                  invoices={invoices}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                  onQuickMarkPaid={handleQuickMarkPaid}
                  onOpenNewPayment={() => {
                    setEditingPayment(null);
                    setPreselectedClientIdForPayment(undefined);
                    setIsPaymentModalOpen(true);
                  }}
                  onOpenNewInvoice={(clientId) => {
                    setEditingInvoice(null);
                    setPreselectedClientIdForInvoice(clientId);
                    setIsInvoiceModalOpen(true);
                  }}
                  onEditInvoice={(inv) => {
                    setEditingInvoice(inv);
                    setPreselectedClientIdForInvoice(inv.clientId);
                    setIsInvoiceModalOpen(true);
                  }}
                  onDeleteInvoice={async (invId) => {
                    await deleteInvoice(invId);
                    toast('Invoice deleted');
                  }}
                />
              )}

              {currentTab === 'expenses' && (
                <ExpensesView
                  expenses={expenses}
                  clients={clients}
                  payments={payments}
                  onOpenNewExpense={(clientId) => {
                    setEditingExpense(null);
                    setPreselectedClientIdForExpense(clientId);
                    setIsExpenseModalOpen(true);
                  }}
                  onEditExpense={(expense) => {
                    setEditingExpense(expense);
                    setPreselectedClientIdForExpense(expense.clientId);
                    setIsExpenseModalOpen(true);
                  }}
                  onDeleteExpense={handleDeleteExpense}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                />
              )}

              {currentTab === 'renewals' && (
                <RenewalsView
                  clientServices={clientServices}
                  clients={clients}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                  onRenewService={handleRenewService}
                  onConvertToMonthToMonth={handleConvertToMonthToMonth}
                  onCancelService={async (srvId) => {
                    await handleChangeServiceStatus(srvId, 'Cancelled');
                  }}
                />
              )}

              {currentTab === 'tasks' && (
                <TasksView
                  tasks={tasks}
                  clients={clients}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                  onOpenNewTask={() => {
                    setEditingTask(null);
                    setPreselectedClientIdForTask(undefined);
                    setIsTaskModalOpen(true);
                  }}
                  onToggleTask={(tId) => toggleTaskDone(tId)}
                  onDeleteTask={async (tId) => {
                    await deleteTask(tId);
                    toast('Task removed');
                  }}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView
                  clients={clients}
                  clientServices={clientServices}
                  payments={payments}
                  expenses={expenses}
                  onSelectClient={(cId) => setSelectedClientId(cId)}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  catalog={catalog}
                  checklistTemplates={checklistTemplates}
                  onSaveSettings={(s) => saveSettings(s)}
                  onSaveCatalogItem={(item) => saveCatalogItem(item)}
                  onDeleteCatalogItem={(id) => deleteCatalogItem(id)}
                  onSaveChecklistTemplate={async (tmpl) => {
                    await saveChecklistTemplate(tmpl);
                  }}
                  onDeleteChecklistTemplate={async (id) => {
                    await deleteChecklistTemplate(id);
                  }}
                  onResetDefaultChecklistTemplates={async () => {
                    await resetDefaultChecklistTemplates();
                  }}
                  onExportJson={exportAllDataJson}
                  onImportJson={importAllDataJson}
                  onExportCsv={exportClientsCsv}
                  onMigrateLocalStorage={handleMigrateLocalStorage}
                  onClearSampleData={clearSampleData}
                  onRestoreSampleData={restoreSampleData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}

      {/* 1. Client Modal */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        initialData={editingClient}
        defaultStatus={defaultNewClientStatus}
        onSave={async (clientData) => {
          const saved = await saveClient(clientData);
          toast(editingClient ? 'Client updated' : 'New client added');
          if (!editingClient) {
            setSelectedClientId(saved.id);
          }
        }}
      />

      {/* 2. Service Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        clients={clients}
        catalog={catalog}
        preselectedClientId={preselectedClientIdForService}
        initialData={editingService}
        onSave={async (srvData) => {
          const saved = await saveClientService(srvData);
          if (!editingService) {
            await spawnChecklistsForService(saved);
            toast('Service attached & delivery checklist spawned from template');
          } else {
            toast('Service updated');
          }
        }}
      />

      {/* 3. Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        clients={clients}
        clientServices={clientServices}
        preselectedClientId={preselectedClientIdForPayment}
        initialData={editingPayment}
        onSave={async (payData) => {
          await savePayment(payData);
          toast(editingPayment ? 'Payment updated' : 'Payment recorded');
        }}
      />

      {/* 4. Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        clients={clients}
        preselectedClientId={preselectedClientIdForProject}
        initialData={editingProject}
        onSave={async (projData) => {
          await saveProject(projData);
          toast(editingProject ? 'Project updated' : 'New project created');
        }}
      />

      {/* 5. Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        clients={clients}
        preselectedClientId={preselectedClientIdForTask}
        initialData={editingTask}
        onSave={async (tData) => {
          await saveTask(tData);
          toast(editingTask ? 'Task updated' : 'Task created');
        }}
      />

      {/* 5b. Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        clients={clients}
        preselectedClientId={preselectedClientIdForExpense}
        initialExpense={editingExpense}
        onSave={handleSaveExpense}
      />

      {/* 5c. Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        clients={clients}
        clientServices={clientServices}
        settings={settings}
        preselectedClientId={preselectedClientIdForInvoice}
        initialInvoice={editingInvoice}
        onSave={async (invData) => {
          await saveInvoice(invData);
          toast(editingInvoice ? 'Invoice updated' : 'Branded invoice generated');
        }}
      />

      {/* 6. Activity Modal */}
      {isActivityModalOpen && activityClientId && (
        <ActivityModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
          clientName={clients.find((c) => c.id === activityClientId)?.businessName || 'Client'}
          onSave={async (type, title, description) => {
            await logActivity(activityClientId, type, title, description);
            toast('Interaction logged to timeline');
          }}
        />
      )}

      {/* 7. Global Search Modal (⌘K) */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        clients={clients}
        clientServices={clientServices}
        payments={payments}
        onSelectClient={(cId) => {
          setSelectedClientId(cId);
        }}
      />

      {/* 8. Confirmation Dialog */}
      <ConfirmationModal
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.action}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <CRMContent />
      </ToastProvider>
    </AuthProvider>
  );
}
