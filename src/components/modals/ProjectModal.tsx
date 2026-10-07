import React, { useState } from 'react';
import { X, FolderGit2, Link as LinkIcon, Calendar } from 'lucide-react';
import { Client, Project, ProjectStage } from '../../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project> & { clientId: string; name: string }) => void;
  clients: Client[];
  preselectedClientId?: string;
  initialData?: Project | null;
}

const STAGES: ProjectStage[] = [
  'Mockup',
  'Proposal',
  'Deposit Paid',
  'Design',
  'Build',
  'Review',
  'Final Payment',
  'Launched',
];

export function ProjectModal({
  isOpen,
  onClose,
  onSave,
  clients,
  preselectedClientId,
  initialData,
}: ProjectModalProps) {
  const [clientId, setClientId] = useState(
    initialData?.clientId || preselectedClientId || (clients[0]?.id || '')
  );
  const [name, setName] = useState(initialData?.name || '');
  const [stage, setStage] = useState<ProjectStage>(initialData?.stage || 'Mockup');
  const [mockupDue, setMockupDue] = useState(initialData?.mockupDue || '');
  const [targetLaunch, setTargetLaunch] = useState(initialData?.targetLaunch || '');
  const [depositPaid, setDepositPaid] = useState<boolean>(initialData?.depositPaid ?? false);
  const [finalPaid, setFinalPaid] = useState<boolean>(initialData?.finalPaid ?? false);
  const [previewLink, setPreviewLink] = useState(initialData?.previewLink || '');
  const [liveLink, setLiveLink] = useState(initialData?.liveLink || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    onSave({
      id: initialData?.id,
      clientId,
      name: name.trim(),
      stage,
      mockupDue: mockupDue || undefined,
      targetLaunch: targetLaunch || undefined,
      depositPaid,
      finalPaid,
      previewLink: previewLink.trim() || undefined,
      liveLink: liveLink.trim() || undefined,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#262A40] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#3D5AFE]/15 text-[#3D5AFE]">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-white">
                {initialData ? 'Edit Project' : 'New Website Build Project'}
              </h2>
              <p className="text-xs text-[#A9ADC6]">
                Track mockup delivery, design stages, milestones & launches
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

          {/* Client Selection */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Client Account <span className="text-[#FF5A5F]">*</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={!!preselectedClientId && !initialData}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#11131F]">
                  {c.businessName} ({c.contactName || c.status})
                </option>
              ))}
            </select>
          </div>

          {/* Project Name */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Project Name <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 5-Page Brand Redesign & Local SEO Funnel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
            />
          </div>

          {/* Project Stage */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as ProjectStage)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white font-mono"
            >
              {STAGES.map((st) => (
                <option key={st} value={st} className="bg-[#11131F]">
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Due Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Mockup Delivery Target
              </label>
              <input
                type="date"
                value={mockupDue}
                onChange={(e) => setMockupDue(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Target Launch Date
              </label>
              <input
                type="date"
                value={targetLaunch}
                onChange={(e) => setTargetLaunch(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Payment Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl bg-[#07080F] border border-[#262A40]">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={depositPaid}
                onChange={(e) => setDepositPaid(e.target.checked)}
                className="w-4 h-4 rounded border-[#262A40] bg-[#11131F] text-[#7CFF6B] focus:ring-0"
              />
              <span className="text-xs text-white">Deposit Paid (50%)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={finalPaid}
                onChange={(e) => setFinalPaid(e.target.checked)}
                className="w-4 h-4 rounded border-[#262A40] bg-[#11131F] text-[#7CFF6B] focus:ring-0"
              />
              <span className="text-xs text-white">Final Payment Received</span>
            </label>
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Preview / Figma Link
              </label>
              <input
                type="text"
                placeholder="https://preview.dynastysites.net/..."
                value={previewLink}
                onChange={(e) => setPreviewLink(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white placeholder-[#A9ADC6]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
                Live URL
              </label>
              <input
                type="text"
                placeholder="https://clientdomain.com"
                value={liveLink}
                onChange={(e) => setLiveLink(e.target.value)}
                className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white placeholder-[#A9ADC6]/40"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Scope & Deliverables Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Client requested dark mode theme, WhatsApp booking button, fast Vercel hosting"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white placeholder-[#A9ADC6]/40"
            />
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
              {initialData ? 'Save Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
