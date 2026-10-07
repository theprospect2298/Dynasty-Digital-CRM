import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import {
  Client,
  ServiceCatalogItem,
  ClientService,
  Payment,
  Project,
  Task,
  ActivityLog,
  AppSettings,
  FullDatabase,
  ActivityType,
  Expense,
  ExpenseCategory,
  Invoice,
  ChecklistTemplate,
  ClientChecklist,
  ClientChecklistItem,
  ClientPerformanceEntry,
  ClientWebsite,
  IncomingLeadPayload,
} from '../types';
import { db, handleFirestoreError, OperationType, auth, ALLOWED_OWNER_EMAIL, isQuotaExceededError } from './firebase';
import {
  getInitialDatabase,
  DEFAULT_SETTINGS,
  DEFAULT_CATALOG,
  DEFAULT_CHECKLIST_TEMPLATES,
  SAMPLE_PERFORMANCE_ENTRIES,
  SAMPLE_WEBSITES,
} from './sampleData';

const LOCAL_STORAGE_KEY = 'dynasty_digital_crm_v1';

// In-memory store synchronized with Firestore in real-time
let currentDb: FullDatabase = {
  clients: [],
  catalog: DEFAULT_CATALOG,
  clientServices: [],
  payments: [],
  invoices: [],
  projects: [],
  tasks: [],
  activities: [],
  expenses: [],
  checklists: [],
  checklistTemplates: DEFAULT_CHECKLIST_TEMPLATES,
  performanceEntries: SAMPLE_PERFORMANCE_ENTRIES,
  websites: SAMPLE_WEBSITES,
  settings: DEFAULT_SETTINGS,
  version: 1,
};

// Listeners for UI re-renders
const listeners: Set<() => void> = new Set();
// Sync status listeners ('saved' | 'saving' | 'offline' | 'quota-exceeded')
export type SyncState = 'saved' | 'saving' | 'offline' | 'quota-exceeded';
let currentSyncState: SyncState = navigator.onLine ? 'saved' : 'offline';
const syncListeners: Set<(state: SyncState) => void> = new Set();

let quotaExceededNotified = false;
export function isQuotaExceededNotice(): boolean {
  return quotaExceededNotified;
}
export function dismissQuotaNotice(): void {
  quotaExceededNotified = false;
  notifyListeners();
}

function handleDbError(error: unknown, op: OperationType, path: string) {
  if (isQuotaExceededError(error)) {
    console.warn(`Firestore quota limit reached during ${op} on ${path}. Operating in offline persistence mode.`);
    quotaExceededNotified = true;
    setSyncState('quota-exceeded');
    notifyListeners();
    return;
  }
  handleFirestoreError(error, op, path);
}

function handleDbListenerError(error: unknown, collectionName: string) {
  if (isQuotaExceededError(error)) {
    console.warn(`Firestore quota limit reached on ${collectionName}. Operating in offline persistence mode.`);
    quotaExceededNotified = true;
    setSyncState('quota-exceeded');
    notifyListeners();
    return;
  }
  handleFirestoreError(error, OperationType.LIST, collectionName);
}

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Error in DB subscriber:', e);
    }
  });
}

export function subscribeToDb(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function subscribeToSyncStatus(callback: (state: SyncState) => void): () => void {
  syncListeners.add(callback);
  callback(currentSyncState);
  return () => {
    syncListeners.delete(callback);
  };
}

function setSyncState(state: SyncState) {
  if (currentSyncState !== state) {
    currentSyncState = state;
    syncListeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {}
    });
  }
}

// Window online/offline monitor
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => setSyncState('saved'));
  window.addEventListener('offline', () => setSyncState('offline'));
}

// ==========================================
// REAL-TIME FIRESTORE SUBSCRIPTIONS
// ==========================================

let activeUnsubscribes: Unsubscribe[] = [];

export function initializeFirestoreSync(): () => void {
  // Cancel any existing listeners
  cleanupFirestoreSync();

  if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== ALLOWED_OWNER_EMAIL.toLowerCase()) {
    return () => {};
  }

  setSyncState('saving');

  // 1. Clients
  const unsubClients = onSnapshot(
    collection(db, 'clients'),
    (snapshot) => {
      currentDb.clients = snapshot.docs.map((d) => d.data() as Client);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'clients');
    }
  );

  // 2. Client Services
  const unsubServices = onSnapshot(
    collection(db, 'clientServices'),
    (snapshot) => {
      currentDb.clientServices = snapshot.docs.map((d) => d.data() as ClientService);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'clientServices');
    }
  );

  // 3. Payments
  const unsubPayments = onSnapshot(
    collection(db, 'payments'),
    (snapshot) => {
      currentDb.payments = snapshot.docs.map((d) => d.data() as Payment);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'payments');
    }
  );

  // 4. Projects
  const unsubProjects = onSnapshot(
    collection(db, 'projects'),
    (snapshot) => {
      currentDb.projects = snapshot.docs.map((d) => d.data() as Project);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'projects');
    }
  );

  // 5. Tasks
  const unsubTasks = onSnapshot(
    collection(db, 'tasks'),
    (snapshot) => {
      currentDb.tasks = snapshot.docs.map((d) => d.data() as Task);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'tasks');
    }
  );

  // 6. Activities
  const unsubActivities = onSnapshot(
    collection(db, 'activities'),
    (snapshot) => {
      currentDb.activities = snapshot.docs.map((d) => d.data() as ActivityLog);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'activities');
    }
  );

  // 7. Catalog
  const unsubCatalog = onSnapshot(
    collection(db, 'catalog'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as ServiceCatalogItem);
      currentDb.catalog = items.length > 0 ? items : DEFAULT_CATALOG;
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'catalog');
    }
  );

  // 8. Settings
  const unsubSettings = onSnapshot(
    doc(db, 'settings', 'agency'),
    (snapshot) => {
      if (snapshot.exists()) {
        currentDb.settings = { ...DEFAULT_SETTINGS, ...(snapshot.data() as AppSettings) };
      }
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'settings/agency');
    }
  );

  // 9. Expenses
  const unsubExpenses = onSnapshot(
    collection(db, 'expenses'),
    (snapshot) => {
      currentDb.expenses = snapshot.docs.map((d) => d.data() as Expense);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'expenses');
    }
  );

  // 10. Invoices
  const unsubInvoices = onSnapshot(
    collection(db, 'invoices'),
    (snapshot) => {
      currentDb.invoices = snapshot.docs.map((d) => d.data() as Invoice);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'invoices');
    }
  );

  // 11. Checklists
  const unsubChecklists = onSnapshot(
    collection(db, 'checklists'),
    (snapshot) => {
      currentDb.checklists = snapshot.docs.map((d) => d.data() as ClientChecklist);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'checklists');
    }
  );

  // 12. Checklist Templates
  const unsubChecklistTemplates = onSnapshot(
    collection(db, 'checklistTemplates'),
    (snapshot) => {
      const templates = snapshot.docs.map((d) => d.data() as ChecklistTemplate);
      currentDb.checklistTemplates = templates.length > 0 ? templates : DEFAULT_CHECKLIST_TEMPLATES;
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'checklistTemplates');
    }
  );

  // 13. Client Monthly Performance Entries (Ads & GBP)
  const unsubPerformance = onSnapshot(
    collection(db, 'performanceEntries'),
    (snapshot) => {
      currentDb.performanceEntries = snapshot.docs.map((d) => d.data() as ClientPerformanceEntry);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'performanceEntries');
    }
  );

  // 14. Client Websites & Domains
  const unsubWebsites = onSnapshot(
    collection(db, 'websites'),
    (snapshot) => {
      currentDb.websites = snapshot.docs.map((d) => d.data() as ClientWebsite);
      setSyncState(navigator.onLine ? 'saved' : 'offline');
      notifyListeners();
    },
    (error) => {
      handleDbListenerError(error, 'websites');
    }
  );

  activeUnsubscribes = [
    unsubClients,
    unsubServices,
    unsubPayments,
    unsubProjects,
    unsubTasks,
    unsubActivities,
    unsubCatalog,
    unsubSettings,
    unsubExpenses,
    unsubInvoices,
    unsubChecklists,
    unsubChecklistTemplates,
    unsubPerformance,
    unsubWebsites,
  ];

  return cleanupFirestoreSync;
}

