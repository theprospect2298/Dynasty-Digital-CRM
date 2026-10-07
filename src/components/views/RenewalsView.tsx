import React, { useState } from 'react';
import {
  Repeat,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Client, ClientService } from '../../types';
import {
  formatCurrency,
  formatDate,
  getDaysRemaining,
  getServiceContractValue,
  getServiceMonthlyRate,
} from '../../lib/calculations';
import { StatusBadge } from '../common/StatusBadge';

interface RenewalsViewProps {
  clientServices: ClientService[];
  clients: Client[];
  onSelectClient: (clientId: string) => void;
  onRenewService: (serviceId: string, months: number) => void;
  onConvertToMonthToMonth: (serviceId: string) => void;
  onCancelService: (serviceId: string) => void;
}

export function RenewalsView({
  clientServices,
  clients,
  onSelectClient,
  onRenewService,
  onConvertToMonthToMonth,
  onCancelService,
}: RenewalsViewProps) {
  const [filter, setFilter] = useState<'all' | '30days' | 'expired'>('all');
  const now = new Date();

  const servicesWithCommitment = clientServices
    .filter((s) => s.billingType === 'monthly' && s.status === 'Active')
    .map((s) => {
      const client = clients.find((c) => c.id === s.clientId);
      const daysLeft = s.endDate ? getDaysRemaining(s.endDate, now) : 999;
      return { service: s, client, daysLeft };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const filtered = servicesWithCommitment.filter((item) => {
    if (filter === '30days') return item.daysLeft >= 0 && item.daysLeft <= 30;
    if (filter === 'expired') return item.daysLeft < 0;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="p-4 rounded-2xl bg-[#11131F] border border-[#262A40] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Renewals & Contract Terms</h2>
          <p className="text-xs text-[#A9ADC6]">
            Audit minimum commitment dates, maturity countdowns, and execute term extensions
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              filter === 'all'
                ? 'bg-[#3D5AFE] text-white font-medium'
                : 'text-[#A9ADC6] hover:text-white hover:bg-[#181B2C]'
            }`}
          >
            All Commitments ({servicesWithCommitment.length})
          </button>
          <button
            onClick={() => setFilter('30days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              filter === '30days'
                ? 'bg-[#F5A524] text-black font-semibold'
                : 'text-[#F5A524] hover:bg-[#F5A524]/10'
            }`}
          >
            Ending Soon (30d)
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              filter === 'expired'
                ? 'bg-[#FF5A5F] text-white font-semibold'
                : 'text-[#FF5A5F] hover:bg-[#FF5A5F]/10'
            }`}
          >
            Matured / Expired
          </button>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="rounded-2xl bg-[#11131F] border border-[#262A40] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#262A40] bg-[#07080F]/60 text-[11px] font-mono uppercase tracking-wider text-[#A9ADC6]">
                <th className="py-3 px-4">Client & Retainer</th>
                <th className="py-3 px-4">Term Commitment</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Countdown</th>
                <th className="py-3 px-4">Auto-Renew</th>
                <th className="py-3 px-4 text-right">Monthly Rate</th>
                <th className="py-3 px-4 text-right">Term Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262A40]/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A9ADC6] italic">
                    No client services match the renewal filter.
                  </td>
                </tr>
              ) : (
                filtered.map(({ service, client, daysLeft }) => {
                  const rate = getServiceMonthlyRate(service);

                  return (
                    <tr
                      key={service.id}
                      className={`hover:bg-[#181B2C]/50 transition-colors ${
                        daysLeft < 0
                          ? 'bg-[#FF5A5F]/5'
                          : daysLeft <= 30
                          ? 'bg-[#F5A524]/5'
                          : ''
                      }`}
                    >
                      {/* Client & Service */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <span
                          onClick={() => client && onSelectClient(client.id)}
                          className="hover:text-[#22D3EE] cursor-pointer block"
                        >
                          {client?.businessName || 'Client'}
                        </span>
                        <span className="text-[11px] text-[#A9ADC6] font-normal">
                          {service.customName}
                        </span>
                      </td>

                      {/* Term */}
                      <td className="py-3.5 px-4 font-mono text-[#A9ADC6]">
                        {service.minimumTermMonths > 0
                          ? `${service.minimumTermMonths} months min.`
                          : 'Month-to-month'}
                      </td>

                      {/* End Date */}
                      <td className="py-3.5 px-4 font-mono text-white">
                        {service.endDate ? formatDate(service.endDate) : 'Rolling'}
                      </td>

                      {/* Countdown Badge */}
                      <td className="py-3.5 px-4 font-mono">
                        {service.endDate ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              daysLeft < 0
                                ? 'bg-[#FF5A5F]/15 text-[#FF5A5F] border border-[#FF5A5F]/30'
                                : daysLeft <= 30
                                ? 'bg-[#F5A524]/15 text-[#F5A524] border border-[#F5A524]/30'
                                : 'bg-[#7CFF6B]/15 text-[#7CFF6B] border border-[#7CFF6B]/30'
                            }`}
                          >
                            {daysLeft < 0
                              ? `Expired (${Math.abs(daysLeft)}d ago)`
                              : daysLeft === 0
                              ? 'Ends Today'
                              : `${daysLeft} days remaining`}
                          </span>
                        ) : (
                          <span className="text-[#A9ADC6]">Rolling</span>
                        )}
                      </td>

                      {/* Auto-renew */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {service.autoRenew ? (
                          <span className="text-[#7CFF6B] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="text-[#A9ADC6]">Manual</span>
                        )}
                      </td>

                      {/* Monthly Rate */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                        {formatCurrency(rate)}
                      </td>

                      {/* Term Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onRenewService(service.id, 12)}
                            className="px-2.5 py-1 rounded bg-[#3D5AFE]/20 hover:bg-[#3D5AFE] text-[#3D5AFE] hover:text-white font-mono text-[11px] font-medium transition-colors"
                            title="Renew for 12 months"
                          >
                            Renew 12 mo
                          </button>
                          <button
                            onClick={() => onRenewService(service.id, 3)}
                            className="px-2.5 py-1 rounded bg-[#22D3EE]/20 hover:bg-[#22D3EE] text-[#22D3EE] hover:text-[#07080F] font-mono text-[11px] font-medium transition-colors"
                            title="Renew for 3 months"
                          >
                            Renew 3 mo
                          </button>
                          <button
                            onClick={() => onConvertToMonthToMonth(service.id)}
                            className="px-2.5 py-1 rounded bg-[#181B2C] hover:bg-[#262A40] text-[#A9ADC6] hover:text-white font-mono text-[11px] transition-colors"
                            title="Convert to month-to-month"
                          >
                            Month-to-Month
                          </button>
                          <button
                            onClick={() => onCancelService(service.id)}
                            className="p-1 text-[#A9ADC6] hover:text-[#FF5A5F]"
                            title="Cancel Service"
                          >
                            <XCircle className="w-4 h-4" />
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
