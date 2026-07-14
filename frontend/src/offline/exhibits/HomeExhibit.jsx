// 博物馆首页：第一屏只有两个入口——90 秒可信复原与自由探索馆藏。

export default function HomeExhibit({ onNavigate }) {
  return (
    <section className="home-exhibit">
      <h1 className="home-title">风味考古局</h1>
      <p className="home-subtitle">离线博物馆 · 可信风味复原</p>
      <div className="home-routes">
        <button
          type="button"
          className="home-route home-route-primary"
          onClick={() => onNavigate('restore')}
        >
          开始 90 秒可信复原
        </button>
        <button
          type="button"
          className="home-route home-route-secondary"
          onClick={() => onNavigate('archive')}
        >
          自由探索馆藏
        </button>
      </div>
      <p className="home-note">所有复原结果均标注为离线模式，研究性复原，不替代学术定论。</p>
    </section>
  );
}
