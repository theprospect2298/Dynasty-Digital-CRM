import React, { useState } from 'react';
import { Lock, Shield, ArrowRight, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ALLOWED_OWNER_EMAIL } from '../../lib/firebase';

export function LoginScreen() {
  const { signInWithGoogle, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080F] p-4 select-none">
      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Ambient background glow */}
        <div className="absolute -top-24 w-72 h-72 bg-[#3D5AFE]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Agency Brand Lockup */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#11131F] border border-[#262A40] flex items-center justify-center mb-4 shadow-xl">
            <Lock className="w-7 h-7 text-[#22D3EE]" />
          </div>
          <h1 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white">
            dynasty<span className="text-[#22D3EE]">/digital</span>
          </h1>
          <p className="text-xs text-[#A9ADC6] mt-1 font-sans">
            Agency CRM · South Florida Production Portal
          </p>
        </div>

        {/* Sign In Card */}
        <div className="w-full p-6 sm:p-8 rounded-2xl bg-[#11131F] border border-[#262A40] shadow-2xl space-y-6">
          <div className="space-y-1.5 text-center">
            <h2 className="text-base font-semibold text-white">Agency Owner Sign In</h2>
            <p className="text-xs text-[#A9ADC6]">
              Sign in with your verified Google account to load your cloud database.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#FF5A5F]/10 border border-[#FF5A5F]/30 text-[#FF5A5F] text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            onClick={handleSignIn}
            disabled={signingIn || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {/* Google SVG Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{signingIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Access Policy Note */}
          <div className="p-3 rounded-xl bg-[#07080F] border border-[#262A40] text-[11px] text-[#A9ADC6] leading-relaxed">
            <div className="flex items-center gap-1.5 text-white font-medium mb-1">
              <Shield className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>Zero-Trust Owner Restriction</span>
            </div>
            Only <span className="font-mono text-[#22D3EE]">{ALLOWED_OWNER_EMAIL}</span> is permitted access by Firestore security rules.
          </div>
        </div>
      </div>
    </div>
  );
}
