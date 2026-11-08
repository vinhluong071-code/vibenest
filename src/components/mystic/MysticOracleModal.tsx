"use client";

import { useMemo, useState } from "react";
import { getAgeAccess } from "@/lib/age-gating";

type Mode = "tarot" | "zodiac" | "numerology" | "compatibility";
const signs = ["Bạch Dương", "Kim Ngưu", "Song Tử", "Cự Giải", "Sư Tử", "Xử Nữ", "Thiên Bình", "Bọ Cạp", "Nhân Mã", "Ma Kết", "Bảo Bình", "Song Ngư"];
const cards = [
  ["The Star", "Hy vọng và sự hồi phục"],
  ["The Hermit", "Chậm lại để nghe điều mình thật sự cần"],
  ["Strength", "Dịu dàng cũng là một dạng sức mạnh"],
  ["The Sun", "Một niềm vui nhỏ có thể đổi màu cả ngày"],
  ["Temperance", "Cân bằng điều bạn cho đi và nhận lại"],
  ["The Fool", "Cho phép mình bắt đầu bằng một bước nhỏ"],
] as const;

function lifePath(value: string) {
  let number = value.replace(/\D/g, "").split("").reduce((sum, digit) => sum + Number(digit), 0);
  while (number > 9 && number !== 11 && number !== 22 && number !== 33) {
    number = String(number).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return number;
}

function zodiac(value: string | null) {
  if (!value) return "Chưa có ngày sinh";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Chưa có ngày sinh";
  const index =
    (month === 3 && day >= 21 || month === 4 && day <= 19) ? 0 :
    (month === 4 && day >= 20 || month === 5 && day <= 20) ? 1 :
    (month === 5 && day >= 21 || month === 6 && day <= 20) ? 2 :
    (month === 6 && day >= 21 || month === 7 && day <= 22) ? 3 :
    (month === 7 && day >= 23 || month === 8 && day <= 22) ? 4 :
    (month === 8 && day >= 23 || month === 9 && day <= 22) ? 5 :
    (month === 9 && day >= 23 || month === 10 && day <= 22) ? 6 :
    (month === 10 && day >= 23 || month === 11 && day <= 21) ? 7 :
    (month === 11 && day >= 22 || month === 12 && day <= 21) ? 8 :
    (month === 12 && day >= 22 || month === 1 && day <= 19) ? 9 :
    (month === 1 && day >= 20 || month === 2 && day <= 18) ? 10 : 11;
  return signs[index];
}

export function MysticOracleModal({ birthDate, onClose }: { birthDate: string | null; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("tarot");
  const [other, setOther] = useState("Thiên Bình");
  const access = useMemo(() => getAgeAccess(birthDate), [birthDate]);
  const canViewLoveFortune = access.allowed["love-fortune"];
  const sign = zodiac(birthDate);
  const card = useMemo(() => cards[Number(new Date().toISOString().slice(0, 10).replace(/-/g, "")) % cards.length], []);
  const score = sign === "Chưa có ngày sinh" ? null : 65 + ((signs.indexOf(sign) * 7 + signs.indexOf(other) * 11) % 31);

  return (
    <div className="vn-feature-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="vn-feature-modal" role="dialog" aria-modal="true" aria-labelledby="vn-mystic-title">
        <header><div><small>MYSTIC VIBE · GIẢI TRÍ</small><h2 id="vn-mystic-title">Mystic Oracle</h2></div><button onClick={onClose} aria-label="Đóng">×</button></header>
        <nav className="vn-mystic-tabs" aria-label="Các loại bói">
          {(["tarot", "zodiac", "numerology", "compatibility"] as Mode[]).map((value) => (
            <button key={value} className={mode === value ? "selected" : ""} onClick={() => setMode(value)}>
              {({ tarot: "Tarot", zodiac: "12 cung", numerology: "Thần số", compatibility: "Tương hợp" })[value]}
            </button>
          ))}
        </nav>
        {mode === "tarot" && <article className="vn-oracle-card"><span>✧ THÔNG ĐIỆP HÔM NAY</span><strong>{card[0]}</strong><p>{card[1]}</p></article>}
        {mode === "zodiac" && <article className="vn-oracle-card"><span>CHÒM SAO CỦA BẠN</span><strong>{sign}</strong><p>Hôm nay hãy dành khoảng lặng để sắp xếp ưu tiên. Một cuộc trò chuyện chân thành có thể giúp bạn nhìn vấn đề rõ hơn.</p></article>}
        {mode === "numerology" && <article className="vn-oracle-card"><span>CON SỐ CHỦ ĐẠO</span><strong>{birthDate ? lifePath(birthDate) : "—"}</strong><p>{birthDate ? "Một gợi ý chiêm nghiệm để khám phá điểm mạnh và động lực của mình." : "Thêm ngày sinh trong hồ sơ để tính con số chủ đạo."}</p></article>}
        {mode === "compatibility" && (canViewLoveFortune
          ? <article className="vn-oracle-card"><span>ĐỘ HÒA HỢP GIẢI TRÍ</span><strong>{score === null ? "—" : score + "%"}</strong><p>{sign} ♡ <select value={other} onChange={(event) => setOther(event.target.value)}>{signs.map((item) => <option key={item}>{item}</option>)}</select></p><small>Điểm số vui, không đánh giá chất lượng mối quan hệ.</small></article>
          : <article className="vn-oracle-card"><span>🛡️ BẢO VỆ NGƯỜI DÙNG TRẺ</span><strong>Bói tình duyên 18+</strong><p>{access.age === null ? "Hãy xác minh ngày sinh hợp lệ để xem tính năng phù hợp với độ tuổi." : "Bói tương hợp tình duyên chỉ mở cho tài khoản từ đủ 18 tuổi. Các nội dung Tarot, cung hoàng đạo và thần số học vẫn có thể sử dụng."}</p></article>
        )}
        <p className="vn-feature-footnote">Chiêm tinh và thần số học chỉ nhằm giải trí, không phải tư vấn khoa học, sức khỏe hay tài chính.</p>
      </section>
    </div>
  );
}

export default MysticOracleModal;