export function cleanupFirestoreSync() {
  activeUnsubscribes.forEach((unsub) => {
    try {
      unsub();
    } catch (e) {}
  });
  activeUnsubscribes = [];
}

export function loadDatabase(): FullDatabase {
  return currentDb;
}

// ==========================================
// CLIENT CRUD
// ==========================================

export function getClients(includeArchived = false): Client[] {
  if (includeArchived) return currentDb.clients;
  return currentDb.clients.filter((c) => !c.archived);
}

export function getClientById(id: string): Client | undefined {
  return currentDb.clients.find((c) => c.id === id);
}

export async function saveClient(client: Partial<Client> & { businessName: string }): Promise<Client> {
  setSyncState('saving');
  const now = new Date().toISOString();
  let savedClient: Client;

  if (client.id) {
    const existing = currentDb.clients.find((c) => c.id === client.id);
    const statusChanged = existing && client.status && client.status !== existing.status;

    savedClient = {
      ...(existing || {
        id: client.id,
        businessName: client.businessName,
        contactName: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: 'Fort Lauderdale, FL',
        industry: 'Other',
        leadSource: 'Other',
        status: 'Lead',
        tags: [],
        dateAdded: now.split('T')[0],
        notes: '',
        accessInfo: '',
      }),
      ...client,
      lastActivityDate: now,
    };

    if (statusChanged && existing) {
      logActivity(
        savedClient.id,
        'status_change',
        `Status changed to ${client.status}`,
        `Client transitioned from ${existing.status} to ${client.status}.`
      );
    }
  } else {
    const newId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    savedClient = {
      id: newId,
      businessName: client.businessName,
      contactName: client.contactName || '',
      email: client.email || '',
      phone: client.phone || '',
      website: client.website || '',
      address: client.address || '',
      city: client.city || 'Fort Lauderdale, FL',
      industry: client.industry || 'Other',
      leadSource: client.leadSource || 'Other',
      status: client.status || 'Lead',
      tags: client.tags || [],
      dateAdded: client.dateAdded || now.split('T')[0],
      notes: client.notes || '',
      accessInfo: client.accessInfo || '',
      lastActivityDate: now,
    };

    logActivity(
      savedClient.id,
      'status_change',
      `Client record created`,
      `New lead / client ${savedClient.businessName} added to CRM.`
    );
  }

  // Optimistic in-memory update
  const idx = currentDb.clients.findIndex((c) => c.id === savedClient.id);
  if (idx >= 0) currentDb.clients[idx] = savedClient;
  else currentDb.clients.unshift(savedClient);
  notifyListeners();

  try {
    await setDoc(doc(db, 'clients', savedClient.id), savedClient);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `clients/${savedClient.id}`);
  }

  return savedClient;
}

export async function archiveClient(id: string): Promise<void> {
  const client = currentDb.clients.find((c) => c.id === id);
  if (client) {
    client.archived = true;
    client.lastActivityDate = new Date().toISOString();
    notifyListeners();
    logActivity(id, 'status_change', 'Client Archived', 'Client was moved to archived records.');

    try {
      await setDoc(doc(db, 'clients', id), client);
    } catch (error) {
      handleDbError(error, OperationType.UPDATE, `clients/${id}`);
    }
  }
}

export async function restoreClient(id: string): Promise<void> {
  const client = currentDb.clients.find((c) => c.id === id);
  if (client) {
    client.archived = false;
    client.lastActivityDate = new Date().toISOString();
    notifyListeners();
    logActivity(id, 'status_change', 'Client Restored', 'Client was restored from archive.');

    try {
      await setDoc(doc(db, 'clients', id), client);
    } catch (error) {
      handleDbError(error, OperationType.UPDATE, `clients/${id}`);
    }
  }
}

export async function hardDeleteClient(id: string): Promise<void> {
  setSyncState('saving');
  currentDb.clients = currentDb.clients.filter((c) => c.id !== id);
  currentDb.clientServices = currentDb.clientServices.filter((s) => s.clientId !== id);
  currentDb.payments = currentDb.payments.filter((p) => p.clientId !== id);
  currentDb.projects = currentDb.projects.filter((pr) => pr.clientId !== id);
  currentDb.tasks = currentDb.tasks.filter((t) => t.clientId !== id);
  currentDb.activities = currentDb.activities.filter((a) => a.clientId !== id);
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'clients', id));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `clients/${id}`);
  }
}

export async function markLeadAsContacted(id: string, note?: string): Promise<Client | null> {
  setSyncState('saving');
  const client = currentDb.clients.find((c) => c.id === id);
  if (!client) return null;

  const now = new Date().toISOString();
  client.leadContacted = true;
  client.contactedAt = now;
  client.lastActivityDate = now;

  // Log contact activity
  logActivity(
    id,
    'call',
    'Lead Follow-up Completed',
    note || `Reached out to ${client.contactName || client.businessName}. Lead marked as contacted.`
  );

  // Automatically mark the urgent 5-minute follow-up task as done
  const followUpTasks = currentDb.tasks.filter(
    (t) => t.clientId === id && !t.done && (t.type === 'Follow-up' || t.title.includes('5 minutes'))
  );
  for (const t of followUpTasks) {
    t.done = true;
    try {
      await setDoc(doc(db, 'tasks', t.id), t);
    } catch {
      // optimistic
    }
  }

  notifyListeners();

  try {
    await setDoc(doc(db, 'clients', id), client);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.UPDATE, `clients/${id}`);
  }

  return client;
}

