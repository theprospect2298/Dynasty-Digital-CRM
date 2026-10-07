import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Delete } from 'lucide-react';

interface PinLockScreenProps {
  correctPin: string;
  agencyName: string;
  onUnlock: () => void;
}

export function PinLockScreen({ correctPin, agencyName, onUnlock }: PinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);

      if (nextPin === correctPin) {
        onUnlock();
      } else if (nextPin.length === correctPin.length) {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setPin('');
          setShake(false);
        }, 600);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && pin === correctPin) {
        onUnlock();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, correctPin]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07080F] p-4 select-none">
      <div className="relative w-full max-w-sm flex flex-col items-center">
        {/* Ambient glow */}
        <div className="absolute -top-24 w-64 h-64 bg-[#3D5AFE]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Agency Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#11131F] border border-[#262A40] flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-6 h-6 text-[#22D3EE]" />
          </div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-white">
            dynasty<span className="text-[#22D3EE]">/digital</span>
          </h1>
          <p className="text-xs text-[#A9ADC6] mt-1 font-sans">
            Agency CRM · South Florida Workspace
          </p>
        </div>

        {/* PIN Dots */}
        <div className={`flex items-center gap-4 mb-6 ${shake ? 'animate-bounce' : ''}`}>
          {Array.from({ length: Math.max(4, correctPin.length) }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? error
                    ? 'bg-[#FF5A5F] scale-110 shadow-sm shadow-[#FF5A5F]'
                    : 'bg-[#22D3EE] scale-110 shadow-sm shadow-[#22D3EE]'
                  : 'bg-[#262A40]'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-[#FF5A5F] font-mono mb-4 text-center">
            Incorrect PIN. Try again.
          </p>
        )}

        {!error && (
          <p className="text-xs text-[#A9ADC6] font-mono mb-4 text-center">
            Enter PIN to access agency data
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-xl bg-[#11131F] border border-[#262A40] hover:border-[#22D3EE]/60 hover:bg-[#181B2C] active:scale-95 text-white font-mono text-xl font-medium transition-all shadow-sm flex items-center justify-center cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={() => {
              setPin(correctPin);
              onUnlock();
            }}
            title="Quick Demo Unlock"
            className="h-14 rounded-xl bg-[#11131F]/50 border border-[#262A40]/60 hover:border-[#7CFF6B]/50 hover:bg-[#11131F] text-[#7CFF6B] text-xs font-mono transition-all flex flex-col items-center justify-center gap-0.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock</span>
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-xl bg-[#11131F] border border-[#262A40] hover:border-[#22D3EE]/60 hover:bg-[#181B2C] active:scale-95 text-white font-mono text-xl font-medium transition-all shadow-sm flex items-center justify-center cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-xl bg-[#11131F] border border-[#262A40] hover:border-[#FF5A5F]/60 active:scale-95 text-[#A9ADC6] hover:text-white transition-all flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Helper Hint */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-[#A9ADC6]/70 font-mono">
            Default PIN is <span className="text-[#22D3EE] font-bold">1234</span> · Change anytime in Settings
          </p>
        </div>
      </div>
    </div>
  );
}
