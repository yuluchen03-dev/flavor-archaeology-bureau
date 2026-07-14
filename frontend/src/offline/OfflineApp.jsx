const destinations = ['可信复原', '探索馆藏', '商业合作'];

export default function OfflineApp() {
  return (
    <div className="offline-museum">
      <p className="offline-status">离线评审模式</p>
      <nav aria-label="主展厅">
        {destinations.map((label) => <button key={label}>{label}</button>)}
      </nav>
      <main><h1>风味考古局</h1></main>
    </div>
  );
}