export async function createIncomingLead(payload: IncomingLeadPayload): Promise<{
  client: Client;
  task: Task;
  activity: ActivityLog;
}> {
  setSyncState('saving');
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  const contactName = (payload.name || payload.contactName || payload.fullName || '').trim() || 'New Inbound Lead';
  const businessName = (payload.business || payload.businessName || `${contactName}'s Business`).trim();
  const email = (payload.email || '').trim();
  const phone = (payload.phone || '').trim();
  const rawType = (payload.businessType || payload.business_type || payload.industry || '').trim();
  const source = (payload.source || payload.leadSource || 'Website Form').trim();
  const message = (payload.message || payload.notes || '').trim();

  // Normalize industry if matches known
  const industryList = [
    'Cleaning',
    'Landscaping',
    'Auto Detailing',
    'Remodeling/Contractor',
    'Pressure Washing',
    'HVAC',
    'Wellness',
    'Restaurant',
    'Retail',
  ];
  const matchedIndustry =
    industryList.find((i) => rawType.toLowerCase().includes(i.toLowerCase())) || 'Other';

  const clientId = `cli_lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const taskId = `tsk_followup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const activityId = `act_lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newClient: Client = {
    id: clientId,
    businessName,
    contactName,
    email,
    phone,
    website: '',
    address: '',
    city: 'Fort Lauderdale, FL',
    industry: matchedIndustry as any,
    leadSource: (source.toLowerCase().includes('meta') ||
    source.toLowerCase().includes('facebook') ||
    source.toLowerCase().includes('instagram'))
      ? 'Meta Ads'
      : (source as any) || 'Website Form',
    status: 'Lead',
    tags: ['Inbound Lead', source],
    dateAdded: todayStr,
    notes: message ? `Lead inquiry: ${message}` : 'Inbound lead via API endpoint.',
    accessInfo: '',
    lastActivityDate: now,
    leadContacted: false,
    sourceMessage: message,
  };

  const newTask: Task = {
    id: taskId,
    clientId,
    title: `⚡ Follow up within 5 minutes — ${contactName} (${businessName})`,
    dueDate: todayStr,
    priority: 'High',
    done: false,
    type: 'Follow-up',
    autoGenerated: true,
    createdAt: now,
  };

  const newActivity: ActivityLog = {
    id: activityId,
    clientId,
    type: 'lead_received',
    title: `Incoming Lead via ${source}`,
    description: `${contactName} (${businessName}) submitted a lead inquiry. Phone: ${phone || 'N/A'} | Email: ${email || 'N/A'}${message ? `. Message: "${message}"` : ''}`,
    timestamp: now,
  };

  // Add to local DB
  currentDb.clients.unshift(newClient);
  currentDb.tasks.unshift(newTask);
  currentDb.activities.unshift(newActivity);
  notifyListeners();

  // Write to Firestore
  try {
    await setDoc(doc(db, 'clients', clientId), newClient);
    await setDoc(doc(db, 'tasks', taskId), newTask);
    await setDoc(doc(db, 'activities', activityId), newActivity);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `clients/${clientId}`);
  }

  return { client: newClient, task: newTask, activity: newActivity };
}

// ==========================================
// SERVICE CATALOG CRUD
// ==========================================

export function getCatalog(activeOnly = false): ServiceCatalogItem[] {
  if (activeOnly) return currentDb.catalog.filter((i) => i.active);
  return currentDb.catalog;
}

export async function saveCatalogItem(
  item: Partial<ServiceCatalogItem> & { name: string; defaultPrice: number }
): Promise<ServiceCatalogItem> {
  setSyncState('saving');
  const id = item.id || `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const saved: ServiceCatalogItem = {
    id,
    name: item.name,
    category: item.category || 'Website Build',
    billingType: item.billingType || 'one-time',
    defaultPrice: item.defaultPrice,
    setupFee: item.setupFee || 0,
    minimumTermMonths: item.minimumTermMonths || 0,
    active: item.active !== undefined ? item.active : true,
  };

  const idx = currentDb.catalog.findIndex((c) => c.id === id);
  if (idx >= 0) currentDb.catalog[idx] = saved;
  else currentDb.catalog.push(saved);
  notifyListeners();

  try {
    await setDoc(doc(db, 'catalog', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `catalog/${id}`);
  }

  return saved;
}

export async function deleteCatalogItem(id: string): Promise<void> {
  setSyncState('saving');
  currentDb.catalog = currentDb.catalog.filter((c) => c.id !== id);
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'catalog', id));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `catalog/${id}`);
  }
}

// ==========================================
// CLIENT SERVICES CRUD
// ==========================================

export function getClientServices(clientId?: string): ClientService[] {
  if (clientId) {
    return currentDb.clientServices.filter((s) => s.clientId === clientId);
  }
  return currentDb.clientServices;
}

