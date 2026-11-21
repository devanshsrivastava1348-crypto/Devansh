import React from 'react';
import { Bell, CalendarCheck2, History, Pill, Plus } from 'lucide-react';

export type AppTab = 'today' | 'medications' | 'history' | 'reminders';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenAddModal: () => void;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'today', label: 'Today', icon: CalendarCheck2 },
  { id: 'medications', label: 'Medications', icon: Pill },
  { id: 'history', label: 'History', icon: History },
  { id: 'reminders', label: 'Reminders', icon: Bell },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
}) => {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#E2E8E5] dark:border-[#1E2C29] bg-[#F7F9F8]/92 dark:bg-[#0B1211]/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 md:h-16 max-w-[1200px] items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark (single text element) */}
          <button
            type="button"
            onClick={() => onSelectTab('today')}
            className="font-display text-lg font-bold tracking-tight text-[#111C1A] dark:text-[#EDF4F2] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F766E]"
          >
            Dosewell
          </button>

          {/* Zone 2: 4 single-line text navigation links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F766E] ${
                    isActive
                      ? 'text-[#0F766E] dark:text-[#5EEAD4] font-semibold'
                      : 'text-[#52635F] hover:text-[#111C1A] dark:text-[#96ABA6] dark:hover:text-[#EDF4F2]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-[#0F766E] dark:bg-[#5EEAD4]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-[#0F766E] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#0D655E] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F766E]"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Add Medicine</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (keeps combined sticky height < 15% viewport) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E8E5] dark:border-[#1E2C29] bg-white/95 dark:bg-[#131D1B]/95 backdrop-blur-md md:hidden pb-safe"
      >
        <div className="grid grid-cols-4 h-14 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[#0F766E] dark:text-[#5EEAD4]'
                    : 'text-[#52635F] dark:text-[#96ABA6]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
