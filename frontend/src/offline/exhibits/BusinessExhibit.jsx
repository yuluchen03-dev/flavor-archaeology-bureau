import { museumOffer } from '../data/offlineMuseumData.js';
import { useMuseumSession } from '../state/useMuseumSession.js';

const PILOT_RANGE_LABEL = '2–4 周';
const PILOT_STEPS = [
  ['第 1 周', '标杆菜与文献范围确认'],
  ['第 2 周', '证据档案与互动原型'],
  ['第 3 周', '展台适配与研学内容'],
  ['第 4 周', '现场验证与指标基线'],
];

export default function BusinessExhibit() {
  const { dispatch } = useMuseumSession();
  const navigate = (exhibit) => dispatch({ type: 'navigate', exhibit });

  return (
    <section className="partnership-hall" aria-labelledby="partnership-title">
      <header className="partnership-heading">
        <p>{museumOffer.title} · 标准试点 {museumOffer.timeline || PILOT_RANGE_LABEL}</p>
        <h1 id="partnership-title">把这套复原体验带进博物馆</h1>
        <p>{museumOffer.summary}</p>
      </header>

      <section className="partnership-band partnership-specification" aria-labelledby="specification-title">
        <h2 id="specification-title">展项规格</h2>
        <div className="specification-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">适用设备</th>
                <th scope="col">展项用途</th>
                <th scope="col">部署方式</th>
                <th scope="col">内容边界</th>
              </tr>
            </thead>
            <tbody>
              {museumOffer.devices.map((device) => (
                <tr key={device.name}>
                  <th scope="row">{device.name}</th>
                  <td>{device.purpose}</td>
                  <td>单机离线 · 本地资源</td>
                  <td>研究性复原 · 证据状态明确</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="partnership-band" aria-labelledby="timeline-title">
        <div className="partnership-section-heading">
          <h2 id="timeline-title">实施时间轴</h2>
          <p>{PILOT_RANGE_LABEL}</p>
        </div>
        <ol className="pilot-timeline">
          {PILOT_STEPS.map(([week, task]) => (
            <li key={week}>
              <span>{week}</span>
              <strong>{task}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="partnership-band partnership-definitions" aria-label="试点交付与评估">
        <div>
          <h2>交付内容</h2>
          <dl>
            {museumOffer.deliverables.items.map((item, index) => (
              <div key={item}>
                <dt>{String(index + 1).padStart(2, '0')}</dt>
                <dd>{item}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2>评估指标</h2>
          <dl>
            {Object.entries(museumOffer.metrics.items).map(([metric, definition]) => (
              <div key={metric}>
                <dt>{metric}</dt>
                <dd>{definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="partnership-actions">
        <button type="button" onClick={() => navigate('restore')}>返回复原结论</button>
        <button type="button" onClick={() => navigate('archive')}>浏览馆藏资产</button>
      </footer>
    </section>
  );
}