export async function saveClientService(
  service: Partial<ClientService> & { clientId: string; customName: string; price: number }
): Promise<ClientService> {
  setSyncState('saving');
  const startDate = service.startDate || new Date().toISOString().split('T')[0];
  const termMonths = service.minimumTermMonths ?? (service.billingType === 'monthly' ? 12 : 0);

  let endDate = service.endDate;
  if (!endDate && service.billingType === 'monthly' && termMonths > 0) {
    const s = new Date(startDate);
    s.setMonth(s.getMonth() + termMonths);
    endDate = s.toISOString().split('T')[0];
  }

  const id = service.id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const saved: ClientService = {
    id,
    clientId: service.clientId,
    catalogItemId: service.catalogItemId,
    customName: service.customName,
    category: service.category || 'Website Care Plan',
    billingType: service.billingType || 'monthly',
    price: service.price,
    setupFee: service.setupFee || 0,
    discountType: service.discountType || 'fixed',
    discountValue: service.discountValue || 0,
    startDate,
    minimumTermMonths: termMonths,
    endDate: endDate || '',
    autoRenew: service.autoRenew ?? true,
    status: service.status || 'Active',
    billingDayOfMonth: service.billingDayOfMonth || 1,
    adSpendBudget: service.adSpendBudget,
    notes: service.notes || '',
  };

  const isExisting = currentDb.clientServices.some((s) => s.id === id);
  if (isExisting) {
    currentDb.clientServices = currentDb.clientServices.map((s) => (s.id === id ? saved : s));
    logActivity(
      saved.clientId,
      'service_updated',
      `Service updated: ${saved.customName}`,
      `Updated status to ${saved.status}, price $${saved.price}.`
    );
  } else {
    currentDb.clientServices.unshift(saved);
    logActivity(
      saved.clientId,
      'service_added',
      `Service added: ${saved.customName}`,
      `Added ${saved.billingType} service at $${saved.price}.`
    );
    // Auto-spawn checklist from template when service is added
    try {
      await spawnChecklistsForService(saved);
    } catch (e) {
      console.warn('Auto checklist creation error:', e);
    }
  }
  notifyListeners();

  try {
    await setDoc(doc(db, 'clientServices', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `clientServices/${id}`);
  }

  return saved;
}

export async function renewClientService(serviceId: string, additionalMonths: number, autoRenew = true): Promise<ClientService | null> {
  const service = currentDb.clientServices.find((s) => s.id === serviceId);
  if (!service) return null;

  const currentEnd = service.endDate ? new Date(service.endDate) : new Date();
  const baseDate = currentEnd.getTime() < Date.now() ? new Date() : currentEnd;
  baseDate.setMonth(baseDate.getMonth() + additionalMonths);
  const newEndDate = baseDate.toISOString().split('T')[0];

  const updated: ClientService = {
    ...service,
    endDate: newEndDate,
    minimumTermMonths: (service.minimumTermMonths || 0) + additionalMonths,
    autoRenew,
    status: 'Active',
  };

  return saveClientService(updated);
}

export async function convertToMonthToMonth(serviceId: string): Promise<ClientService | null> {
  const service = currentDb.clientServices.find((s) => s.id === serviceId);
  if (!service) return null;

  const updated: ClientService = {
    ...service,
    autoRenew: true,
    notes: (service.notes ? service.notes + ' | ' : '') + 'Converted to month-to-month rolling retainer.',
  };

  return saveClientService(updated);
}

export async function deleteClientService(id: string): Promise<void> {
  setSyncState('saving');
  const service = currentDb.clientServices.find((s) => s.id === id);
  if (service) {
    const clientId = service.clientId;
    currentDb.clientServices = currentDb.clientServices.filter((s) => s.id !== id);
    logActivity(clientId, 'service_updated', `Service Removed`, `Removed service ${service.customName}.`);
    notifyListeners();

    try {
      await deleteDoc(doc(db, 'clientServices', id));
      setSyncState(navigator.onLine ? 'saved' : 'offline');
    } catch (error) {
      handleDbError(error, OperationType.DELETE, `clientServices/${id}`);
    }
  }
}

// ==========================================
// PAYMENTS CRUD
// ==========================================

export function getPayments(clientId?: string): Payment[] {
  if (clientId) {
    return currentDb.payments.filter((p) => p.clientId === clientId);
  }
  return currentDb.payments;
}

export async function savePayment(
  payment: Partial<Payment> & { clientId: string; amount: number }
): Promise<Payment> {
  setSyncState('saving');
  const now = new Date().toISOString().split('T')[0];
  const id = payment.id || `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const randomInv = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const saved: Payment = {
    id,
    clientId: payment.clientId,
    clientServiceId: payment.clientServiceId,
    amount: payment.amount,
    date: payment.date || now,
    method: payment.method || 'Card/Stripe',
    type: payment.type || 'Monthly',
    status: payment.status || 'Paid',
    invoiceNumber: payment.invoiceNumber || randomInv,
    notes: payment.notes || '',
  };

  const idx = currentDb.payments.findIndex((p) => p.id === id);
  if (idx >= 0) currentDb.payments[idx] = saved;
  else currentDb.payments.unshift(saved);

  logActivity(
    saved.clientId,
    'payment_logged',
    `Payment Logged: $${saved.amount.toFixed(2)} (${saved.status})`,
    `Invoice: ${saved.invoiceNumber || 'N/A'} · Method: ${saved.method} · Type: ${saved.type}`
  );
  notifyListeners();

  try {
    await setDoc(doc(db, 'payments', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `payments/${id}`);
  }

  return saved;
}

export async function deletePayment(id: string): Promise<void> {
  setSyncState('saving');
  currentDb.payments = currentDb.payments.filter((p) => p.id !== id);
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'payments', id));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `payments/${id}`);
  }
}

// ==========================================
// PROJECTS CRUD
// ==========================================

export function getProjects(clientId?: string): Project[] {
  if (clientId) {
    return currentDb.projects.filter((p) => p.clientId === clientId);
  }
  return currentDb.projects;
}

export async function saveProject(
  project: Partial<Project> & { clientId: string; name: string }
): Promise<Project> {
  setSyncState('saving');
  const now = new Date().toISOString();
  const id = project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const saved: Project = {
    id,
    clientId: project.clientId,
    name: project.name,
    stage: project.stage || 'Mockup',
    mockupDue: project.mockupDue,
    targetLaunch: project.targetLaunch,
    depositPaid: project.depositPaid ?? false,
    finalPaid: project.finalPaid ?? false,
    previewLink: project.previewLink,
    liveLink: project.liveLink,
    notes: project.notes || '',
    updatedAt: now,
  };

  const idx = currentDb.projects.findIndex((p) => p.id === id);
  if (idx >= 0) currentDb.projects[idx] = saved;
  else currentDb.projects.unshift(saved);

  logActivity(
    saved.clientId,
    'project_updated',
    `Project: ${saved.name}`,
    `Stage: ${saved.stage}`
  );
  notifyListeners();

  try {
    await setDoc(doc(db, 'projects', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `projects/${id}`);
  }

  return saved;
}

export async function deleteProject(id: string): Promise<void> {
  setSyncState('saving');
  currentDb.projects = currentDb.projects.filter((p) => p.id !== id);
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'projects', id));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `projects/${id}`);
  }
}

// ==========================================
// TASKS CRUD
// ==========================================

export function getTasks(clientId?: string): Task[] {
  if (clientId) {
    return currentDb.tasks.filter((t) => t.clientId === clientId);
  }
  return currentDb.tasks;
}

export async function saveTask(task: Partial<Task> & { title: string }): Promise<Task> {
  setSyncState('saving');
  const now = new Date().toISOString();
  const id = task.id || `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const saved: Task = {
    id,
    clientId: task.clientId,
    title: task.title,
    dueDate: task.dueDate || now.split('T')[0],
    priority: task.priority || 'Medium',
    done: task.done ?? false,
    type: task.type || 'Other',
    createdAt: task.createdAt || now,
    autoGenerated: task.autoGenerated ?? false,
  };

  const idx = currentDb.tasks.findIndex((t) => t.id === id);
  if (idx >= 0) currentDb.tasks[idx] = saved;
  else currentDb.tasks.unshift(saved);
  notifyListeners();

  try {
    await setDoc(doc(db, 'tasks', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `tasks/${id}`);
  }

  return saved;
}

export async function toggleTaskDone(id: string): Promise<void> {
  const task = currentDb.tasks.find((t) => t.id === id);
  if (task) {
    task.done = !task.done;
    notifyListeners();

    try {
      await setDoc(doc(db, 'tasks', id), task);
    } catch (error) {
      handleDbError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  }
}

export async function deleteTask(id: string): Promise<void> {
  setSyncState('saving');
  currentDb.tasks = currentDb.tasks.filter((t) => t.id !== id);
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'tasks', id));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `tasks/${id}`);
  }
}

// ==========================================
// ACTIVITY LOGS CRUD
// ==========================================

export function getActivities(clientId?: string): ActivityLog[] {
  const sorted = [...currentDb.activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  if (clientId) {
    return sorted.filter((a) => a.clientId === clientId);
  }
  return sorted;
}

export async function logActivity(
  clientId: string,
  type: ActivityType,
  title: string,
  description: string
): Promise<ActivityLog> {
  const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const entry: ActivityLog = {
    id,
    clientId,
    type,
    title,
    description,
    timestamp: new Date().toISOString(),
  };

  currentDb.activities.unshift(entry);
  notifyListeners();

  try {
    await setDoc(doc(db, 'activities', id), entry);
  } catch (error) {
    console.error('Failed to log activity to Firestore:', error);
  }

  return entry;
}

// ==========================================
// EXPENSES CRUD
// ==========================================

export function getExpenses(clientId?: string): Expense[] {
  if (clientId) {
    return currentDb.expenses.filter((e) => e.clientId === clientId);
  }
  return currentDb.expenses;
}

export function getExpenseById(id: string): Expense | undefined {
  return currentDb.expenses.find((e) => e.id === id);
}

export async function saveExpense(
  expense: Partial<Expense> & { vendor: string; amount: number; category: ExpenseCategory }
): Promise<Expense> {
  setSyncState('saving');
  const now = new Date().toISOString();
  const id = expense.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const saved: Expense = {
    id,
    date: expense.date || now.split('T')[0],
    vendor: expense.vendor.trim(),
    category: expense.category,
    amount: Number(expense.amount) || 0,
    recurring: expense.recurring || 'one-time',
    clientId: expense.clientId || undefined,
    notes: expense.notes?.trim() || undefined,
    receiptLink: expense.receiptLink?.trim() || undefined,
  };

  const idx = currentDb.expenses.findIndex((e) => e.id === id);
  if (idx >= 0) {
    currentDb.expenses[idx] = saved;
  } else {
    currentDb.expenses.unshift(saved);
  }
  notifyListeners();

  try {
    await setDoc(doc(db, 'expenses', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `expenses/${id}`);
  }

  return saved;
}

export async function deleteExpense(id: string): Promise<void> {
  setSyncState('saving');
  currentDb.expenses = currentDb.expenses.filter((e) => e.id !== id);
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'expenses', id));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `expenses/${id}`);
  }
}

