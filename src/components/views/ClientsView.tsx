import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Building2,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Archive,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ListChecks,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Client, ClientService, Payment, Industry, LeadSource, ClientStatus, ClientChecklist } from '../../types';
import {
  formatCurrency,
  formatDate,
  getClientMRR,
  getClientCommittedUntil,
  isClientOverdue,
  getClientChecklistsProgress,
  getUncontactedLeads,
} from '../../lib/calculations';
import { StatusBadge } from '../common/StatusBadge';

interface ClientsViewProps {
  clients: Client[];
  clientServices: ClientService[];
  payments: Payment[];
  checklists?: ClientChecklist[];
  onSelectClient: (clientId: string) => void;
  onOpenNewClient: () => void;
  onArchiveClient: (clientId: string) => void;
  onRestoreClient: (clientId: string) => void;
  onMarkLeadContacted?: (clientId: string) => Promise<void>;
  onOpenWebhookModal?: () => void;
}

type SortField = 'businessName' | 'status' | 'mrr' | 'servicesCount' | 'committedUntil' | 'lastActivity';
type SortOrder = 'asc' | 'desc';

export function ClientsView({
  clients,
  clientServices,
  payments,
  checklists = [],
  onSelectClient,
  onOpenNewClient,
  onArchiveClient,
  onRestoreClient,
  onMarkLeadContacted,
  onOpenWebhookModal,
}: ClientsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>('mrr');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const uncontactedLeads = useMemo(() => getUncontactedLeads(clients), [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Archive toggle
      if (showArchived ? !c.archived : c.archived) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          c.businessName.toLowerCase().includes(q) ||
          c.contactName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.city.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Status filter
      if (statusFilter === 'uncontacted_lead') {
        if (!(c.status === 'Lead' && c.leadContacted === false)) return false;
      } else if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }

      // Industry filter
      if (industryFilter !== 'all' && c.industry !== industryFilter) return false;

      // Source filter
      if (sourceFilter !== 'all' && c.leadSource !== sourceFilter) return false;

      return true;
    });
  }, [clients, showArchived, searchQuery, statusFilter, industryFilter, sourceFilter]);

  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'businessName') {
        valA = a.businessName.toLowerCase();
        valB = b.businessName.toLowerCase();
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (sortField === 'mrr') {
        valA = getClientMRR(clientServices, a.id);
        valB = getClientMRR(clientServices, b.id);
      } else if (sortField === 'servicesCount') {
        valA = clientServices.filter((s) => s.clientId === a.id && s.status === 'Active').length;
        valB = clientServices.filter((s) => s.clientId === b.id && s.status === 'Active').length;
      } else if (sortField === 'committedUntil') {
        valA = getClientCommittedUntil(clientServices, a.id) || '0000';
        valB = getClientCommittedUntil(clientServices, b.id) || '0000';
      } else if (sortField === 'lastActivity') {
        valA = a.lastActivityDate || a.dateAdded;
        valB = b.lastActivityDate || b.dateAdded;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredClients, sortField, sortOrder, clientServices]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const industries = Array.from(new Set(clients.map((c) => c.industry))).filter(Boolean);
  const sources = Array.from(new Set(clients.map((c) => c.leadSource))).filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filters & Actions */}
      <div className="p-4 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#A9ADC6]" />
          <input
            type="text"
            placeholder="Search clients by business, contact, phone, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs sm:text-sm text-white placeholder-[#A9ADC6]/40"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] rounded-lg text-xs text-white"
          >
            <option value="all">All Statuses</option>
            {uncontactedLeads.length > 0 && (
              <option value="uncontacted_lead">⚡ Uncontacted Leads ({uncontactedLeads.length})</option>
            )}
            <option value="Active Client">Active Clients</option>
            <option value="Lead">Leads</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Paused">Paused</option>
            <option value="Past Client">Past Clients</option>
            <option value="Lost">Lost</option>
          </select>

          {/* Industry Filter */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] rounded-lg text-xs text-white"
          >
            <option value="all">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          {/* Lead Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] rounded-lg text-xs text-white"
          >
            <option value="all">All Sources</option>
            {sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>

          {/* Show Archived Toggle */}
          <button
            onClick={() => setShowArchived((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              showArchived
                ? 'bg-[#FF5A5F]/15 border-[#FF5A5F]/40 text-[#FF5A5F]'
                : 'bg-[#07080F] border-[#262A40] text-[#A9ADC6] hover:text-white'
            }`}
          >
            {showArchived ? 'Showing Archived' : 'Active Only'}
          </button>

          {/* Lead Webhook / Zapier API Button */}
          {onOpenWebhookModal && (
            <button
              onClick={onOpenWebhookModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B2C] hover:bg-[#262A40] border border-[#262A40] text-xs font-mono text-[#22D3EE] transition-colors cursor-pointer"
              title="View Inbound Leads Webhook & Zapier Configuration"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Inbound Leads API</span>
            </button>
          )}

          {/* Add Client Button */}
          <button
            onClick={onOpenNewClient}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="rounded-2xl bg-[#11131F] border border-[#262A40] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262A40] bg-[#07080F]/60 text-[11px] font-mono uppercase tracking-wider text-[#A9ADC6]">
                <th
                  onClick={() => toggleSort('businessName')}
                  className="py-3 px-4 cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Business / Contact</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('status')}
                  className="py-3 px-4 cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('mrr')}
                  className="py-3 px-4 cursor-pointer hover:text-white select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Retainer MRR</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('servicesCount')}
                  className="py-3 px-4 cursor-pointer hover:text-white select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Services</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center select-none">
                  <div className="flex items-center justify-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-[#22D3EE]" />
                    <span>Checklist</span>
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('committedUntil')}
                  className="py-3 px-4 cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Committed Until</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('lastActivity')}
                  className="py-3 px-4 cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Last Activity</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262A40]/40 text-xs">
              {sortedClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#A9ADC6]">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-[#262A40]" />
                    <p className="font-medium text-white text-sm">No clients match your filter criteria.</p>
                    <p className="text-xs mt-1 text-[#A9ADC6]/70">
                      Try clearing search filters or add a new agency lead.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedClients.map((client) => {
                  const mrr = getClientMRR(clientServices, client.id);
                  const activeServices = clientServices.filter(
                    (s) => s.clientId === client.id && s.status === 'Active'
                  );
                  const committedUntil = getClientCommittedUntil(clientServices, client.id);
                  const overdue = isClientOverdue(client, clientServices, payments);

                  return (
                    <tr
                      key={client.id}
                      onClick={() => onSelectClient(client.id)}
                      className={`hover:bg-[#181B2C]/70 transition-colors cursor-pointer group ${
                        overdue ? 'bg-[#FF5A5F]/5' : ''
                      }`}
                    >
                      {/* Business & Contact Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {overdue ? (
                            <span title="Overdue Retainer Payment" className="text-[#FF5A5F]">
                              <ShieldAlert className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                          )}
                          <div>
                            <div className="font-semibold text-white group-hover:text-[#22D3EE] transition-colors flex items-center gap-2">
                              <span>{client.businessName}</span>
                              {overdue && (
                                <span className="font-mono text-[9px] text-[#FF5A5F] bg-[#FF5A5F]/15 border border-[#FF5A5F]/30 px-1.5 py-0.2 rounded">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#A9ADC6] mt-0.5 flex items-center gap-2">
                              <span>{client.contactName || 'No contact'}</span>
                              <span>·</span>
                              <span>{client.city}</span>
                              <span>·</span>
                              <span className="text-[#A9ADC6]/70">{client.industry}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={client.status} size="sm" />
                          {client.status === 'Lead' && client.leadContacted === false && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/40 animate-pulse">
                              <Zap className="w-2.5 h-2.5" />
                              <span>UNCONTACTED</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* MRR */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-bold text-white text-sm">
                          {formatCurrency(mrr)}
                        </span>
                        <span className="text-[10px] text-[#A9ADC6] block">/month</span>
                      </td>

                      {/* Active Services Count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-medium text-xs bg-[#07080F] border border-[#262A40] px-2 py-0.5 rounded text-[#22D3EE]">
                          {activeServices.length} {activeServices.length === 1 ? 'service' : 'services'}
                        </span>
                      </td>

                      {/* Checklist Progress */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        {(() => {
                          const progress = getClientChecklistsProgress(checklists, client.id);
                          if (progress.count === 0) {
                            return (
                              <span className="text-[11px] text-[#A9ADC6]/40 italic font-mono">
                                —
                              </span>
                            );
                          }
                          const isComplete = progress.percent === 100;
                          return (
                            <div className="inline-flex flex-col items-center gap-1 min-w-[90px]">
                              <div className="flex items-center justify-between w-full text-[10px] font-mono">
                                <span
                                  className={`font-bold ${
                                    isComplete
                                      ? 'text-[#7CFF6B]'
                                      : progress.percent >= 50
                                      ? 'text-[#22D3EE]'
                                      : 'text-[#A9ADC6]'
                                  }`}
                                >
                                  {progress.percent}%
                                </span>
                                <span className="text-[#A9ADC6]/60">
                                  {progress.completed}/{progress.total}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-[#07080F] border border-[#262A40] overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isComplete
                                      ? 'bg-[#7CFF6B]'
                                      : progress.percent >= 50
                                      ? 'bg-[#22D3EE]'
                                      : 'bg-[#3D5AFE]'
                                  }`}
                                  style={{ width: `${progress.percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Committed Until */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-[#A9ADC6]">
                        {committedUntil ? (
                          <span className="text-white">{formatDate(committedUntil)}</span>
                        ) : (
                          <span className="text-[#A9ADC6]/50">Month-to-month</span>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-[#A9ADC6] font-mono">
                        {formatDate(client.lastActivityDate || client.dateAdded)}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {client.status === 'Lead' && client.leadContacted === false && onMarkLeadContacted && (
                            <button
                              onClick={() => onMarkLeadContacted(client.id)}
                              className="px-2 py-1 rounded bg-[#3D5AFE] hover:bg-[#324CDD] text-white text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer mr-1"
                              title="Mark lead as contacted"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Contacted</span>
                            </button>
                          )}
                          {client.phone && (
                            <a
                              href={`tel:${client.phone}`}
                              className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-[#7CFF6B] hover:bg-[#07080F]"
                              title={`Call ${client.phone}`}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {client.email && (
                            <a
                              href={`mailto:${client.email}`}
                              className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-[#22D3EE] hover:bg-[#07080F]"
                              title={`Email ${client.email}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {client.archived ? (
                            <button
                              onClick={() => onRestoreClient(client.id)}
                              className="p-1.5 rounded-lg text-[#7CFF6B] hover:bg-[#07080F]"
                              title="Restore Client"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => onArchiveClient(client.id)}
                              className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-[#FF5A5F] hover:bg-[#07080F]"
                              title="Archive Client"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectClient(client.id)}
                            className="p-1.5 rounded-lg text-[#A9ADC6] group-hover:text-white"
                          >
                            <ChevronRight className="w-4 h-4" />
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
