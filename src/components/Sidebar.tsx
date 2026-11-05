type SidebarProps = {
  alias: string;
  postCount: number;
  savedCount: number;
  onChangeAlias: () => void;
};

export function Sidebar({ alias, postCount, savedCount, onChangeAlias }: SidebarProps) {
  return (
    <aside className="sidebar-stack">
      <section className="glass-panel identity-panel">
        <div className="panel-heading">
          <h2>Danh tính ẩn danh của bạn</h2>
          <button className="text-action" onClick={onChangeAlias}>Đổi tên</button>
        </div>
        <div className="identity-row">
          <div className="avatar avatar-large">{alias.slice(0, 1)}</div>
          <div className="identity-copy">
            <strong>{alias}</strong>
            <span>Không hiển thị danh tính thật</span>
          </div>
        </div>
        <div className="stat-grid">
          <div><span>Bài đã chia sẻ</span><strong>{postCount}</strong></div>
          <div><span>Tâm sự đã lưu</span><strong>{savedCount}</strong></div>
        </div>
      </section>

      <section className="glass-panel frequency-panel">
        <p className="eyebrow">NHỊP CẢM XÚC CỘNG ĐỒNG</p>
        <h2>Ở đây, cảm xúc nào cũng có chỗ</h2>
        <p className="muted">Một góc nhỏ để bạn được lắng nghe mà không cần giải thích mình là ai.</p>
        <div className="frequency-bars">
          <div><span>Chênh vênh</span><i><b style={{ width: "72%" }} /></i></div>
          <div><span>Chữa lành</span><i><b style={{ width: "58%" }} /></i></div>
          <div><span>Đêm muộn</span><i><b style={{ width: "43%" }} /></i></div>
        </div>
      </section>
    </aside>
  );
}