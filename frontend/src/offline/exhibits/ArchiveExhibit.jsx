// 味觉星图展厅：40 道馆藏菜品的星图视图与档案详情。
// 支持按朝代、档案状态（证据完整/推荐考据/资料待补）与文本筛选。
// 星图为稳定的响应式网格，不使用 canvas；选中后显示已批准图片、原文短摘、风味特征与诚实的 archiveState。

import { useMemo, useState } from 'react';
import { museumDishes } from '../data/offlineMuseumData.js';
import ExhibitShell from '../components/ExhibitShell.jsx';

const ARCHIVE_STATES = ['证据完整', '推荐考据', '资料待补'];

const DYNASTY_ORDER = ['先秦', '汉', '魏晋南北朝', '唐', '宋', '元', '明', '清', '民国', '现代'];

function dynastyRank(dynasty) {
  const index = DYNASTY_ORDER.findIndex((item) => dynasty && dynasty.includes(item));
  return index === -1 ? DYNASTY_ORDER.length : index;
}

export default function ArchiveExhibit({ onNavigate }) {
  const [selectedDishId, setSelectedDishId] = useState(null);
  const [dynastyFilter, setDynastyFilter] = useState('全部');
  const [archiveFilter, setArchiveFilter] = useState('全部');
  const [keyword, setKeyword] = useState('');

  const dynasties = useMemo(() => {
    const set = new Set(museumDishes.map((dish) => dish.dynasty));
    return ['全部', ...Array.from(set).sort((a, b) => dynastyRank(a) - dynastyRank(b))];
  }, []);

  const filteredDishes = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    return museumDishes.filter((dish) => {
      if (dynastyFilter !== '全部' && dish.dynasty !== dynastyFilter) return false;
      if (archiveFilter !== '全部' && dish.archiveState !== archiveFilter) return false;
      if (lowerKeyword) {
        const haystack = `${dish.name} ${dish.dynasty} ${dish.region} ${dish.flavor} ${dish.technique} ${dish.description}`.toLowerCase();
        if (!haystack.includes(lowerKeyword)) return false;
      }
      return true;
    });
  }, [dynastyFilter, archiveFilter, keyword]);

  const selectedDish = useMemo(
    () => museumDishes.find((dish) => dish.id === selectedDishId) || null,
    [selectedDishId],
  );

  return (
    <ExhibitShell title="味觉星图 · 馆藏菜品档案" onBack={() => onNavigate('home')}>
      <div className="archive-exhibit">
        <p className="archive-intro">
          味觉星图汇集 40 道馆藏菜品，按朝代与档案状态分布。点击星点查看原文短摘、风味特征与诚实的考据状态。
        </p>

        <div className="archive-filters">
          <label className="archive-filter">
            <span className="archive-filter-label">朝代</span>
            <select value={dynastyFilter} onChange={(event) => setDynastyFilter(event.target.value)}>
              {dynasties.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="archive-filter">
            <span className="archive-filter-label">档案状态</span>
            <select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value)}>
              <option value="全部">全部</option>
              {ARCHIVE_STATES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="archive-filter archive-filter-search">
            <span className="archive-filter-label">关键词</span>
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="菜名、食材、技法…"
            />
          </label>
        </div>

        <div className="archive-starmap" role="grid" aria-label="味觉星图">
          {filteredDishes.map((dish) => (
            <button
              key={dish.id}
              type="button"
              role="gridcell"
              className={`archive-star archive-star-${dish.archiveState}${selectedDishId === dish.id ? ' is-selected' : ''}`}
              onClick={() => setSelectedDishId(dish.id)}
              aria-label={`${dish.name} · ${dish.dynasty} · ${dish.archiveState}`}
            >
              <span className="archive-star-name">{dish.name}</span>
              <span className="archive-star-dynasty">{dish.dynasty}</span>
              <span className="archive-star-state">{dish.archiveState}</span>
            </button>
          ))}
          {filteredDishes.length === 0 && (
            <p className="archive-empty">没有匹配的馆藏菜品，请调整筛选条件。</p>
          )}
        </div>

        {selectedDish && (
          <aside className="archive-detail" aria-label="菜品档案详情">
            <div className="archive-detail-header">
              <h3 className="archive-detail-title">{selectedDish.name}</h3>
              <button
                type="button"
                className="archive-detail-close"
                onClick={() => setSelectedDishId(null)}
                aria-label="关闭详情"
              >
                关闭
              </button>
            </div>
            <img
              className="archive-detail-image"
              src={selectedDish.image}
              alt={`${selectedDish.name} 复原示意图`}
              loading="lazy"
            />
            <dl className="archive-detail-meta">
              <dt>朝代</dt>
              <dd>{selectedDish.dynasty}</dd>
              <dt>地域</dt>
              <dd>{selectedDish.region}</dd>
              <dt>技法</dt>
              <dd>{selectedDish.technique}</dd>
              <dt>风味特征</dt>
              <dd>{selectedDish.flavor || '暂无风味记录'}</dd>
              <dt>档案状态</dt>
              <dd className={`archive-detail-state archive-detail-state-${selectedDish.archiveState}`}>
                {selectedDish.archiveState}
              </dd>
            </dl>
            <div className="archive-detail-passage">
              <p className="archive-detail-passage-title">原文短摘</p>
              <blockquote>{selectedDish.passage || '暂无原文摘录，资料待补。'}</blockquote>
              {selectedDish.source && (
                <p className="archive-detail-source">出处：{selectedDish.source}</p>
              )}
            </div>
            <p className="archive-detail-note">
              档案状态为离线规则依据古籍片段与专家清单覆盖情况判定的诚实标注，研究性复原，不替代学术定论。
            </p>
          </aside>
        )}
      </div>
    </ExhibitShell>
  );
}
