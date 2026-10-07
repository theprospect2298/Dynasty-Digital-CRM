import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, DollarSign, Briefcase, ChevronRight, Phone, Mail } from 'lucide-react';
import { Client, ClientService, Payment } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { StatusBadge } from '../common/StatusBadge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  clientServices: ClientService[];
  payments: Payment[];
  onSelectClient: (clientId: string) => void;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  clients,
  clientServices,
  payments,
  onSelectClient,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingClients = q
    ? clients.filter(
        (c) =>
          c.businessName.toLowerCase().includes(q) ||
          c.contactName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
      )
    : clients.slice(0, 5);

  const matchingServices = q
    ? clientServices.filter(
        (s) =>
          s.customName.toLowerCase().includes(q) ||
          (s.category && s.category.toLowerCase().includes(q))
      )
    : [];

  const matchingPayments = q
    ? payments.filter(
        (p) =>
          p.invoiceNumber.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-16 sm:pt-24">
      <div className="relative w-full max-w-xl bg-[#11131F] border border-[#262A40] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#262A40] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#22D3EE] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by business, contact, phone, invoice #..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-[#A9ADC6]/40"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-[#A9ADC6] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] font-mono bg-[#07080F] border border-[#262A40] px-1.5 py-0.5 rounded text-[#A9ADC6]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-[#262A40]/40">
          {/* Client Matches */}
          <div className="py-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADC6] px-3 mb-1.5 block">
              {q ? `Clients (${matchingClients.length})` : 'Recent Clients'}
            </span>
            {matchingClients.length === 0 ? (
              <p className="text-xs text-[#A9ADC6]/60 px-3 py-2 italic">No clients matching "{query}"</p>
            ) : (
              matchingClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectClient(c.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#181B2C] text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#07080F] border border-[#262A40] flex items-center justify-center text-[#22D3EE]">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white group-hover:text-[#22D3EE] transition-colors">
                          {c.businessName}
                        </span>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#A9ADC6] mt-0.5">
                        <span>{c.contactName || 'No contact'}</span>
                        {c.phone && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{c.phone}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{c.city}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A9ADC6] group-hover:text-white transition-colors" />
                </button>
              ))
            )}
          </div>

          {/* Service Matches */}
          {matchingServices.length > 0 && (
            <div className="py-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADC6] px-3 mb-1.5 block">
                Active Services ({matchingServices.length})
              </span>
              {matchingServices.slice(0, 4).map((s) => {
                const parent = clients.find((c) => c.id === s.clientId);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectClient(s.clientId);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#181B2C] text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#07080F] border border-[#262A40] flex items-center justify-center text-[#F5A524]">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white group-hover:text-[#22D3EE]">
                          {s.customName}
                        </div>
                        <div className="text-[11px] text-[#A9ADC6]">
                          {parent?.businessName} · {formatCurrency(s.price)}/{s.billingType === 'monthly' ? 'mo' : 'one-time'}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={s.status} size="sm" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Payment Matches */}
          {matchingPayments.length > 0 && (
            <div className="py-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A9ADC6] px-3 mb-1.5 block">
                Invoices & Payments ({matchingPayments.length})
              </span>
              {matchingPayments.slice(0, 4).map((p) => {
                const parent = clients.find((c) => c.id === p.clientId);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectClient(p.clientId);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-[#181B2C] text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#07080F] border border-[#262A40] flex items-center justify-center text-[#7CFF6B]">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white font-mono">
                          {p.invoiceNumber} · {formatCurrency(p.amount)}
                        </div>
                        <div className="text-[11px] text-[#A9ADC6]">
                          {parent?.businessName} · {p.date} · {p.method}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={p.status} size="sm" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
