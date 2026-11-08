'use client';

import React, { useState } from 'react';
import { VibeRadarModal } from '../match/VibeRadarModal';

export const ZenlyMoodRadar: React.FC = () => {
  const [radarModalOpen, setRadarModalOpen] = useState<boolean>(false);

  return (
    <section className="rounded-3xl bg-[#0d121f]/90 border border-white/10 p-5 space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400">
            Soul Match · Vibe Radar
          </span>
          <h2 className="text-lg font-semibold text-white">Bản đồ tần số cảm xúc quanh bạn</h2>
        </div>
        <button
          type="button"
          onClick={() => setRadarModalOpen(true)}
          className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          Quét Radar 180s
        </button>
      </header>

      <p className="text-xs text-slate-300 leading-relaxed">
        Kết nối ngẫu nhiên với những người đang có cùng Vibe Tag và trò chuyện ẩn danh trong 180 giây.
      </p>

      <VibeRadarModal
        isOpen={radarModalOpen}
        onClose={() => setRadarModalOpen(false)}
        currentUser={{
          displayName: 'Linh Đan',
          handle: 'linhdan.vibe',
          city: 'Sài Gòn',
          vibeTag: 'Nhiếp Ảnh Phim & Cà Phê',
        }}
      />
    </section>
  );
};

export default ZenlyMoodRadar;
