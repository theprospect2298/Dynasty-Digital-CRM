import React, { useState } from 'react';
import { X, MessageSquare, PhoneCall, Mail, MessageCircle, Users } from 'lucide-react';
import { ActivityType } from '../../types';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (type: ActivityType, title: string, description: string) => void;
  clientName: string;
}

export function ActivityModal({ isOpen, onClose, onSave, clientName }: ActivityModalProps) {
  const [type, setType] = useState<ActivityType>('call');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title / summary is required.');
      return;
    }

    onSave(type, title.trim(), description.trim());
    onClose();
  };

  const types: { id: ActivityType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'call', label: 'Call', icon: PhoneCall },
    { id: 'text', label: 'Text / WhatsApp', icon: MessageCircle },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'meeting', label: 'Meeting', icon: Users },
    { id: 'note', label: 'Internal Note', icon: MessageSquare },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-[#262A40] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Log Interaction</h2>
            <p className="text-xs text-[#A9ADC6]">Add communication note for {clientName}</p>
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
            <div className="p-2.5 rounded-lg bg-[#FF5A5F]/10 border border-[#FF5A5F]/30 text-[#FF5A5F] text-xs font-mono">
              {error}
            </div>
          )}

          {/* Activity Type Segmented Selector */}
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {types.map((t) => {
              const Icon = t.icon;
              const isActive = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg text-xs font-medium border transition-all ${
                    isActive
                      ? 'bg-[#3D5AFE]/20 text-[#22D3EE] border-[#22D3EE]'
                      : 'bg-[#07080F] text-[#A9ADC6] border-[#262A40] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[10px]">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Headline / Topic <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Discussed Q4 holiday promo ad spend"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-sm text-white placeholder-[#A9ADC6]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A9ADC6] mb-1">
              Details & Next Steps
            </label>
            <textarea
              rows={3}
              placeholder="Client agreed to add $500 to ad budget starting next Tuesday..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#07080F] border border-[#262A40] focus:border-[#22D3EE] focus:outline-none rounded-lg text-xs text-white placeholder-[#A9ADC6]/40"
            />
          </div>

          <div className="pt-3 border-t border-[#262A40] flex items-center justify-end gap-3">
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
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
