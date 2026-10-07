import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Plus,
  UserPlus,
  DollarSign,
  Briefcase,
  CheckSquare,
  FolderPlus,
  ChevronDown,
  Wallet,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileSidebar: () => void;
  onOpenGlobalSearch: () => void;
  onOpenNewClient: (defaultStatus?: 'Lead' | 'Active Client') => void;
  onOpenNewPayment: () => void;
  onOpenNewService: () => void;
  onOpenNewTask: () => void;
  onOpenNewProject: () => void;
  onOpenNewExpense?: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Executive Dashboard', subtitle: 'Overview & Agency KPIs' },
  clients: { title: 'Clients & Leads', subtitle: 'Directory, Accounts & Contract Terms' },
  pipeline: { title: 'Sales Pipeline', subtitle: 'Deal Flow & Lead Conversion' },
  projects: { title: 'Projects & Builds', subtitle: 'Website Mockups & Launches' },
  billing: { title: 'Billing Ledger', subtitle: 'Expected Charges & Collected Retainers' },
  expenses: { title: 'Operating Expenses', subtitle: 'Software, Hosting, Subcontractors & Overhead' },
  renewals: { title: 'Renewals & Contracts', subtitle: 'Commitments & Expiration Windows' },
  tasks: { title: 'Task Manager', subtitle: 'Action Items & Automated Agency Workflows' },
  reports: { title: 'Agency Analytics', subtitle: 'Revenue Breakdowns & LTV Metrics' },
  settings: { title: 'CRM Settings', subtitle: 'Service Catalog, Business Info & Data' },
};

export function Header({
  currentTab,
  onOpenMobileSidebar,
  onOpenGlobalSearch,
  onOpenNewClient,
  onOpenNewPayment,
  onOpenNewService,
  onOpenNewTask,
  onOpenNewProject,
  onOpenNewExpense,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const meta = TAB_TITLES[currentTab] || { title: 'CRM', subtitle: 'Dynasty Digital' };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#07080F]/90 backdrop-blur-md border-b border-[#262A40] px-4 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-[#A9ADC6] hover:text-white hover:bg-[#11131F]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight leading-tight">
            {meta.title}
          </h1>
          <span className="text-[11px] text-[#A9ADC6] hidden sm:inline">
            {meta.subtitle}
          </span>
        </div>
      </div>

      {/* Right: Global Search & "+ New" Action Dropdown */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search Bar / Button */}
        <button
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#11131F] border border-[#262A40] hover:border-[#22D3EE]/50 text-xs text-[#A9ADC6] hover:text-white transition-all shadow-inner group cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-[#A9ADC6] group-hover:text-[#22D3EE] transition-colors" />
          <span className="hidden md:inline">Search CRM...</span>
          <kbd className="hidden sm:inline-block font-mono text-[10px] bg-[#07080F] border border-[#262A40] rounded px-1.5 py-0.5 text-[#A9ADC6]">
            ⌘K
          </kbd>
        </button>

        {/* Global "+ New" Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#3D5AFE] hover:bg-[#324bda] active:scale-95 text-white text-xs sm:text-sm font-medium transition-all shadow-md shadow-[#3D5AFE]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#11131F] border border-[#262A40] shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewClient('Active Client');
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors text-left"
              >
                <UserPlus className="w-4 h-4 text-[#7CFF6B]" />
                <span>New Client</span>
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewClient('Lead');
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors text-left"
              >
                <UserPlus className="w-4 h-4 text-[#22D3EE]" />
                <span>New Lead</span>
              </button>
              <div className="my-1 border-t border-[#262A40]" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewPayment();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors text-left"
              >
                <DollarSign className="w-4 h-4 text-[#7CFF6B]" />
                <span>Log Payment</span>
              </button>
              {onOpenNewExpense && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenNewExpense();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors text-left"
                >
                  <Wallet className="w-4 h-4 text-[#22D3EE]" />
                  <span>Log Expense</span>
                </button>
              )}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewService();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors text-left"
              >
                <Briefcase className="w-4 h-4 text-[#F5A524]" />
                <span>Attach Service</span>
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewProject();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors text-left"
              >
                <FolderPlus className="w-4 h-4 text-[#3D5AFE]" />
                <span>New Build Project</span>
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenNewTask();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#A9ADC6] hover:text-white hover:bg-[#181B2C] transition-colors text-left"
              >
                <CheckSquare className="w-4 h-4 text-[#22D3EE]" />
                <span>Add Task</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