// ==========================================
// INVOICES CRUD
// ==========================================

export function getInvoices(clientId?: string): Invoice[] {
  if (clientId) {
    return (currentDb.invoices || []).filter((inv) => inv.clientId === clientId);
  }
  return currentDb.invoices || [];
}

export function getInvoiceById(id: string): Invoice | undefined {
  return (currentDb.invoices || []).find((inv) => inv.id === id);
}

export function getNextInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const prefix = `DD-${year}-`;
  const matching = (currentDb.invoices || [])
    .map((inv) => inv.invoiceNumber)
    .filter((num) => num && num.startsWith(prefix));

  let maxSeq = 0;
  for (const num of matching) {
    const seqStr = num.replace(prefix, '');
    const seqNum = parseInt(seqStr, 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  }
  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

export async function saveInvoice(invoice: Partial<Invoice> & { clientId: string }): Promise<Invoice> {
  setSyncState('saving');
  const now = new Date().toISOString();
  const id = invoice.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const invoiceNumber = invoice.invoiceNumber || getNextInvoiceNumber();

  const lineItems = invoice.lineItems || [];
  const subtotal = lineItems.reduce((acc, item) => acc + (item.total || item.unitPrice * item.quantity), 0);
  const tax = Number(invoice.tax) || 0;
  const discount = Number(invoice.discount) || 0;
  const total = Math.max(0, subtotal + tax - discount);

  const saved: Invoice = {
    id,
    invoiceNumber,
    clientId: invoice.clientId,
    issueDate: invoice.issueDate || now.split('T')[0],
    dueDate: invoice.dueDate || now.split('T')[0],
    status: invoice.status || 'Draft',
    lineItems,
    subtotal,
    tax,
    discount,
    total: invoice.total !== undefined ? invoice.total : total,
    paymentInstructions: invoice.paymentInstructions,
    notes: invoice.notes?.trim() || undefined,
    createdAt: invoice.createdAt || now,
    updatedAt: now,
    paidDate: invoice.paidDate,
  };

  if (!currentDb.invoices) currentDb.invoices = [];
  const idx = currentDb.invoices.findIndex((inv) => inv.id === id);
  if (idx >= 0) {
    currentDb.invoices[idx] = saved;
  } else {
    currentDb.invoices.unshift(saved);
  }
  notifyListeners();

  try {
    await setDoc(doc(db, 'invoices', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `invoices/${id}`);
  }

  return saved;
}

export async function deleteInvoice(id: string): Promise<void> {
  setSyncState('saving');
  if (currentDb.invoices) {
    currentDb.invoices = currentDb.invoices.filter((inv) => inv.id !== id);
  }
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'invoices', id));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `invoices/${id}`);
  }
}

// ==========================================
// CHECKLISTS & CHECKLIST TEMPLATES
// ==========================================

export function getChecklists(clientId?: string): ClientChecklist[] {
  const all = currentDb.checklists || [];
  if (clientId) {
    return all.filter((c) => c.clientId === clientId);
  }
  return all;
}

export function getChecklistById(id: string): ClientChecklist | undefined {
  return (currentDb.checklists || []).find((c) => c.id === id);
}

export function getChecklistTemplates(): ChecklistTemplate[] {
  return currentDb.checklistTemplates && currentDb.checklistTemplates.length > 0
    ? currentDb.checklistTemplates
    : DEFAULT_CHECKLIST_TEMPLATES;
}

