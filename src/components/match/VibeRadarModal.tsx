'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getAvatarThemeFromIdentity } from '../../lib/avatar-hash';

export type RadarStage = 'idle' | 'scanning' | 'matched' | 'chatting';

export interface SoulCandidate {
  id: string;
  displayName: string;
  handle: string;
  city: string;
  vibeTag: string;
  mood: string;
  resonanceScore: number;
  distanceKm: number;
  bio: string;
  openingLine: string;
  followUpReplies: string[];
}

export interface RadarChatMessage {
  id: string;
  sender: 'me' | 'peer' | 'system';
  text: string;
  timestamp: string;
}

export interface VibeRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    displayName: string;
    handle: string;
    city: string;
    vibeTag: string;
  };
  onNotify?: (message: string) => void;
}

const VIBE_FREQUENCIES: string[] = [
  'Kẻ Mộng Mơ Đêm Muộn',
  'Nhiếp Ảnh Phim & Cà Phê',
  'Tần Số Chữa Lành',
  'Acoustic & Mưa Rào',
  'Du Mục Đô Thị',
];

const ICEBREAKER_PROMPTS: string[] = [
  'Đêm nay bạn đang nghe bài hát gì thế?',
  'Nếu chấm điểm tâm trạng hôm nay từ 1–10 thì bạn chọn mấy?',
  'Góc phố nào ở thành phố của bạn hợp để đi dạo giờ này nhất?',
];

