import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Layers,
  Sparkles,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Client, ClientChecklist, ChecklistTemplate, ClientService } from '../../types';
import { getChecklistProgress, formatDate } from '../../lib/calculations';

interface ClientChecklistsTabProps {
  client: Client;
  clientServices: ClientService[];
  checklists: ClientChecklist[];
  templates: ChecklistTemplate[];
  onToggleItem: (checklistId: string, itemId: string) => void;
  onAddItem: (checklistId: string, label: string) => void;
  onDeleteItem: (checklistId: string, itemId: string) => void;
  onDeleteChecklist: (checklistId: string) => void;
  onCreateFromTemplate: (
    clientId: string,
    templateId: string,
    serviceId?: string,
    title?: string
  ) => void;
}

export function ClientChecklistsTab({
  client,
  clientServices,
  checklists,
  templates,
  onToggleItem,
  onAddItem,
  onDeleteItem,
  onDeleteChecklist,
  onCreateFromTemplate,
}: ClientChecklistsTabProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || 'tmpl_website_build'
  );
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  const clientChecklists = checklists.filter((c) => c.clientId === client.id);

  // Overall client progress
  let totalItems = 0;
  let completedItems = 0;
  clientChecklists.forEach((chk) => {
    totalItems += chk.items?.length || 0;
    completedItems += chk.items?.filter((i) => i.completed).length || 0;
  });
  const overallPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleAddNewItem = (checklistId: string) => {
    const text = newItemInputs[checklistId]?.trim();
    if (!text) return;
    onAddItem(checklistId, text);
    setNewItemInputs((prev) => ({ ...prev, [checklistId]: '' }));
  };

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;
    const template = templates.find((t) => t.id === selectedTemplateId);
    const service = clientServices.find((s) => s.id === selectedServiceId);
    const title =
      customTitle.trim() ||
      (service
        ? `${template?.name || 'Onboarding'}: ${service.customName}`
        : `${template?.name || 'Onboarding'} Checklist`);

    onCreateFromTemplate(
      client.id,
      selectedTemplateId,
      selectedServiceId || undefined,
      title
    );

    setIsCreateModalOpen(false);
    setCustomTitle('');
    setSelectedServiceId('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Progress Summary */}
      <div className="p-5 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Client Onboarding & Service Checklists</h3>
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[#07080F] border border-[#262A40] text-[#22D3EE]">
              {clientChecklists.length} active {clientChecklists.length === 1 ? 'checklist' : 'checklists'}
            </span>
          </div>
          <p className="text-xs text-[#A9ADC6] mt-1">
            Automated delivery checklists generated from templates when services are attached to {client.businessName}.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-semibold text-white transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Attach From Template</span>
          </button>
        </div>
      </div>

      {/* Progress Metric Card */}
      {clientChecklists.length > 0 && (
        <div className="p-4 rounded-xl bg-[#0E0F17] border border-[#262A40] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="text-[#A9ADC6] font-medium">Overall Client Onboarding Completion</span>
              <span className="font-mono font-bold text-white">
                {completedItems} of {totalItems} items ({overallPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#181B2C] overflow-hidden border border-[#262A40]">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  overallPercent === 100
                    ? 'bg-[#7CFF6B]'
                    : overallPercent >= 50
                    ? 'bg-[#22D3EE]'
                    : 'bg-[#3D5AFE]'
                }`}
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Checklists List */}
      {clientChecklists.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#11131F] border border-[#262A40] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#181B2C] border border-[#262A40] flex items-center justify-center mx-auto text-[#22D3EE]">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-sm font-semibold text-white">No Checklists Attached Yet</h4>
            <p className="text-xs text-[#A9ADC6] mt-1">
              Select one of Dynasty Digital's pre-built delivery templates below to start tracking client onboarding and quality control.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => onCreateFromTemplate(client.id, tmpl.id, undefined, `${tmpl.name}: ${client.businessName}`)}
                className="px-3.5 py-2 rounded-xl bg-[#181B2C] hover:bg-[#22D3EE]/15 hover:text-[#22D3EE] border border-[#262A40] hover:border-[#22D3EE]/40 text-xs font-medium text-white transition-all flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ {tmpl.name} ({tmpl.items.length} items)</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {clientChecklists.map((chk) => {
            const { total, completed, percent } = getChecklistProgress(chk);
            const isFinished = total > 0 && completed === total;
            const linkedService = clientServices.find((s) => s.id === chk.serviceId);

            return (
              <div
                key={chk.id}
                className="rounded-2xl bg-[#11131F] border border-[#262A40] overflow-hidden transition-all shadow-sm"
              >
                {/* Checklist Card Header */}
                <div className="p-4 sm:p-5 border-b border-[#262A40] bg-[#0E0F17]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">{chk.title}</h4>
                      {isFinished ? (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-[#7CFF6B]/15 text-[#7CFF6B] border border-[#7CFF6B]/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>100% COMPLETED</span>
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30">
                          {percent}% PROGRESS
                        </span>
                      )}
                    </div>
                    {linkedService && (
                      <span className="text-[11px] text-[#A9ADC6] font-mono mt-1 block">
                        Linked Service: <strong className="text-white">{linkedService.customName}</strong> ({linkedService.category})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-white">
                        {completed}/{total} completed
                      </span>
                      <span className="text-[10px] text-[#A9ADC6] block">
                        {total - completed} remaining
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete checklist "${chk.title}"?`)) {
                          onDeleteChecklist(chk.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-[#FF5A5F] hover:bg-[#181B2C] transition-colors"
                      title="Delete Checklist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[#181B2C]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFinished ? 'bg-[#7CFF6B]' : 'bg-[#22D3EE]'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Checklist Items */}
                <div className="p-4 sm:p-5 space-y-2">
                  <div className="space-y-1.5 divide-y divide-[#262A40]/40">
                    {chk.items.map((item, idx) => {
                      return (
                        <div
                          key={item.id}
                          onClick={() => onToggleItem(chk.id, item.id)}
                          className={`pt-2 pb-1.5 px-2 rounded-lg flex items-start justify-between gap-3 cursor-pointer group transition-colors ${
                            item.completed
                              ? 'bg-[#0E0F17]/30 hover:bg-[#0E0F17]/60'
                              : 'hover:bg-[#181B2C]/50'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              className={`mt-0.5 shrink-0 transition-colors ${
                                item.completed
                                  ? 'text-[#7CFF6B]'
                                  : 'text-[#A9ADC6] group-hover:text-[#22D3EE]'
                              }`}
                            >
                              {item.completed ? (
                                <CheckCircle2 className="w-4 h-4 fill-[#7CFF6B]/20" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <span
                                className={`text-xs block leading-relaxed ${
                                  item.completed
                                    ? 'line-through text-[#A9ADC6]/60 font-medium'
                                    : 'text-white font-medium group-hover:text-[#22D3EE]'
                                }`}
                              >
                                {item.label}
                              </span>
                              {item.completedAt && (
                                <span className="text-[10px] text-[#A9ADC6]/50 font-mono mt-0.5 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>Completed {formatDate(item.completedAt)}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem(chk.id, item.id);
                            }}
                            className="p-1 rounded text-[#A9ADC6]/40 hover:text-[#FF5A5F] opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove step"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add item row */}
                  <div className="pt-3 border-t border-[#262A40]/50 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="+ Add step or requirement..."
                      value={newItemInputs[chk.id] || ''}
                      onChange={(e) =>
                        setNewItemInputs((prev) => ({ ...prev, [chk.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewItem(chk.id);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#0E0F17] border border-[#262A40] text-xs text-white placeholder-[#A9ADC6]/50 focus:outline-none focus:border-[#22D3EE]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddNewItem(chk.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#181B2C] hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] text-xs font-medium text-[#A9ADC6] border border-[#262A40] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attach Checklist Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#11131F] border border-[#262A40] p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Attach Checklist From Template</h3>
              <p className="text-xs text-[#A9ADC6] mt-1">
                Choose a workflow template to generate a quality checklist for {client.businessName}.
              </p>
            </div>

            <form onSubmit={handleCreateChecklist} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A9ADC6] mb-1.5">
                  Select Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.items.length} items)
                    </option>
                  ))}
                </select>
                {selectedTemplateId && (
                  <p className="text-[11px] text-[#A9ADC6] mt-1.5 italic">
                    {templates.find((t) => t.id === selectedTemplateId)?.description}
                  </p>
                )}
              </div>

              {clientServices.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[#A9ADC6] mb-1.5">
                    Link to Client Service (Optional)
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-xs text-white focus:outline-none focus:border-[#22D3EE]"
                  >
                    <option value="">None / General Onboarding</option>
                    {clientServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.customName} ({s.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#A9ADC6] mb-1.5">
                  Checklist Custom Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Website Build: Florida Landing Page"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07080F] border border-[#262A40] text-xs text-white placeholder-[#A9ADC6]/40 focus:outline-none focus:border-[#22D3EE]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262A40]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181B2C] hover:bg-[#262A40] text-xs font-medium text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#3D5AFE] hover:bg-[#324bda] text-xs font-semibold text-white transition-colors"
                >
                  Create Checklist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