export async function saveChecklist(checklist: Partial<ClientChecklist> & { clientId: string; title: string; items: ClientChecklistItem[] }): Promise<ClientChecklist> {
  setSyncState('saving');
  const now = new Date().toISOString();
  const id = checklist.id || `chk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const saved: ClientChecklist = {
    id,
    clientId: checklist.clientId,
    serviceId: checklist.serviceId,
    templateId: checklist.templateId,
    title: checklist.title,
    items: checklist.items,
    createdAt: checklist.createdAt || now,
    updatedAt: now,
  };

  if (!currentDb.checklists) currentDb.checklists = [];
  const idx = currentDb.checklists.findIndex((c) => c.id === id);
  if (idx >= 0) {
    currentDb.checklists[idx] = saved;
  } else {
    currentDb.checklists.unshift(saved);
  }
  notifyListeners();

  try {
    await setDoc(doc(db, 'checklists', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `checklists/${id}`);
  }

  return saved;
}

export async function deleteChecklist(id: string): Promise<void> {
  setSyncState('saving');
  if (currentDb.checklists) {
    currentDb.checklists = currentDb.checklists.filter((c) => c.id !== id);
  }
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'checklists', id));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `checklists/${id}`);
  }
}

export async function toggleChecklistItem(checklistId: string, itemId: string): Promise<ClientChecklist | null> {
  const checklist = (currentDb.checklists || []).find((c) => c.id === checklistId);
  if (!checklist) return null;

  const now = new Date().toISOString();
  const updatedItems = checklist.items.map((item) => {
    if (item.id === itemId) {
      const nextCompleted = !item.completed;
      return {
        ...item,
        completed: nextCompleted,
        completedAt: nextCompleted ? now : undefined,
      };
    }
    return item;
  });

  return saveChecklist({
    ...checklist,
    items: updatedItems,
  });
}

export async function addChecklistItem(checklistId: string, label: string): Promise<ClientChecklist | null> {
  const checklist = (currentDb.checklists || []).find((c) => c.id === checklistId);
  if (!checklist) return null;

  const newItem: ClientChecklistItem = {
    id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    label: label.trim(),
    completed: false,
  };

  return saveChecklist({
    ...checklist,
    items: [...checklist.items, newItem],
  });
}

export async function deleteChecklistItem(checklistId: string, itemId: string): Promise<ClientChecklist | null> {
  const checklist = (currentDb.checklists || []).find((c) => c.id === checklistId);
  if (!checklist) return null;

  return saveChecklist({
    ...checklist,
    items: checklist.items.filter((i) => i.id !== itemId),
  });
}

export async function createChecklistFromTemplate(
  clientId: string,
  templateId: string,
  serviceId?: string,
  customTitle?: string
): Promise<ClientChecklist> {
  const templates = getChecklistTemplates();
  const template = templates.find((t) => t.id === templateId) || DEFAULT_CHECKLIST_TEMPLATES.find((t) => t.id === templateId) || templates[0];

  const items: ClientChecklistItem[] = template.items.map((label, index) => ({
    id: `item_${index + 1}_${Math.random().toString(36).substr(2, 4)}`,
    label,
    completed: false,
  }));

  const title = customTitle || `${template.name} Onboarding`;

  return saveChecklist({
    clientId,
    serviceId,
    templateId: template.id,
    title,
    items,
  });
}

export async function spawnChecklistsForService(service: ClientService): Promise<ClientChecklist | null> {
  const sName = (service.customName || '').toLowerCase();
  const sCat = (service.category || '').toLowerCase();
  const combined = `${sName} ${sCat}`;

  // Check if checklist already exists for this service
  const existing = (currentDb.checklists || []).find((c) => c.serviceId === service.id);
  if (existing) return existing;

  let templateId: string | null = null;
  let defaultTitle = '';

  if (
    combined.includes('website') ||
    combined.includes('web') ||
    combined.includes('landing') ||
    combined.includes('redesign') ||
    combined.includes('care plan') ||
    combined.includes('build')
  ) {
    templateId = 'tmpl_website_build';
    defaultTitle = `Website Build: ${service.customName}`;
  } else if (
    combined.includes('ad') ||
    combined.includes('meta') ||
    combined.includes('facebook') ||
    combined.includes('ppc') ||
    combined.includes('google ad') ||
    combined.includes('tiktok') ||
    combined.includes('paid')
  ) {
    templateId = 'tmpl_ads';
    defaultTitle = `Ads: ${service.customName}`;
  } else if (
    combined.includes('gbp') ||
    combined.includes('google business') ||
    combined.includes('map') ||
    combined.includes('local seo') ||
    combined.includes('profile')
  ) {
    templateId = 'tmpl_gbp';
    defaultTitle = `GBP: ${service.customName}`;
  }

  if (!templateId) return null;

  return createChecklistFromTemplate(service.clientId, templateId, service.id, defaultTitle);
}

export async function saveChecklistTemplate(template: ChecklistTemplate): Promise<ChecklistTemplate> {
  setSyncState('saving');
  if (!currentDb.checklistTemplates) currentDb.checklistTemplates = [...DEFAULT_CHECKLIST_TEMPLATES];
  const idx = currentDb.checklistTemplates.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    currentDb.checklistTemplates[idx] = template;
  } else {
    currentDb.checklistTemplates.push(template);
  }
  notifyListeners();

  try {
    await setDoc(doc(db, 'checklistTemplates', template.id), template);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `checklistTemplates/${template.id}`);
  }

  return template;
}

export async function deleteChecklistTemplate(templateId: string): Promise<void> {
  setSyncState('saving');
  if (currentDb.checklistTemplates) {
    currentDb.checklistTemplates = currentDb.checklistTemplates.filter((t) => t.id !== templateId);
  }
  notifyListeners();

  try {
    await deleteDoc(doc(db, 'checklistTemplates', templateId));
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.DELETE, `checklistTemplates/${templateId}`);
  }
}

export async function resetDefaultChecklistTemplates(): Promise<void> {
  setSyncState('saving');
  currentDb.checklistTemplates = [...DEFAULT_CHECKLIST_TEMPLATES];
  notifyListeners();

  for (const tmpl of DEFAULT_CHECKLIST_TEMPLATES) {
    try {
      await setDoc(doc(db, 'checklistTemplates', tmpl.id), tmpl);
    } catch (e) {}
  }
  setSyncState(navigator.onLine ? 'saved' : 'offline');
}

// ==========================================
// SETTINGS
// ==========================================

export function getSettings(): AppSettings {
  return currentDb.settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  setSyncState('saving');
  currentDb.settings = { ...currentDb.settings, ...settings };
  notifyListeners();

  try {
    await setDoc(doc(db, 'settings', 'agency'), currentDb.settings);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, 'settings/agency');
  }

  return currentDb.settings;
}

// ==========================================
// CLIENT PERFORMANCE ENTRIES (ADS & GBP)
// ==========================================

export function getPerformanceEntries(clientId?: string): ClientPerformanceEntry[] {
  if (clientId) {
    return (currentDb.performanceEntries || [])
      .filter((e) => e.clientId === clientId)
      .sort((a, b) => b.month.localeCompare(a.month));
  }
  return (currentDb.performanceEntries || []).sort((a, b) => b.month.localeCompare(a.month));
}

export function getPerformanceEntryById(id: string): ClientPerformanceEntry | undefined {
  return (currentDb.performanceEntries || []).find((e) => e.id === id);
}

export async function savePerformanceEntry(
  entry: Partial<ClientPerformanceEntry> & { clientId: string; month: string }
): Promise<ClientPerformanceEntry> {
  setSyncState('saving');
  const id =
    entry.id ||
    `perf_${entry.clientId.replace(/[^a-zA-Z0-9]/g, '_')}_${entry.month.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  const now = new Date().toISOString();

  const adSpend = Math.max(0, Number(entry.adSpend) || 0);
  const leads = Math.max(0, Number(entry.leads) || 0);
  const costPerLead = leads > 0 ? Math.round((adSpend / leads) * 100) / 100 : 0;
  const bookedJobs = Math.max(0, Number(entry.bookedJobs) || 0);
  const revenueFromAds = Math.max(0, Number(entry.revenueFromAds) || 0);
  const roas = adSpend > 0 ? Math.round((revenueFromAds / adSpend) * 100) / 100 : 0;

  const saved: ClientPerformanceEntry = {
    id,
    clientId: entry.clientId,
    month: entry.month,
    adSpend,
    leads,
    costPerLead,
    bookedJobs,
    revenueFromAds,
    roas,
    gbpCalls: Math.max(0, Number(entry.gbpCalls) || 0),
    gbpDirectionRequests: Math.max(0, Number(entry.gbpDirectionRequests) || 0),
    gbpWebsiteClicks: Math.max(0, Number(entry.gbpWebsiteClicks) || 0),
    whatWeChanged: entry.whatWeChanged || '',
    nextMonthPlan: entry.nextMonthPlan || '',
    notes: entry.notes || '',
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  const isExisting = (currentDb.performanceEntries || []).some((e) => e.id === id);
  if (isExisting) {
    currentDb.performanceEntries = (currentDb.performanceEntries || []).map((e) =>
      e.id === id ? saved : e
    );
    logActivity(
      saved.clientId,
      'service_updated',
      `Updated ${saved.month} performance metrics`,
      `Spend: $${saved.adSpend.toLocaleString()} | Leads: ${saved.leads} | ROAS: ${saved.roas}x`
    );
  } else {
    currentDb.performanceEntries = [saved, ...(currentDb.performanceEntries || [])];
    logActivity(
      saved.clientId,
      'service_updated',
      `Logged ${saved.month} performance report`,
      `Spend: $${saved.adSpend.toLocaleString()} | Leads: ${saved.leads} (CPL: $${saved.costPerLead}) | Revenue: $${saved.revenueFromAds.toLocaleString()} (${saved.roas}x ROAS)`
    );
  }

  notifyListeners();

  try {
    await setDoc(doc(db, 'performanceEntries', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `performanceEntries/${id}`);
  }

  return saved;
}

export async function deletePerformanceEntry(id: string): Promise<void> {
  setSyncState('saving');
  const target = (currentDb.performanceEntries || []).find((e) => e.id === id);
  currentDb.performanceEntries = (currentDb.performanceEntries || []).filter((e) => e.id !== id);
  notifyListeners();

  if (target) {
    try {
      await deleteDoc(doc(db, 'performanceEntries', id));
      setSyncState(navigator.onLine ? 'saved' : 'offline');
    } catch (error) {
      handleDbError(error, OperationType.DELETE, `performanceEntries/${id}`);
    }
  }
}

// ==========================================
// CLIENT WEBSITES & DOMAINS
// ==========================================

export function getWebsitesByClient(clientId: string): ClientWebsite[] {
  return (currentDb.websites || []).filter((w) => w.clientId === clientId);
}

export function getAllWebsites(): ClientWebsite[] {
  return currentDb.websites || [];
}

export function getWebsiteById(id: string): ClientWebsite | undefined {
  return (currentDb.websites || []).find((w) => w.id === id);
}

export async function saveWebsite(
  website: Partial<ClientWebsite> & { clientId: string; domain: string }
): Promise<ClientWebsite> {
  setSyncState('saving');
  const id =
    website.id ||
    `web_${website.clientId.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  const now = new Date().toISOString();

  // Clean domain
  let cleanDomain = (website.domain || '').trim().toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

  const liveUrl =
    website.liveUrl && website.liveUrl.trim().length > 0
      ? website.liveUrl.trim()
      : `https://${cleanDomain}`;

  const saved: ClientWebsite = {
    id,
    clientId: website.clientId,
    domain: cleanDomain,
    registrar: (website.registrar || 'Other').trim(),
    domainExpiryDate: website.domainExpiryDate || '',
    registrarLoginOwner: website.registrarLoginOwner || 'client',
    hostingPlatform: (website.hostingPlatform || 'Other').trim(),
    liveUrl,
    sslStatus: website.sslStatus || 'Active',
    lastBackupDate: website.lastBackupDate || '',
    lastUpdateDate: website.lastUpdateDate || '',
    uptimeMonitorLink: website.uptimeMonitorLink || '',
    notes: website.notes || '',
    createdAt: website.createdAt || now,
    updatedAt: now,
  };

  const existingIdx = (currentDb.websites || []).findIndex((w) => w.id === id);
  if (existingIdx >= 0) {
    currentDb.websites[existingIdx] = saved;
  } else {
    currentDb.websites = [...(currentDb.websites || []), saved];
  }
  notifyListeners();

  try {
    await setDoc(doc(db, 'websites', id), saved);
    setSyncState(navigator.onLine ? 'saved' : 'offline');
  } catch (error) {
    handleDbError(error, OperationType.WRITE, `websites/${id}`);
  }

  return saved;
}

export async function deleteWebsite(id: string): Promise<void> {
  setSyncState('saving');
  const target = (currentDb.websites || []).find((w) => w.id === id);
  currentDb.websites = (currentDb.websites || []).filter((w) => w.id !== id);
  notifyListeners();

  if (target) {
    try {
      await deleteDoc(doc(db, 'websites', id));
      setSyncState(navigator.onLine ? 'saved' : 'offline');
    } catch (error) {
      handleDbError(error, OperationType.DELETE, `websites/${id}`);
    }
  }
}

// ==========================================
// AUTOMATED WORKFLOW ENGINE
// ==========================================

export function runAutomatedTaskChecks(): void {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Monthly reports for ads / GBP
  const eligibleClients = currentDb.clients.filter((c) => {
    if (c.archived || c.status !== 'Active Client') return false;
    return currentDb.clientServices.some(
      (s) =>
        s.clientId === c.id &&
        s.status === 'Active' &&
        (s.category === 'Ads Management' || s.category === 'Google Business Profile')
    );
  });

  for (const client of eligibleClients) {
    const taskTitle = `Send monthly performance report (${curMonthKey}) to ${client.contactName || client.businessName}`;
    const exists = currentDb.tasks.some(
      (t) => t.clientId === client.id && t.type === 'Report' && t.title.includes(curMonthKey)
    );
    if (!exists) {
      saveTask({
        id: `tsk_auto_rep_${client.id}_${curMonthKey}`,
        clientId: client.id,
        title: taskTitle,
        dueDate: `${curMonthKey}-05`,
        priority: 'Medium',
        done: false,
        type: 'Report',
        autoGenerated: true,
      }).catch(() => {});
    }
  }

  // Monthly recurring task for active care plans: "Care plan maintenance — [client]"
  for (const service of currentDb.clientServices) {
    if (service.status !== 'Active') continue;
    const cat = (service.category || '').toLowerCase();
    const name = (service.customName || '').toLowerCase();
    const catalogItem = currentDb.catalog.find((c) => c.id === service.catalogItemId);
    const catalogCat = (catalogItem?.category || '').toLowerCase();
    const catalogName = (catalogItem?.name || '').toLowerCase();
    const isCarePlan =
      cat.includes('care plan') ||
      name.includes('care plan') ||
      catalogCat.includes('care plan') ||
      catalogName.includes('care plan') ||
      (service.catalogItemId || '').startsWith('cat_care');
    if (!isCarePlan) continue;

    const client = currentDb.clients.find((c) => c.id === service.clientId);
    if (!client || client.archived) continue;

    const taskTitle = `Care plan maintenance — ${client.businessName}`;
    const exists = currentDb.tasks.some(
      (t) =>
        t.clientId === client.id &&
        t.type === 'Monthly Care' &&
        t.title.toLowerCase().startsWith('care plan maintenance') &&
        (t.id.includes(curMonthKey) || t.createdAt?.startsWith(curMonthKey) || t.dueDate?.startsWith(curMonthKey))
    );
    if (!exists) {
      const billingDay = Math.min(Math.max(service.billingDayOfMonth || 15, 1), 28);
      const dueDate = `${curMonthKey}-${String(billingDay).padStart(2, '0')}`;
      saveTask({
        id: `tsk_auto_care_${client.id}_${curMonthKey}`,
        clientId: client.id,
        title: taskTitle,
        dueDate,
        priority: 'Medium',
        done: false,
        type: 'Monthly Care',
        autoGenerated: true,
      }).catch(() => {});
    }
  }

  // Renewal touchpoint 30 days before end date
  for (const service of currentDb.clientServices) {
    if (service.status === 'Active' && service.endDate) {
      const parts = service.endDate.split('-');
      if (parts.length === 3) {
        const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) {
          const client = currentDb.clients.find((c) => c.id === service.clientId);
          const taskTitle = `Renewal conversation: ${service.customName} (${client?.businessName || 'Client'}) ends in ${diffDays}d`;
          const exists = currentDb.tasks.some(
            (t) => t.clientId === service.clientId && t.type === 'Renewal' && t.title.includes(service.customName)
          );
          if (!exists) {
            saveTask({
              id: `tsk_auto_ren_${service.id}`,
              clientId: service.clientId,
              title: taskTitle,
              dueDate: todayStr,
              priority: 'High',
              done: false,
              type: 'Renewal',
              autoGenerated: true,
            }).catch(() => {});
          }
        }
      }
    }
  }
}

// ==========================================
// MIGRATION & LOCAL STORAGE UTILITIES
// ==========================================

export function getLocalStorageData(): FullDatabase | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.clients) && parsed.clients.length > 0) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function migrateLocalStorageToFirestore(): Promise<{
  clients: number;
  services: number;
  payments: number;
  invoices: number;
  projects: number;
  tasks: number;
  expenses: number;
}> {
  setSyncState('saving');
  const localData = getLocalStorageData() || getInitialDatabase();

  const counts = {
    clients: localData.clients.length,
    services: localData.clientServices.length,
    payments: localData.payments.length,
    invoices: localData.invoices ? localData.invoices.length : 0,
    projects: localData.projects.length,
    tasks: localData.tasks.length,
    expenses: localData.expenses ? localData.expenses.length : 0,
  };

  try {
    // Write clients
    for (const item of localData.clients) {
      await setDoc(doc(db, 'clients', item.id), item);
    }
    // Write services
    for (const item of localData.clientServices) {
      await setDoc(doc(db, 'clientServices', item.id), item);
    }
    // Write payments
    for (const item of localData.payments) {
      await setDoc(doc(db, 'payments', item.id), item);
    }
    // Write invoices
    if (localData.invoices) {
      for (const item of localData.invoices) {
        await setDoc(doc(db, 'invoices', item.id), item);
      }
    }
    // Write projects
    for (const item of localData.projects) {
      await setDoc(doc(db, 'projects', item.id), item);
    }
    // Write tasks
    for (const item of localData.tasks) {
      await setDoc(doc(db, 'tasks', item.id), item);
    }
    // Write activities
    for (const item of localData.activities) {
      await setDoc(doc(db, 'activities', item.id), item);
    }
    // Write catalog
    for (const item of localData.catalog) {
      await setDoc(doc(db, 'catalog', item.id), item);
    }
    // Write expenses
    if (localData.expenses) {
      for (const item of localData.expenses) {
        await setDoc(doc(db, 'expenses', item.id), item);
      }
    }
    // Write settings
    await setDoc(doc(db, 'settings', 'agency'), localData.settings || DEFAULT_SETTINGS);

    setSyncState('saved');
    return counts;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'migration');
  }
}

