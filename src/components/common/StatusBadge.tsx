import React from 'react';
import { ClientStatus, ServiceStatus, PaymentStatus, ProjectStage, TaskPriority } from '../../types';

interface StatusBadgeProps {
  status: ClientStatus | ServiceStatus | PaymentStatus | ProjectStage | TaskPriority | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const s = String(status);

  let colorClasses = 'bg-[#181B2C] text-[#A9ADC6] border-[#262A40]';

  // Green states: Paid, Active, Active Client, Launched, Low priority
  if (['Active Client', 'Active', 'Paid', 'Launched'].includes(s)) {
    colorClasses = 'bg-[#7CFF6B]/10 text-[#7CFF6B] border-[#7CFF6B]/30';
  }
  // Amber states: Due Soon, Proposal Sent, Pending, Review, Medium priority, Paused
  else if (['Proposal Sent', 'Pending', 'Review', 'Medium', 'Paused'].includes(s)) {
    colorClasses = 'bg-[#F5A524]/10 text-[#F5A524] border-[#F5A524]/30';
  }
  // Red states: Overdue, Lost, Failed, High priority, At Risk, Cancelled
  else if (['Lost', 'Failed', 'High', 'Cancelled', 'Overdue', 'At Risk'].includes(s)) {
    colorClasses = 'bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/30';
  }
  // Cyan states: Lead, Mockup, Build
  else if (['Lead', 'Mockup', 'Build'].includes(s)) {
    colorClasses = 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/30';
  }
  // Blue states: Design, Proposal stage, Deposit Paid, Final Payment
  else if (['Design', 'Proposal', 'Deposit Paid', 'Final Payment'].includes(s)) {
    colorClasses = 'bg-[#3D5AFE]/15 text-[#889bff] border-[#3D5AFE]/30';
  }
  // Gray / Past: Past Client, Completed, Low
  else if (['Past Client', 'Completed', 'Refunded', 'Low'].includes(s)) {
    colorClasses = 'bg-[#262A40]/50 text-[#A9ADC6] border-[#262A40]';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-medium border uppercase tracking-wider ${sizeClasses} ${colorClasses}`}
    >
      {s}
    </span>
  );
}
