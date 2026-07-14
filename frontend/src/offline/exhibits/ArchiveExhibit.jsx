import { useMemo, useState } from 'react';
import { Archive, FlaskConical } from 'lucide-react';
import { museumDishes } from '../data/offlineMuseumData.js';
import { useMuseumSession } from '../state/MuseumSessionContext.jsx';
import ResearchLab from './ResearchLab.jsx';

const ARCHIVE_STATES = ['证据完整', '推荐考据', '资料待补'];
const DYNASTY_ORDER = ['先秦', '汉', '魏晋南北朝', '唐', '宋', '元', '明', '清', '民国', '现代'];

function dynastyRank(dynasty) {
  const index = DYNASTY_ORDER.findIndex((item) => dynasty?.includes(item));
  return index === -1 ? DYNASTY_ORDER.length : index;
}

export default function ArchiveExhibit() {
  const { state, dispatch } = useMuseumSession();
  const [dynastyFilter, setDynastyFilter] = useState('全部');
  const [archiveFilter, setArchiveFilter] = useState('全部');
  const [keyword, setKeyword] = useState('');

  const dynasties = useMemo(() => {
    const values = new Set(museumDishes.map((dish) => dish.dynasty));
    return ['全部', ...Array.from(values).sort((a, b) => dynastyRank(a) - dynastyRank(b))];
  }, []);

  const filteredDishes = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return museumDishes
      .filter((dish) => {
        if (dynastyFilter !== '全部' && dish.dynasty !== dynastyFilter) return false;
        if (archiveFilter !== '全部' && dish.archiveState !== archiveFilter) return false;
        if (!search) return true;
        return `${dish.name} ${dish.dynasty} ${dish.region} ${dish.flavor} ${dish.technique} ${dish.description}`
          .toLowerCase()
          .includes(search);
      })
      .sort((left, right) => dynastyRank(left.dynasty) - dynastyRank(right.dynasty));
  }, [archiveFilter, dynastyFilter, keyword]);

  const selectedDishId = state.selectedDishId;
  const selectedDish = museumDishes.find((dish) => dish.id === selectedDishId) || museumDishes[0];
  const selectDish = (dishId) => dispatch({ type: 'selectDish', dishId });
  const setArchiveTab = (tab) => dispatch({ type: 'setArchiveTab', tab });

  return (
    <section className="archive-hall" aria-labelledby="archive-hall-title">
      <header className="archive-heading">
        <div>
          <p>数字风味博物馆 · 40 道离线馆藏</p>
          <h1 id="archive-hall-title">风味馆藏库</h1>
        </div>
        <nav className="segmented-control archive-tabs" aria-label="馆藏视图">
          <button
            type="button"
            aria-pressed={state.archiveTab === 'collection'}
            onClick={() => setArchiveTab('collection')}
          >
            <Archive aria-hidden="true" size={18} />
            <span>馆藏档案</span>
          </button>
          <button
            type="button"
            aria-pressed={state.archiveTab === 'research'}
            onClick={() => setArchiveTab('research')}
          >
            <FlaskConical aria-hidden="true" size={18} />
            <span>互动研究</span>
          </button>
        </nav>
      </header>

      {state.archiveTab === 'collection' ? (
        <>
          <div className="archive-filters">
            <label>
              <span>朝代</span>
              <select value={dynastyFilter} onChange={(event) => setDynastyFilter(event.target.value)}>
                {dynasties.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>档案状态</span>
              <select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
                <option value="全部">全部</option>
                {ARCHIVE_STATES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="archive-search">
              <span>关键词</span>
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="菜名、地域或技法"
              />
            </label>
          </div>

          <div className="archive-collection">
            <div className="archive-timeline" role="list" aria-label="馆藏时间轴">
              {filteredDishes.map((dish, index) => (
                <button
                  key={dish.id}
                  type="button"
                  role="listitem"
                  className="archive-row"
                  aria-pressed={selectedDishId === dish.id}
                  onClick={() => selectDish(dish.id)}
                >
                  <span className="archive-marker" aria-hidden="true" />
                  {index < 6 && (
                    <img
                      src={dish.image}
                      alt=""
                      loading="lazy"
                      width="80"
                      height="56"
                    />
                  )}
                  {index >= 6 && <span className="archive-image-placeholder" aria-hidden="true" />}
                  <span className="archive-row-main">
                    <strong>{dish.name}</strong>
                    <small>{dish.region} · {dish.technique || '技法待补'}</small>
                  </span>
                  <span className="archive-row-dynasty">{dish.dynasty}</span>
                  <span className={`archive-state archive-state-${dish.archiveState}`}>{dish.archiveState}</span>
                </button>
              ))}
              {filteredDishes.length === 0 && (
                <p className="archive-empty">没有匹配的馆藏菜品，请调整筛选条件。</p>
              )}
            </div>

            <aside className="archive-detail" aria-label="菜品档案详情">
              <img
                className="archive-detail-image"
                src={selectedDish.image}
                alt={`${selectedDish.name} 复原示意图`}
                loading="lazy"
                width="720"
                height="405"
              />
              <p className="archive-detail-index">{selectedDish.id.toUpperCase()}</p>
              <h2>{selectedDish.name}</h2>
              <p className={`archive-state archive-state-${selectedDish.archiveState}`}>
                {selectedDish.archiveState}
              </p>
              <dl className="archive-detail-meta">
                <dt>朝代</dt><dd>{selectedDish.dynasty}</dd>
                <dt>地域</dt><dd>{selectedDish.region}</dd>
                <dt>技法</dt><dd>{selectedDish.technique}</dd>
                <dt>风味</dt><dd>{selectedDish.flavor || '暂无风味记录'}</dd>
              </dl>
              <blockquote>{selectedDish.passage || '暂无原文摘录，资料待补。'}</blockquote>
              <p className="archive-detail-source">出处：{selectedDish.source || '资料待补'}</p>
              <p className="archive-detail-note">馆藏状态基于当前离线文献和专家清单覆盖情况，不替代学术定论。</p>
              <button type="button" className="archive-research-command" onClick={() => setArchiveTab('research')}>
                以此菜进入互动研究
              </button>
            </aside>
          </div>
        </>
      ) : (
        <ResearchLab selectedDishId={selectedDishId} />
      )}
    </section>
  );
}