// ==========================================
// EXPORT & IMPORT UTILITIES
// ==========================================

export function exportAllDataJson(): void {
  const jsonStr = JSON.stringify(currentDb, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dynasty_digital_crm_cloud_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importAllDataJson(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString) as FullDatabase;
    if (!parsed || !Array.isArray(parsed.clients)) {
      throw new Error('Invalid CRM JSON format');
    }

    setSyncState('saving');
    for (const c of parsed.clients) await setDoc(doc(db, 'clients', c.id), c);
    if (parsed.clientServices) {
      for (const s of parsed.clientServices) await setDoc(doc(db, 'clientServices', s.id), s);
    }
    if (parsed.payments) {
      for (const p of parsed.payments) await setDoc(doc(db, 'payments', p.id), p);
    }
    if (parsed.invoices) {
      for (const inv of parsed.invoices) await setDoc(doc(db, 'invoices', inv.id), inv);
    }
    if (parsed.projects) {
      for (const pr of parsed.projects) await setDoc(doc(db, 'projects', pr.id), pr);
    }
    if (parsed.tasks) {
      for (const t of parsed.tasks) await setDoc(doc(db, 'tasks', t.id), t);
    }
    if (parsed.activities) {
      for (const a of parsed.activities) await setDoc(doc(db, 'activities', a.id), a);
    }
    if (parsed.catalog) {
      for (const cat of parsed.catalog) await setDoc(doc(db, 'catalog', cat.id), cat);
    }
    if (parsed.expenses) {
      for (const exp of parsed.expenses) await setDoc(doc(db, 'expenses', exp.id), exp);
    }
    if (parsed.checklists) {
      for (const chk of parsed.checklists) await setDoc(doc(db, 'checklists', chk.id), chk);
    }
    if (parsed.checklistTemplates) {
      for (const tmpl of parsed.checklistTemplates) await setDoc(doc(db, 'checklistTemplates', tmpl.id), tmpl);
    }
    if (parsed.settings) {
      await setDoc(doc(db, 'settings', 'agency'), parsed.settings);
    }

    setSyncState('saved');
    return true;
  } catch (err) {
    console.error('Failed to import JSON data:', err);
    return false;
  }
}

