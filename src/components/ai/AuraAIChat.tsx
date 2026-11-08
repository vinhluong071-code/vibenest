'use client';

import React, { useState } from 'react';

export const AuraAIChat: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ id: string; role: 'peer' | 'me'; text: string }>>([
    {
      id: 'welcome-1',
      role: 'peer',
      text: 'Chào bạn, đây là góc lắng nghe cảm xúc đêm muộn của VibeNest. Hôm nay tâm trạng của bạn thế nào?',
    },
  ]);
  const [draft, setDraft] = useState<string>('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft('');
    setMessages((prev) => [
      ...prev,
      { id: `me-${Date.now()}`, role: 'me', text: trimmed },
      {
        id: `peer-${Date.now() + 1}`,
        role: 'peer',
        text: 'Mình đang lắng nghe bạn đây. Cảm ơn bạn đã chia sẻ thật lòng tại VibeNest.',
      },
    ]);
  };

  return (
    <section className="rounded-3xl bg-[#0d121f]/90 border border-white/10 p-5 space-y-4">
      <header>
        <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400">
          Góc Lắng Nghe Tần Số
        </span>
        <h2 className="text-lg font-semibold text-white">Không gian chia sẻ dịu dàng</h2>
      </header>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'me'
                  ? 'bg-rose-600 text-white rounded-br-sm'
                  : 'bg-white/[0.06] text-slate-200 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Viết điều bạn đang nghĩ..."
          className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500"
        />
        <button
          type="submit"
          className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold"
        >
          Gửi
        </button>
      </form>
    </section>
  );
};

export default AuraAIChat;