const SOUL_CANDIDATES: SoulCandidate[] = [
  {
    id: 'soul-01',
    displayName: 'An Nhiên',
    handle: 'annhien.35mm',
    city: 'Sài Gòn',
    vibeTag: 'Nhiếp Ảnh Phim & Cà Phê',
    mood: 'Đêm muộn',
    resonanceScore: 96,
    distanceKm: 2.4,
    bio: 'Hay rửa ảnh phim ở Quận 1 và thích ngồi ban công nghe tiếng mưa đêm.',
    openingLine:
      'Chào bạn, trùng hợp ghê! Mình cũng vừa bật Vibe Radar khi đang ngồi chỉnh lại cuộn phim mới tráng.',
    followUpReplies: [
      'Mình đồng감 lắm luôn. Những lúc phố vắng thế này nói chuyện với một người hợp tần số thấy nhẹ lòng hẳn.',
      'Ở Sài Gòn tầm giờ này gió ngoài cầu Thủ Thiêm mát cực kỳ. Hôm của bạn thế nào?',
      'Rất vui vì tối nay bắt trúng tần số của bạn. Mình giữ kết nối trên bảng tin nhé!',
    ],
  },
  {
    id: 'soul-02',
    displayName: 'Gia Bảo',
    handle: 'baogia.indie',
    city: 'Hà Nội',
    vibeTag: 'Kẻ Mộng Mơ Đêm Muộn',
    mood: 'Chênh vênh',
    resonanceScore: 94,
    distanceKm: 4.1,
    bio: 'Đàn guitar thùng, trà bá tước nóng và những câu chuyện không tên lúc 1h sáng.',
    openingLine:
      'Xin chào! Tần số đêm muộn của tụi mình khớp tới 94% luôn này. Bạn cũng chưa ngủ được à?',
    followUpReplies: [
      'Mình vừa pha một cốc trà ấm. Đôi khi nói chuyện với một người chưa từng gặp lại dễ giãi bày hơn.',
      'Góc nhìn của bạn thú vị thật đấy. Nghe bạn kể mà mình thấy yên bình lây.',
      'Hết 3 phút mà vẫn còn nhiều chuyện muốn kể quá, mình nhấn Kết nối tri kỷ nhé!',
    ],
  },
  {
    id: 'soul-03',
    displayName: 'Phương Thảo',
    handle: 'thao.pinehill',
    city: 'Đà Lạt',
    vibeTag: 'Tần Số Chữa Lành',
    mood: 'Chữa lành',
    resonanceScore: 98,
    distanceKm: 1.8,
    bio: 'Trồng sen đá, đọc tản văn và sưu tầm những khoảnh khắc dịu dàng mỗi ngày.',
    openingLine:
      'Chào bạn nhé! Trên Đà Lạt chỗ mình sương đang xuống dày lắm, gửi bạn một chút không khí se lạnh từ đây.',
    followUpReplies: [
      'Cảm ơn bạn nhiều nha. Một lời hỏi thăm ấm áp đúng lúc thật sự quý giá lắm.',
      'Mình tin là những người có chung tần số chữa lành đều sẽ tìm thấy sự bình yên riêng.',
      'Trò chuyện với bạn dễ chịu thật sự, tụi mình giữ liên lạc lâu dài nha!',
    ],
  },
  {
    id: 'soul-04',
    displayName: 'Đức Minh',
    handle: 'minh.coastal',
    city: 'Đà Nẵng',
    vibeTag: 'Acoustic & Mưa Rào',
    mood: 'Thầm thương',
    resonanceScore: 92,
    distanceKm: 3.5,
    bio: 'Thích chạy xe dọc bán đảo Sơn Trà lúc hoàng hôn và nghe nhạc indie.',
    openingLine:
      'Chào người lạ cùng tần số! Bạn đang có tâm sự gì hay chỉ muốn tìm người trò chuyện tối nay?',
    followUpReplies: [
      'Nghe bạn chia sẻ mà mình thấy đồng điệu ghê. Mỗi người đều có một câu chuyện riêng đáng trân trọng.',
      'Nếu có dịp ghé Đà Nẵng, nhất định phải thử ngắm bình minh ở biển Mỹ Khê một lần nhé.',
      'Cuộc trò chuyện 3 phút hôm nay làm tối của mình vui hơn hẳn!',
    ],
  },
];

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getCurrentTimeLabel(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const VibeRadarModal: React.FC<VibeRadarModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNotify,
}) => {
  const [stage, setStage] = useState<RadarStage>('idle');
  const [selectedFrequency, setSelectedFrequency] = useState<string>(
    currentUser.vibeTag || VIBE_FREQUENCIES[0]
  );
  const [matchedSoul, setMatchedSoul] = useState<SoulCandidate>(SOUL_CANDIDATES[0]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(180);
  const [isMutualConnected, setIsMutualConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<RadarChatMessage[]>([]);
  const [inputDraft, setInputDraft] = useState<string>('');
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);

  const replyStepRef = useRef<number>(0);
  const candidateIndexRef = useRef<number>(0);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myTheme = getAvatarThemeFromIdentity(currentUser.handle);
  const peerTheme = getAvatarThemeFromIdentity(matchedSoul.handle);

  // Sync default frequency when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFrequency(currentUser.vibeTag || VIBE_FREQUENCIES[0]);
    } else {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    }
  }, [isOpen, currentUser.vibeTag]);

  // 180-second Litmatch Soul Chat Countdown
  useEffect(() => {
    if (!isOpen || stage !== 'chatting' || isMutualConnected) return;

    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isOpen, stage, isMutualConnected]);

  // Auto-scroll chat viewport when messages or typing state changes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isPeerTyping]);

  if (!isOpen) return null;

  const startRadarScan = () => {
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    setStage('scanning');

    scanTimeoutRef.current = setTimeout(() => {
      // Prioritize candidate matching selected frequency or rotate smoothly
      const matchingPool = SOUL_CANDIDATES.filter(
        (c) => c.vibeTag === selectedFrequency && c.handle !== currentUser.handle
      );
      const nextCandidate =
        matchingPool.length > 0
          ? matchingPool[candidateIndexRef.current % matchingPool.length]
          : SOUL_CANDIDATES[candidateIndexRef.current % SOUL_CANDIDATES.length];

      candidateIndexRef.current += 1;
      setMatchedSoul(nextCandidate);
      setStage('matched');
      onNotify?.(`Đã bắt trúng tần số của ${nextCandidate.displayName} (${nextCandidate.resonanceScore}% đồng điệu)`);
    }, 1650);
  };

  const enterSoulChatSession = () => {
    replyStepRef.current = 0;
    setRemainingSeconds(180);
    setIsMutualConnected(false);
    setMessages([
      {
        id: `sys-${Date.now()}`,
        sender: 'system',
        text: `Phiên trò chuyện 180 giây cùng @${matchedSoul.handle} đã mở. Mọi chia sẻ đều được bảo mật trong phòng tần số này.`,
        timestamp: getCurrentTimeLabel(),
      },
      {
        id: `peer-init-${Date.now()}`,
        sender: 'peer',
        text: matchedSoul.openingLine,
        timestamp: getCurrentTimeLabel(),
      },
    ]);
    setStage('chatting');
  };

  const sendMessage = (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || (remainingSeconds === 0 && !isMutualConnected)) return;

    const myMsg: RadarChatMessage = {
      id: `me-${Date.now()}`,
      sender: 'me',
      text: trimmed,
      timestamp: getCurrentTimeLabel(),
    };

    setMessages((prev) => [...prev, myMsg]);
    setInputDraft('');
    setIsPeerTyping(true);

    if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    replyTimeoutRef.current = setTimeout(() => {
      const replies = matchedSoul.followUpReplies;
      const replyText = replies[replyStepRef.current % replies.length];
      replyStepRef.current += 1;

      setIsPeerTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `peer-${Date.now()}`,
          sender: 'peer',
          text: replyText,
          timestamp: getCurrentTimeLabel(),
        },
      ]);
    }, 1150);
  };

  const handleConnectSoulmate = () => {
    if (isMutualConnected) return;
    setIsMutualConnected(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-unlock-${Date.now()}`,
        sender: 'system',
        text: `Bạn và ${matchedSoul.displayName} (@${matchedSoul.handle}) đã mở khóa kết nối không giới hạn thời gian.`,
        timestamp: getCurrentTimeLabel(),
      },
    ]);
    onNotify?.(`Đã kết nối tri kỷ với @${matchedSoul.handle}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vibeRadarModalTitle"
    >
      <style>{`
        @keyframes radarRingPulse {
          0% {
            transform: scale(0.82);
            opacity: 0.72;
          }
          100% {
            transform: scale(1.95);
            opacity: 0;
          }
        }
        .radar-ring-1 {
          animation: radarRingPulse 2.1s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .radar-ring-2 {
          animation: radarRingPulse 2.1s cubic-bezier(0.16, 1, 0.3, 1) 0.7s infinite;
        }
      `}</style>

      <div className="w-full max-w-[460px] rounded-t-3xl sm:rounded-3xl bg-white/95 dark:bg-[#0b101d]/95 border-t sm:border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Mobile Sheet Handle */}
        <div className="w-10 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto mb-3.5 sm:hidden shrink-0" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-200/70 dark:border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.85)] shrink-0" />
            <div className="min-w-0">
              <h2
                id="vibeRadarModalTitle"
                className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate"
              >
                Soul Match · Vibe Radar
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Ghép đôi ngẫu nhiên theo tần số cảm xúc trực tuyến
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Vibe Radar"
            className="min-h-[44px] min-w-[44px] -mr-1 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* STAGE 1 & 2: IDLE OR SCANNING RADAR VIEW */}
        {(stage === 'idle' || stage === 'scanning') && (
          <div className="py-5 space-y-5 overflow-y-auto">
            {/* Concentric Radar Canvas */}
            <div className="relative h-56 rounded-3xl bg-gradient-to-b from-slate-900 via-[#11172a] to-[#090d18] border border-white/10 flex flex-col items-center justify-center overflow-hidden p-4">
              {/* Static Subtle Grid Rings */}
              <div className="w-32 h-32 rounded-full border border-white/[0.07] absolute pointer-events-none" />
              <div className="w-48 h-48 rounded-full border border-white/[0.05] absolute pointer-events-none" />

              {/* Animated Pulse Rings when scanning */}
              {stage === 'scanning' && (
                <>
                  <div className="w-24 h-24 rounded-full border-2 border-rose-500/60 absolute pointer-events-none radar-ring-1" />
                  <div className="w-24 h-24 rounded-full border-2 border-indigo-400/50 absolute pointer-events-none radar-ring-2" />
                </>
              )}

              {/* Center User Node */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-display font-semibold text-xl shadow-xl transition-transform duration-300 ${
                    stage === 'scanning' ? 'scale-105' : ''
                  } ${myTheme.textClass}`}
                  style={{
                    background: myTheme.bgStyle,
                    borderColor: myTheme.borderStyle,
                  }}
                >
                  {myTheme.initial}
                </div>
                <p className="mt-2.5 text-xs font-semibold text-white">
                  {stage === 'scanning'
                    ? 'Đang dò tìm tâm hồn đồng điệu...'
                    : `${currentUser.displayName} (@${currentUser.handle})`}
                </p>
                <p className="text-[11px] font-mono text-rose-300/90 mt-0.5 tabular-nums">
                  {stage === 'scanning'
                    ? `Tần số: ${selectedFrequency}`
                    : '128 người đang bật Radar quanh bạn'}
                </p>
              </div>
            </div>

            {/* Frequency Selector */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Chọn tần số Vibe muốn ghép đôi
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  180s / phiên
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {VIBE_FREQUENCIES.map((freq) => {
                  const isSelected = selectedFrequency === freq;
                  return (
                    <button
                      key={freq}
                      type="button"
                      disabled={stage === 'scanning'}
                      onClick={() => setSelectedFrequency(freq)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-rose-600 text-white font-semibold shadow-sm shadow-rose-600/25'
                          : 'bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10'
                      }`}
                    >
                      {freq}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Trigger Button */}
            <button
              type="button"
              disabled={stage === 'scanning'}
              onClick={startRadarScan}
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-60 active:scale-[0.99] text-white shadow-lg shadow-rose-600/20 transition-all"
            >
              {stage === 'scanning'
                ? 'Đang kết nối sóng cảm xúc...'
                : 'Quét Radar · Tìm người cùng tần số'}
            </button>
          </div>
        )}

        {/* STAGE 3: MATCHED SOUL REVEAL */}
        {stage === 'matched' && (
          <div className="py-5 space-y-5 overflow-y-auto">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-500/15 via-indigo-500/10 to-transparent border border-rose-500/30 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Đã tìm thấy tần số tương thích
                </span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {matchedSoul.resonanceScore}% đồng điệu · Cách {matchedSoul.distanceKm}km
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div
                  className={`w-14 h-14 rounded-2xl border flex items-center justify-center font-display font-semibold text-xl shrink-0 ${peerTheme.textClass}`}
                  style={{
                    background: peerTheme.bgStyle,
                    borderColor: peerTheme.borderStyle,
                  }}
                >
                  {peerTheme.initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                      {matchedSoul.displayName}
                    </h3>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                      @{matchedSoul.handle}
                    </span>
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-0.5 truncate">
                    {matchedSoul.vibeTag} · {matchedSoul.city}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-white/60 dark:bg-black/25 p-3.5 rounded-2xl border border-slate-200/60 dark:border-white/[0.06]">
                “{matchedSoul.bio}”
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={startRadarScan}
                className="min-h-[46px] px-4 py-2.5 rounded-2xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Quét người khác
              </button>
              <button
                type="button"
                onClick={enterSoulChatSession}
                className="flex-1 min-h-[46px] px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-lg shadow-rose-600/20 transition-all"
              >
                Vào phòng trò chuyện 180s →
              </button>
            </div>
          </div>
        )}

        {/* STAGE 4: EPHEMERAL 180-SECOND SOUL CHAT */}
        {stage === 'chatting' && (
          <div className="flex-1 flex flex-col min-h-[400px] max-h-[72vh] pt-3">
            {/* Peer Status & Countdown Bar */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center font-display font-semibold text-xs shrink-0 ${peerTheme.textClass}`}
                  style={{
                    background: peerTheme.bgStyle,
                    borderColor: peerTheme.borderStyle,
                  }}
                >
                  {peerTheme.initial}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {matchedSoul.displayName}
                    </span>
                    <span className="text-[11px] font-mono text-rose-500">
                      {matchedSoul.resonanceScore}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {matchedSoul.vibeTag} · {matchedSoul.city}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-200 tabular-nums">
                  {isMutualConnected ? '∞ Đã kết nối' : formatCountdown(remainingSeconds)}
                </span>
                {!isMutualConnected && (
                  <button
                    type="button"
                    onClick={handleConnectSoulmate}
                    className="min-h-[36px] px-3 py-1 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    + Kết nối
                  </button>
                )}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2"
            >
              {messages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div
                      key={msg.id}
                      className="text-center px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed"
                    >
                      {msg.text}
                    </div>
                  );
                }

                const isMe = msg.sender === 'me';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-rose-600 text-white rounded-br-sm'
                          : 'bg-slate-100 dark:bg-white/[0.07] text-slate-900 dark:text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 px-1 tabular-nums">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}

              {isPeerTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 px-2">
                  <span>{matchedSoul.displayName} đang nhập phản hồi...</span>
                </div>
              )}
            </div>

            {/* Quick Icebreaker Suggestions */}
            <div className="pt-2 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {ICEBREAKER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] border border-slate-200/70 dark:border-white/[0.07] text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Message Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputDraft);
              }}
              className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center gap-2 shrink-0"
            >
              <button
                type="button"
                onClick={startRadarScan}
                title="Đổi người trò chuyện khác"
                className="min-h-[44px] px-3 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-500 transition-colors shrink-0"
              >
                Đổi tần số
              </button>
              <input
                type="text"
                value={inputDraft}
                onChange={(e) => setInputDraft(e.target.value)}
                maxLength={240}
                placeholder={`Nhắn cho ${matchedSoul.displayName}...`}
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shrink-0"
              >
                Gửi
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default VibeRadarModal;
