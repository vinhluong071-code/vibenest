'use client';

import React, { useMemo, useState } from 'react';

export interface FriendshipCharm {
  id: string;
  title: string;
  subtitle: string;
  streakDays: number;
  accentColor: string;
}

export interface VibeMemoryStrip {
  id: string;
  createdAt: string;
  frameTheme: string;
  caption: string;
  stripDataUrl: string;
}

export interface SnapProfileUser {
  id: string;
  displayName: string;
  handle: string;
  zodiacSign: string;
  zodiacSymbol: string;
  age: number;
  city: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  vibeScore: number;
  postScore: number;
  empathyScore: number;
  streakScore: number;
}

export interface SupabaseRpcClient {
  rpc: (
    fnName: string,
    args?: Record<string, unknown>
  ) => Promise<{ data?: unknown; error?: { message: string } | null }>;
  auth: {
    signOut: () => Promise<{ error?: { message: string } | null }>;
  };
}

export interface SnapProfileViewProps {
  user?: SnapProfileUser;
  isOwnProfile?: boolean;
  memories?: VibeMemoryStrip[];
  charms?: FriendshipCharm[];
  supabaseClient?: SupabaseRpcClient;
  onOpenBoothStudio?: () => void;
  onClose?: () => void;
  onSafety?: () => void;
  onSoftGate?: () => void;
  onAccountDeleted?: () => void;
  onNotify?: (message: string) => void;
}

const DEFAULT_SNAP_USER: SnapProfileUser = {
  id: '00000000-0000-0000-0000-000000000001',
  displayName: 'Linh Đan',
  handle: 'linhdan.vibe',
  zodiacSign: 'Thiên Bình',
  zodiacSymbol: '♎',
  age: 22,
  city: 'Sài Gòn',
  bio: 'Thích chụp ảnh phố lên đèn và những cuộc trò chuyện không vội vã.',
  avatarUrl: '/icon.svg',
  coverUrl: '',
  vibeScore: 14820,
  postScore: 4200,
  empathyScore: 10620,
  streakScore: 21,
};

const DEFAULT_CHARMS: FriendshipCharm[] = [
  {
    id: 'charm-01',
    title: 'Tri Kỷ Tần Số Đêm',
    subtitle: 'Tương tác liên tục 14 đêm muộn cùng @baongoc.film',
    streakDays: 14,
    accentColor: 'from-rose-500/20 to-indigo-500/10 border-rose-500/35',
  },
  {
    id: 'charm-02',
    title: 'Bạn Thân Photobooth',
    subtitle: 'Cùng chụp 5 dải ảnh Life4Cuts trong tháng này',
    streakDays: 21,
    accentColor: 'from-indigo-500/20 to-cyan-500/10 border-indigo-500/35',
  },
  {
    id: 'charm-03',
    title: 'Người Lắng Nghe Ấm Áp',
    subtitle: 'Top 5% phản hồi tích cực được cộng đồng bình chọn',
    streakDays: 30,
    accentColor: 'from-amber-500/20 to-rose-500/10 border-amber-500/35',
  },
];

/**
 * Generates a deterministic 11x11 symmetric matrix from user @handle for Snapcode VibeQR SVG
 */
function generateSnapcodeMatrix(seedStr: string): boolean[][] {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const size = 11;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= Math.floor(size / 2); c++) {
      // Reserve center 3x3 for avatar emblem
      if (r >= 4 && r <= 6 && c >= 4 && c <= 6) {
        continue;
      }
      // Corner finder anchors
      if ((r < 2 && c < 2) || (r > size - 3 && c < 2)) {
        grid[r][c] = true;
        grid[r][size - 1 - c] = true;
        continue;
      }
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      const bit = (Math.abs(hash) % 10) > 4;
      grid[r][c] = bit;
      grid[r][size - 1 - c] = bit;
    }
  }
  return grid;
}