export function exportClientsCsv(): void {
  const clients = currentDb.clients;
  const headers = [
    'Business Name',
    'Contact Name',
    'Status',
    'Email',
    'Phone',
    'Website',
    'Industry',
    'Lead Source',
    'City',
    'Address',
    'Date Added',
    'Where Access Lives',
    'Notes',
  ];

  const rows = clients.map((c) => [
    `"${(c.businessName || '').replace(/"/g, '""')}"`,
    `"${(c.contactName || '').replace(/"/g, '""')}"`,
    `"${c.status}"`,
    `"${(c.email || '').replace(/"/g, '""')}"`,
    `"${(c.phone || '').replace(/"/g, '""')}"`,
    `"${(c.website || '').replace(/"/g, '""')}"`,
    `"${c.industry}"`,
    `"${c.leadSource}"`,
    `"${(c.city || '').replace(/"/g, '""')}"`,
    `"${(c.address || '').replace(/"/g, '""')}"`,
    `"${c.dateAdded || ''}"`,
    `"${(c.accessInfo || '').replace(/"/g, '""')}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dynasty_digital_clients_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function clearSampleData(): Promise<void> {
  setSyncState('saving');
  for (const c of currentDb.clients) await deleteDoc(doc(db, 'clients', c.id));
  for (const s of currentDb.clientServices) await deleteDoc(doc(db, 'clientServices', s.id));
  for (const p of currentDb.payments) await deleteDoc(doc(db, 'payments', p.id));
  for (const inv of (currentDb.invoices || [])) await deleteDoc(doc(db, 'invoices', inv.id));
  for (const pr of currentDb.projects) await deleteDoc(doc(db, 'projects', pr.id));
  for (const t of currentDb.tasks) await deleteDoc(doc(db, 'tasks', t.id));
  for (const a of currentDb.activities) await deleteDoc(doc(db, 'activities', a.id));
  for (const exp of (currentDb.expenses || [])) await deleteDoc(doc(db, 'expenses', exp.id));
  for (const chk of (currentDb.checklists || [])) await deleteDoc(doc(db, 'checklists', chk.id));
  for (const perf of (currentDb.performanceEntries || [])) await deleteDoc(doc(db, 'performanceEntries', perf.id));
  for (const web of (currentDb.websites || [])) await deleteDoc(doc(db, 'websites', web.id));
  setSyncState('saved');
}

export async function restoreSampleData(): Promise<void> {
  setSyncState('saving');
  const sample = getInitialDatabase();
  for (const c of sample.clients) await setDoc(doc(db, 'clients', c.id), c);
  for (const s of sample.clientServices) await setDoc(doc(db, 'clientServices', s.id), s);
  for (const p of sample.payments) await setDoc(doc(db, 'payments', p.id), p);
  for (const inv of (sample.invoices || [])) await setDoc(doc(db, 'invoices', inv.id), inv);
  for (const pr of sample.projects) await setDoc(doc(db, 'projects', pr.id), pr);
  for (const t of sample.tasks) await setDoc(doc(db, 'tasks', t.id), t);
  for (const a of sample.activities) await setDoc(doc(db, 'activities', a.id), a);
  for (const cat of sample.catalog) await setDoc(doc(db, 'catalog', cat.id), cat);
  for (const exp of (sample.expenses || [])) await setDoc(doc(db, 'expenses', exp.id), exp);
  for (const chk of (sample.checklists || [])) await setDoc(doc(db, 'checklists', chk.id), chk);
  for (const tmpl of (sample.checklistTemplates || [])) await setDoc(doc(db, 'checklistTemplates', tmpl.id), tmpl);
  for (const perf of (sample.performanceEntries || [])) await setDoc(doc(db, 'performanceEntries', perf.id), perf);
  for (const web of (sample.websites || [])) await setDoc(doc(db, 'websites', web.id), web);
  await setDoc(doc(db, 'settings', 'agency'), sample.settings);
  setSyncState('saved');
}
