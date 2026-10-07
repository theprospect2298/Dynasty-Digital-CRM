import React from 'react';
import {
  LayoutDashboard,
  Users,
  Kanban,
  FolderGit2,
  Receipt,
  Repeat,
  CheckSquare,
  BarChart3,
  Settings,
  Lock,
  X,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  WifiOff,
  LogOut,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import { formatCurrency } from '../lib/calculations';
import { SyncState } from '../lib/db';

export type NavTab =
  | 'dashboard'
  | 'clients'
  | 'pipeline'
  | 'projects'
  | 'billing'
  | 'expenses'
  | 'renewals'
  | 'tasks'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  mrr: number;
  openTasksCount: number;
  overdueCount: number;
  uncontactedLeadsCount?: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLock: () => void;
  syncStatus: SyncState;
  userEmail?: string | null;
  onSignOut?: () => void;
  onOpenWebhookModal?: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  mrr,
  openTasksCount,
  overdueCount,
  uncontactedLeadsCount = 0,
  isOpenMobile,
  onCloseMobile,
  onLock,
  syncStatus,
  userEmail,
  onSignOut,
  onOpenWebhookModal,
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'clients' as NavTab,
      label: 'Clients & Leads',
      icon: Users,
      badge:
        uncontactedLeadsCount > 0
          ? `⚡ ${uncontactedLeadsCount} new`
          : overdueCount > 0
          ? `${overdueCount} alert`
          : undefined,
      badgeColor:
        uncontactedLeadsCount > 0
          ? 'text-white bg-[#FF5A5F] shadow-sm shadow-[#FF5A5F]/40 animate-pulse font-bold'
          : 'text-[#FF5A5F] bg-[#FF5A5F]/10',
    },
    { id: 'pipeline' as NavTab, label: 'Pipeline', icon: Kanban },
    { id: 'projects' as NavTab, label: 'Projects & Builds', icon: FolderGit2 },
    { id: 'billing' as NavTab, label: 'Billing & Ledger', icon: Receipt },
    { id: 'expenses' as NavTab, label: 'Expenses', icon: Wallet },
    { id: 'renewals' as NavTab, label: 'Renewals & Terms', icon: Repeat },
    { id: 'tasks' as NavTab, label: 'Tasks', icon: CheckSquare, badge: openTasksCount > 0 ? String(openTasksCount) : undefined, badgeColor: 'text-[#22D3EE] bg-[#22D3EE]/10' },
    { id: 'reports' as NavTab, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#07080F] border-r border-[#262A40] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#262A40]">
          <div className="flex flex-col">
            <span className="font-mono text-lg font-bold tracking-tight text-white select-none">
              dynasty<span className="text-[#22D3EE]">/digital</span>
            </span>
            <span className="text-[10px] text-[#A9ADC6] font-mono tracking-wider uppercase">
              South Florida CRM
            </span>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#11131F]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Badge Bar */}
        <div className="px-4 py-2 border-b border-[#262A40]/60 bg-[#11131F]/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {syncStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#7CFF6B]">
                <span className="w-2 h-2 rounded-full bg-[#7CFF6B] animate-pulse" />
                <span>Cloud Synced</span>
              </span>
            )}
            {syncStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#22D3EE]">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Syncing...</span>
              </span>
            )}
            {syncStatus === 'offline' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#F5A524]">
                <WifiOff className="w-3 h-3" />
                <span>Offline Cache</span>
              </span>
            )}
            {syncStatus === 'quota-exceeded' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#F5A524]" title="Firebase daily free quota reached. Operating in offline persistent mode.">
                <span className="w-2 h-2 rounded-full bg-[#F5A524]" />
                <span>Offline (Quota)</span>
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-[#A9ADC6]/70">
            Firestore DB
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-[#11131F] text-[#22D3EE] border border-[#22D3EE]/30 shadow-sm'
                    : 'text-[#A9ADC6] hover:text-white hover:bg-[#11131F]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#22D3EE]' : 'text-[#A9ADC6] group-hover:text-white'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom MRR Card & User Session */}
        <div className="p-3 border-t border-[#262A40] space-y-2.5">
          {/* Quick Leads API button */}
          {onOpenWebhookModal && (
            <button
              onClick={onOpenWebhookModal}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#07080F] hover:bg-[#181B2C] border border-[#262A40] hover:border-[#22D3EE]/40 text-xs font-mono text-[#22D3EE] transition-all cursor-pointer group"
              title="Open Inbound Leads Webhook & Zapier API details"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Zap className="w-3.5 h-3.5 text-[#F5A524] group-hover:scale-110 transition-transform" />
                <span className="truncate">Inbound Leads API</span>
              </div>
              <span className="text-[10px] text-[#7CFF6B] bg-[#7CFF6B]/10 px-1 py-0.2 rounded border border-[#7CFF6B]/20">
                POST
              </span>
            </button>
          )}

          {/* Quick MRR Box */}
          <div className="p-3 rounded-lg bg-[#11131F] border border-[#262A40]/80">
            <div className="flex items-center justify-between text-xs text-[#A9ADC6] mb-1">
              <span>Agency MRR</span>
              <span className="text-[#7CFF6B] text-[10px] font-mono">Live</span>
            </div>
            <div className="font-mono text-lg font-bold text-white tracking-tight">
              {formatCurrency(mrr)}
            </div>
            <div className="text-[11px] text-[#A9ADC6]/80 font-mono mt-0.5">
              ARR: {formatCurrency(mrr * 12)}
            </div>
          </div>

          {/* User Account / Lock / Sign Out */}
          <div className="p-2.5 rounded-lg bg-[#11131F]/60 border border-[#262A40] space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                <span className="text-[#A9ADC6] truncate font-mono text-[10px]">
                  {userEmail || 'carlosventura.fx@gmail.com'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#262A40]/60">
              <button
                onClick={onLock}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-[#07080F] hover:bg-[#181B2C] text-[10px] font-mono text-[#A9ADC6] hover:text-white transition-colors cursor-pointer"
                title="Quick PIN lock"
              >
                <Lock className="w-3 h-3 text-[#22D3EE]" />
                <span>Quick Lock</span>
              </button>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1 px-2 rounded bg-[#07080F] hover:bg-[#FF5A5F]/20 text-[10px] font-mono text-[#A9ADC6] hover:text-[#FF5A5F] transition-colors cursor-pointer flex items-center gap-1"
                  title="Sign out of Google"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
