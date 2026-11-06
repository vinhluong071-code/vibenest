'use client';

import React from 'react';

export type BottomNavTab = 'all' | 'Chữa lành' | 'saved' | 'profile';

export interface BottomTabBarProps {
  activeTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
  onOpenComposer: () => void;
  onOpenProfile: () => void;
  userInitial: string;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenComposer,
  onOpenProfile,
  userInitial,
}) => {
  return (
    <div className="md:hidden fixed bottom-3 left-0 right-0 z-30 px-4 pointer-events-none">
      <nav
        aria-label="Điều hướng di động một tay"
        className="pointer-events-auto max-w-[380px] mx-auto h-[56px] px-2 rounded-2xl bg-white/90 dark:bg-[#0d121f]/90 border border-slate-200/80 dark:border-white/[0.09] shadow-xl shadow-black/20 backdrop-blur-2xl grid grid-cols-5 items-center"
      >
        {/* Tab 1: Home Feed */}
        <button
          type="button"
          onClick={() => onSelectTab('all')}
          aria-label="Bảng tin"
          className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center transition-colors ${
            activeTab === 'all'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={activeTab === 'all' ? 2.2 : 1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Bảng tin</span>
        </button>

        {/* Tab 2: Healing Frequency */}
        <button
          type="button"
          onClick={() => onSelectTab('Chữa lành')}
          aria-label="Chữa lành"
          className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center transition-colors ${
            activeTab === 'Chữa lành'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={activeTab === 'Chữa lành' ? 2.2 : 1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Chữa lành</span>
        </button>

        {/* Tab 3: Center Quick Create Action (Ergonomic One-Handed Thumb Target) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenComposer}
            aria-label="Đăng bài mới"
            className="w-11 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-rose-600/25 active:scale-95 transition-transform"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.4}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        </div>

        {/* Tab 4: Saved Bookmarks */}
        <button
          type="button"
          onClick={() => onSelectTab('saved')}
          aria-label="Đã lưu"
          className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center transition-colors ${
            activeTab === 'saved'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={activeTab === 'saved' ? 2.2 : 1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
            />
          </svg>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Đã lưu</span>
        </button>

        {/* Tab 5: Personal Identity Profile */}
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label="Hồ sơ cá nhân"
          className={`min-h-[44px] rounded-xl flex flex-col items-center justify-center transition-colors ${
            activeTab === 'profile'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="w-5 h-5 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 font-display text-[11px] font-semibold flex items-center justify-center">
            {userInitial}
          </span>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Hồ sơ</span>
        </button>
      </nav>
    </div>
  );
};

export default BottomTabBar;