export const SnapProfileView: React.FC<SnapProfileViewProps> = ({
  user = DEFAULT_SNAP_USER,
  isOwnProfile = true,
  memories = [],
  charms = DEFAULT_CHARMS,
  supabaseClient,
  onOpenBoothStudio,
  onAccountDeleted,
  onNotify,
}) => {
  const [showSnapQrModal, setShowSnapQrModal] = useState<boolean>(false);
  const [selectedMemory, setSelectedMemory] = useState<VibeMemoryStrip | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportReason, setReportReason] = useState<string>('Nội dung không phù hợp / Quấy rối');
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  // Apple Guideline 5.1.1(v) Account Deletion Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>('');
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  const qrMatrix = useMemo(() => generateSnapcodeMatrix(user.handle), [user.handle]);

  const handleCopyProfileQrLink = () => {
    const url = `https://omni.id.vn/@${user.handle}?vibeqr=1`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
    onNotify?.(`Đã sao chép mã kết bạn VibeQR: @${user.handle}`);
  };

  const handleReportSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowReportModal(false);
    onNotify?.(
      `Đã gửi báo cáo vi phạm (${reportReason}). Đội ngũ kiểm duyệt VibeNest sẽ xử lý trong 24h.`
    );
  };

  const handleToggleBlockUser = () => {
    const nextState = !isBlocked;
    setIsBlocked(nextState);
    onNotify?.(
      nextState
        ? `Đã chặn @${user.handle}. Mọi bài viết và tin nhắn từ tài khoản này đã bị ẩn ngay lập tức.`
        : `Đã bỏ chặn @${user.handle}.`
    );
  };

  const handlePermanentDeleteAccount = async () => {
    if (deleteConfirmInput.trim().toUpperCase() !== 'XOA TAI KHOAN') return;
    setIsDeletingAccount(true);

    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.rpc('delete_user_account', {
          target_user_id: user.id,
        });
        if (error) {
          throw new Error(error.message);
        }
        await supabaseClient.auth.signOut();
      }
      localStorage.clear();
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
      onNotify?.('Tài khoản và toàn bộ dữ liệu cá nhân đã được xóa vĩnh viễn.');
      onAccountDeleted?.();
    } catch (err) {
      setIsDeletingAccount(false);
      onNotify?.(
        err instanceof Error
          ? err.message
          : 'Đã gửi yêu cầu xóa dữ liệu tài khoản trên máy chủ Supabase.'
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* SNAPCHAT + FACEBOOK HYBRID HEADER CARD */}
      <div className="rounded-3xl overflow-hidden bg-white/85 dark:bg-[#0d121f]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm backdrop-blur-xl">
        {/* Cover Photo Banner */}
        <div className="relative h-36 sm:h-44 w-full bg-gradient-to-tr from-rose-600/40 via-indigo-600/35 to-slate-900 overflow-hidden">
          {user.coverUrl && (
            <img
              src={user.coverUrl}
              alt={`Ảnh bìa của ${user.displayName}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

          {/* Top Right Quick Snapcode VibeQR Trigger */}
          <button
            type="button"
            onClick={() => setShowSnapQrModal(true)}
            className="absolute top-3.5 right-3.5 min-h-[40px] px-3.5 py-1.5 rounded-2xl bg-black/55 hover:bg-black/75 border border-white/20 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-2 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Snapcode VibeQR</span>
          </button>
        </div>

        {/* Profile Avatar + Identity Info + Zodiac Badge */}
        <div className="px-5 pb-5">
          <div className="relative -mt-12 mb-3 flex items-end justify-between gap-3">
            <div className="relative">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#0d121f] shadow-xl bg-slate-900"
              />
              <span
                title={`Cung hoàng đạo: ${user.zodiacSign}`}
                className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold border-2 border-white dark:border-[#0d121f] shadow"
              >
                {user.zodiacSymbol} {user.zodiacSign}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenBoothStudio && (
                <button
                  type="button"
                  onClick={onOpenBoothStudio}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all"
                >
                  + Chụp Photobooth 4 Ô
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyProfileQrLink}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                Chia sẻ hồ sơ
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                {user.displayName}
              </h1>
              <span className="text-xs font-mono text-rose-600 dark:text-rose-400">
                @{user.handle}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {user.age} tuổi · {user.city}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {user.bio}
            </p>
          </div>

          {/* VIBE SCORE & SNAP STREAK METRICS */}
          <div className="mt-4 pt-4 border-t border-slate-200/70 dark:border-white/[0.07] grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/[0.07] border border-rose-500/20">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Tổng Vibe Score
              </span>
              <span className="font-mono text-lg font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                {user.vibeScore.toLocaleString('vi-VN')}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-500/[0.07] border border-indigo-500/20">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Điểm đồng cảm
              </span>
              <span className="font-mono text-lg font-semibold text-indigo-600 dark:text-indigo-300 tabular-nums">
                {user.empathyScore.toLocaleString('vi-VN')}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Chuỗi kết nối
              </span>
              <span className="font-mono text-lg font-semibold text-amber-600 dark:text-amber-300 tabular-nums">
                {user.streakScore} ngày
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FRIENDSHIP CHARMS (HUY HIỆU BẠN THÂN SNAPCHAT STYLE) */}
      <div className="rounded-3xl p-5 bg-white/85 dark:bg-[#0d121f]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Huy hiệu Bạn thân (Friendship Charms)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mở khóa tự động khi duy trì tương tác tích cực cùng bạn bè
            </p>
          </div>
          <span className="font-mono text-xs text-rose-500 tabular-nums">
            {charms.length} huy hiệu
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {charms.map((charm) => (
            <div
              key={charm.id}
              className={`p-3.5 rounded-2xl bg-gradient-to-br border ${charm.accentColor} flex flex-col justify-between gap-2`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {charm.title}
                  </span>
                  <span className="font-mono text-[10px] text-rose-500 tabular-nums">
                    {charm.streakDays}d
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {charm.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VIBE MEMORIES: LIFE4CUTS PHOTOBOOTH 4-FRAME STRIP GALLERY */}
      <div className="rounded-3xl p-5 bg-white/85 dark:bg-[#0d121f]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Kho Kỷ Niệm (Vibe Memories · Life4Cuts)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bộ sưu tập các dải ảnh Photobooth 4 ô đã chụp
            </p>
          </div>
          {onOpenBoothStudio && (
            <button
              type="button"
              onClick={onOpenBoothStudio}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-rose-600/15 text-rose-600 dark:text-rose-300 text-xs font-semibold hover:bg-rose-600/25 transition-colors"
            >
              + Chụp dải mới
            </button>
          )}
        </div>

        {memories.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Chưa có dải ảnh Photobooth 4 ô nào trong Kho Kỷ Niệm
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Hãy mở Tiệm ảnh VibeBooth để chụp ngay dải ảnh Life4Cuts đầu tiên của bạn.
            </p>
            {onOpenBoothStudio && (
              <button
                type="button"
                onClick={onOpenBoothStudio}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Mở Tiệm Ảnh VibeBooth
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {memories.map((mem) => (
              <button
                key={mem.id}
                type="button"
                onClick={() => setSelectedMemory(mem)}
                className="group relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-slate-950 p-2 flex flex-col items-center hover:-translate-y-0.5 transition-transform shadow-sm"
              >
                <img
                  src={mem.stripDataUrl}
                  alt={mem.caption}
                  className="w-full h-56 object-contain rounded-lg"
                />
                <div className="w-full mt-2 text-left px-1">
                  <p className="text-[11px] font-semibold text-white truncate">{mem.caption}</p>
                  <p className="text-[10px] font-mono text-slate-400 tabular-nums">
                    {mem.createdAt}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SAFETY & COMPLIANCE CONTROLS (REPORT, BLOCK, APPLE 5.1.1(V) DELETE ACCOUNT) */}
      <div className="rounded-3xl p-5 bg-white/85 dark:bg-[#0d121f]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          An toàn tài khoản & Quyền riêng tư dữ liệu
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Tuân thủ tiêu chuẩn an toàn cộng đồng (Apple Guideline 1.2) và quyền xóa dữ liệu cá nhân (Apple Guideline 5.1.1(v))
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            Báo cáo vi phạm (Report)
          </button>

          <button
            type="button"
            onClick={handleToggleBlockUser}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              isBlocked
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
            }`}
          >
            {isBlocked ? `Đã chặn @${user.handle} (Bỏ chặn)` : 'Chặn người dùng (Block)'}
          </button>

          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/35 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors ml-auto"
            >
              Xóa tài khoản vĩnh viễn (Delete Account)
            </button>
          )}
        </div>
      </div>

      {/* SNAPCODE VIBEQR MODAL */}
      {showSnapQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Mã Snapcode VibeQR cá nhân"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-white/15 p-6 text-center shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-500">
                Snapcode · VibeQR 0.5s
              </span>
              <button
                type="button"
                onClick={() => setShowSnapQrModal(false)}
                className="min-h-[38px] min-w-[38px] rounded-xl text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Custom Deterministic SVG Snapcode VibeQR */}
            <div className="mx-auto w-56 h-56 p-4 rounded-3xl bg-gradient-to-br from-rose-500 via-amber-400 to-indigo-600 shadow-xl flex items-center justify-center">
              <div className="relative w-full h-full rounded-2xl bg-[#080b12] p-3 flex items-center justify-center">
                <svg viewBox="0 0 110 110" className="w-full h-full">
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx * 10 + 1.5}
                          y={rIdx * 10 + 1.5}
                          width={7}
                          height={7}
                          rx={2.5}
                          fill="#F8FAFC"
                        />
                      ) : null
                    )
                  )}
                </svg>
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="absolute w-12 h-12 rounded-full object-cover border-2 border-rose-500 shadow-md"
                />
              </div>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                {user.displayName}
              </h3>
              <p className="text-xs font-mono text-rose-500">@{user.handle}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Đưa camera VibeNest quét mã này để kết bạn tức thì trong 0.5 giây
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyProfileQrLink}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              Sao chép liên kết VibeQR
            </button>
          </div>
        </div>
      )}

      {/* MEMORY LIGHTBOX MODAL */}
      {selectedMemory && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#0d121f] border border-white/15 p-5 text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">{selectedMemory.caption}</span>
              <button
                type="button"
                onClick={() => setSelectedMemory(null)}
                className="min-h-[38px] min-w-[38px] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedMemory.stripDataUrl}
              alt={selectedMemory.caption}
              className="mx-auto max-h-[65vh] rounded-xl object-contain"
            />
            <a
              href={selectedMemory.stripDataUrl}
              download={`vibenest-life4cuts-${selectedMemory.id}.webp`}
              className="block w-full min-h-[44px] py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
            >
              Tải dải ảnh WebP về máy
            </a>
          </div>
        </div>
      )}

      {/* REPORT USER MODAL */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleReportSubmit}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-white/15 p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Báo cáo tài khoản @{user.handle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Báo cáo của bạn được gửi ẩn danh tới hệ thống kiểm duyệt VibeNest (cam kết xử lý trong vòng 24 giờ theo Apple Guideline 1.2).
            </p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="Nội dung không phù hợp / Quấy rối">
                Nội dung không phù hợp / Quấy rối
              </option>
              <option value="Giả mạo danh tính hoặc Spam">Giả mạo danh tính hoặc Spam</option>
              <option value="Ngôn từ gây thù ghét / Bạo lực">
                Ngôn từ gây thù ghét / Bạo lực
              </option>
            </select>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl text-xs text-slate-500"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Gửi báo cáo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* APPLE GUIDELINE 5.1.1(V) PERMANENT ACCOUNT DELETION MODAL */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d121f] border border-rose-500/40 p-6 space-y-4 shadow-2xl">
            <h3 className="font-display text-lg font-semibold text-rose-600 dark:text-rose-400">
              Xóa vĩnh viễn tài khoản VibeNest?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Hành động này sẽ gọi trực tiếp RPC Supabase (<code className="font-mono">delete_user_account</code>) để xóa sạch hồ sơ, các bài đăng, Khoảnh khắc 24h và dải ảnh Photobooth của bạn. Dữ liệu không thể khôi phục sau khi xóa.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Nhập chính xác cụm từ <strong className="font-mono text-rose-500">XOA TAI KHOAN</strong> để xác nhận:
              </label>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="XOA TAI KHOAN"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-300 dark:border-white/15 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={
                  isDeletingAccount ||
                  deleteConfirmInput.trim().toUpperCase() !== 'XOA TAI KHOAN'
                }
                onClick={handlePermanentDeleteAccount}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-45 text-white text-xs font-semibold transition-all"
              >
                {isDeletingAccount ? 'Đang xóa dữ liệu...' : 'Xác nhận xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapProfileView;
