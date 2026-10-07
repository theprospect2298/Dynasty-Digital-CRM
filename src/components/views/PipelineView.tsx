import React from 'react';
import {
  Kanban,
  Plus,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Building2,
  DollarSign,
  ArrowRight,
  ListChecks,
} from 'lucide-react';
import { Client, ClientService, ClientStatus, ClientChecklist } from '../../types';
import { formatCurrency, getClientMRR, getClientChecklistsProgress } from '../../lib/calculations';
import { StatusBadge } from '../common/StatusBadge';

interface PipelineViewProps {
  clients: Client[];
  clientServices: ClientService[];
  checklists?: ClientChecklist[];
  onSelectClient: (clientId: string) => void;
  onOpenNewClient: (status: ClientStatus) => void;
  onChangeClientStatus: (clientId: string, newStatus: ClientStatus) => void;
}

const PIPELINE_COLUMNS: { id: ClientStatus; label: string; description: string; color: string }[] = [
  { id: 'Lead', label: 'Inbound Leads', description: 'New discoveries & outreach', color: 'border-[#22D3EE]/40 text-[#22D3EE]' },
  { id: 'Proposal Sent', label: 'Proposal Sent', description: 'Quotes & scopes delivered', color: 'border-[#F5A524]/40 text-[#F5A524]' },
  { id: 'Active Client', label: 'Active Retainers', description: 'Signed & paying clients', color: 'border-[#7CFF6B]/40 text-[#7CFF6B]' },
  { id: 'Paused', label: 'Paused / On Hold', description: 'Temporary service freeze', color: 'border-[#A9ADC6]/40 text-[#A9ADC6]' },
];

export function PipelineView({
  clients,
  clientServices,
  checklists = [],
  onSelectClient,
  onOpenNewClient,
  onChangeClientStatus,
}: PipelineViewProps) {
  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#11131F] border border-[#262A40]">
        <div>
          <h2 className="text-base font-semibold text-white">Agency Sales & Client Pipeline</h2>
          <p className="text-xs text-[#A9ADC6]">
            Drag or transition accounts across deal stages from Lead to Active Retainer
          </p>
        </div>
        <button
          onClick={() => onOpenNewClient('Lead')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-medium text-white transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Lead</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {PIPELINE_COLUMNS.map((col) => {
          const colClients = clients.filter((c) => !c.archived && c.status === col.id);

          // Calculate total pipeline value in this column
          const totalColMRR = colClients.reduce(
            (sum, c) => sum + getClientMRR(clientServices, c.id),
            0
          );

          return (
            <div
              key={col.id}
              className="rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-[#262A40] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${col.color}`}>{col.label}</h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#07080F] border border-[#262A40] text-white">
                      {colClients.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#A9ADC6] mt-0.5 block">{col.description}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#A9ADC6] block">MRR Value</span>
                  <span className="font-mono text-xs font-bold text-white">
                    {formatCurrency(totalColMRR)}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
                {colClients.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#A9ADC6]/50 italic">
                    No accounts in {col.label}
                  </div>
                ) : (
                  colClients.map((client) => {
                    const mrr = getClientMRR(clientServices, client.id);
                    const lastAct = client.lastActivityDate
                      ? new Date(client.lastActivityDate)
                      : new Date(client.dateAdded);
                    const daysInStage = Math.floor(
                      (now.getTime() - lastAct.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={client.id}
                        className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] hover:border-[#22D3EE]/50 transition-all shadow-sm space-y-2.5 group"
                      >
                        {/* Title & MRR */}
                        <div className="flex items-start justify-between">
                          <div
                            onClick={() => onSelectClient(client.id)}
                            className="cursor-pointer"
                          >
                            <h4 className="text-xs font-semibold text-white group-hover:text-[#22D3EE] transition-colors">
                              {client.businessName}
                            </h4>
                            <span className="text-[11px] text-[#A9ADC6]">
                              {client.contactName || 'No contact'} · {client.city}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold text-[#7CFF6B]">
                            {mrr > 0 ? `${formatCurrency(mrr)}/mo` : 'Prospective'}
                          </span>
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center justify-between text-[10px] text-[#A9ADC6] font-mono pt-1 border-t border-[#262A40]/40">
                          <span>{client.industry}</span>
                          <span>{daysInStage}d in stage</span>
                          <span className="text-[#22D3EE]">{client.leadSource}</span>
                        </div>

                        {/* Checklist progress row */}
                        {(() => {
                          const progress = getClientChecklistsProgress(checklists, client.id);
                          if (progress.count === 0) return null;
                          const isComplete = progress.percent === 100;
                          return (
                            <div className="pt-1 border-t border-[#262A40]/30 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="flex items-center gap-1 text-[#A9ADC6]">
                                  <ListChecks className="w-3 h-3 text-[#22D3EE]" />
                                  <span>Checklist:</span>
                                </span>
                                <span
                                  className={`font-bold ${
                                    isComplete
                                      ? 'text-[#7CFF6B]'
                                      : progress.percent >= 50
                                      ? 'text-[#22D3EE]'
                                      : 'text-white'
                                  }`}
                                >
                                  {progress.completed}/{progress.total} ({progress.percent}%)
                                </span>
                              </div>
                              <div className="w-full h-1 rounded-full bg-[#11131F] border border-[#262A40] overflow-hidden">
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

                        {/* Quick stage advance buttons */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-1.5">
                            {client.phone && (
                              <a
                                href={`tel:${client.phone}`}
                                className="p-1 rounded text-[#A9ADC6] hover:text-[#7CFF6B] hover:bg-[#11131F]"
                                title="Call"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                            {client.email && (
                              <a
                                href={`mailto:${client.email}`}
                                className="p-1 rounded text-[#A9ADC6] hover:text-[#22D3EE] hover:bg-[#11131F]"
                                title="Email"
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {/* Stage Transition Control */}
                          <div className="flex items-center gap-1">
                            {col.id === 'Lead' && (
                              <button
                                onClick={() => onChangeClientStatus(client.id, 'Proposal Sent')}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F5A524]/15 hover:bg-[#F5A524]/30 text-[10px] font-mono text-[#F5A524] transition-colors"
                              >
                                <span>Proposal</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {col.id === 'Proposal Sent' && (
                              <button
                                onClick={() => onChangeClientStatus(client.id, 'Active Client')}
                                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#7CFF6B]/15 hover:bg-[#7CFF6B]/30 text-[10px] font-mono text-[#7CFF6B] transition-colors"
                              >
                                <span>Close Active</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {col.id === 'Active Client' && (
                              <button
                                onClick={() => onChangeClientStatus(client.id, 'Paused')}
                                className="px-2 py-0.5 rounded bg-[#262A40] hover:bg-[#181B2C] text-[10px] font-mono text-[#A9ADC6]"
                              >
                                Pause
                              </button>
                            )}
                            {col.id === 'Paused' && (
                              <button
                                onClick={() => onChangeClientStatus(client.id, 'Active Client')}
                                className="px-2 py-0.5 rounded bg-[#7CFF6B]/15 hover:bg-[#7CFF6B]/30 text-[10px] font-mono text-[#7CFF6B]"
                              >
                                Reactivate
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
