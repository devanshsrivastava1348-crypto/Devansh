import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="rounded-xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F766E]/10 text-[#0F766E] dark:text-[#5EEAD4]">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                Installed as App
              </p>
              <p className="text-xs text-[#52635F] dark:text-[#96ABA6]">
                Running in standalone mode with offline access.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-[#0F766E]/30 bg-[#0F766E]/8 px-4 py-2 text-xs font-semibold text-[#0F766E] hover:bg-[#0F766E]/15 dark:border-[#5EEAD4]/30 dark:bg-[#5EEAD4]/10 dark:text-[#5EEAD4] dark:hover:bg-[#5EEAD4]/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-4 w-4" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-[#D4DDD9] dark:border-[#243532] bg-white dark:bg-[#131D1B] px-4 py-2 text-xs font-semibold text-[#111C1A] dark:text-[#EDF4F2] hover:bg-[#EEF3F1] dark:hover:bg-[#1A2825] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="h-4 w-4" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-display text-base font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
                  Install Dosewell on iPhone or iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#52635F] hover:bg-[#EEF3F1] dark:text-[#96ABA6] dark:hover:bg-[#1E2C29] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-[#42524E] dark:text-[#B4C5C0] list-decimal list-inside">
                <li>
                  Tap the <strong className="font-semibold text-[#111C1A] dark:text-white">Share</strong> button in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap <strong className="font-semibold text-[#111C1A] dark:text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong className="font-semibold text-[#111C1A] dark:text-white">Add</strong> to enable standalone reminders.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-lg bg-[#0F766E] py-2.5 text-sm font-semibold text-white hover:bg-[#0D655E] transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <div className="rounded-xl border border-[#E2E8E5] dark:border-[#1E2C29] bg-white dark:bg-[#131D1B] p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF3F1] dark:bg-[#1A2825] text-[#0F766E] dark:text-[#5EEAD4]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111C1A] dark:text-[#EDF4F2]">
              Install for Desktop & Mobile
            </p>
            <p className="mt-0.5 text-xs text-[#52635F] dark:text-[#96ABA6] leading-relaxed">
              Use your browser&apos;s address bar install icon or menu (&ldquo;Install Dosewell&rdquo;) for standalone launch and offline dose logging.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
