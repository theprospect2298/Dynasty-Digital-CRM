import React, { useState } from 'react';
import { X, CheckSquare } from 'lucide-react';
import { Client, Task, TaskPriority, TaskType } from '../../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task> & { title: string }) => void;
  clients: Client[];
  preselectedClientId?: string;
  initialData?: Task | null;
}

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];
const TYPES: TaskType[] = ['Follow-up', 'Build', 'Monthly Care', 'Report', 'Renewal', 'Other'];

export function TaskModal({
  isOpen,
  onClose,
  onSave,
  clients,
  preselectedClientId,
  initialData,
}: TaskModalProps) {
  const [clientId, setClientId] = useState(
    initialData?.clientId || preselectedClientId || ''
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [dueDate, setDueDate] = useState(
    initialData?.dueDate || new Date().toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority || 'Medium');
  const [type, setType] = useState<TaskType>(initialData?.type || 'Other');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    onSave({
      id: initialData?.id,
      clientId: clientId || undefined,
      title: title.trim(),
      dueDate,
      priority,
      type,
      done: initialData?.done ?? false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#262A40] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#22D3EE]/15 text-[#22D3EE]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {initialData ? 'Edit Task' : 'Add Agency Task'}
              </h2>
              <p className="text-xs text-[#A9ADC6]">
                Follow-ups, client deliverables, reports & deadlines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[#FF5A5F]/10 border border-[#FF5A5F]/30 text-[#FF5A5F] text-xs font-mono">
              {error}
            </div>
          )}

          {/* Task Title */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Task Description <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Call Mateo regarding new ad budget increase"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
            />
          </div>

          {/* Associated Client */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Associated Client (Optional)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
            >
              <option value="">-- General Agency Task --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#11131F]">
                  {c.businessName} ({c.contactName || c.status})
                </option>
              ))}
            </select>
          </div>

          {/* Due Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="bg-[#11131F]">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Category / Type */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Workflow Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
            >
              {TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#11131F]">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-[#262A40] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#262A40] text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] text-white text-xs font-medium transition-all shadow-md shadow-[#3D5AFE]/20"
            >
              {initialData ? 'Save Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
