'use client';

import React from 'react';
import Link from 'next/link';

export interface SafetyComplianceModalProps {
  open: boolean;
  onClose: () => void;
}

export const SafetyComplianceModal: React.FC<SafetyComplianceModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safetyComplianceTitle"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#0d121f] border border-white/15 p-6 space-y-4 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="safetyComplianceTitle" className="text-base font-bold text-white">
            Trung tâm An toàn &amp; Quyền riêng tư (Apple Guideline 1.2 &amp; 5.1.1)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] rounded-xl text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          VibeNest cam kết môi trường kết nối lành mạnh, hỗ trợ báo cáo vi phạm 24/7, chặn người dùng tức thì và quyền tự xóa tài khoản vĩnh viễn.
        </p>

        <div className="flex items-center justify-between gap-2 pt-2 text-xs">
          <Link href="/terms" className="text-rose-400 underline font-semibold">
            Điều khoản EULA (/terms)
          </Link>
          <Link href="/privacy" className="text-indigo-400 underline font-semibold">
            Chính sách Bảo mật (/privacy)
          </Link>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[42px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
};

export default SafetyComplianceModal;
