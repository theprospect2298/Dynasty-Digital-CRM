import React from 'react';
import { ShieldAlert, LogOut, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ALLOWED_OWNER_EMAIL } from '../../lib/firebase';

export function AccessDeniedScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080F] p-4 select-none">
      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Glow */}
        <div className="absolute -top-24 w-72 h-72 bg-[#FF5A5F]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Card */}
        <div className="w-full p-6 sm:p-8 rounded-2xl bg-[#11131F] border border-[#FF5A5F]/40 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF5A5F]/15 border border-[#FF5A5F]/30 text-[#FF5A5F] flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Access Denied</h1>
            <p className="text-xs text-[#A9ADC6] leading-relaxed">
              This CRM is private to Dynasty Digital and protected by Firestore security rules.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#07080F] border border-[#262A40] text-xs font-mono space-y-1.5 text-left">
            <div className="text-[#A9ADC6]">
              Current Account: <span className="text-white">{user?.email || 'Unknown'}</span>
            </div>
            <div className="text-[#FF5A5F]">
              Required Owner: <span className="text-[#22D3EE]">{ALLOWED_OWNER_EMAIL}</span>
            </div>
          </div>

          <p className="text-[11px] text-[#A9ADC6]/80 leading-relaxed">
            Your Google account does not match the agency owner credentials. To proceed, please sign out and select the authorized account.
          </p>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5A5F] hover:bg-[#e0454a] text-white font-medium text-xs transition-all shadow-md shadow-[#FF5A5F]/20 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out & Switch Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
