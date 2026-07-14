// 商业承接展厅：展示把菜品带进博物馆的试点方案，使用 museumOffer 数据。

import { museumOffer } from '../data/offlineMuseumData.js';
import ExhibitShell from '../components/ExhibitShell.jsx';

export default function BusinessExhibit({ onNavigate }) {
  return (
    <ExhibitShell title={museumOffer.title} onBack={() => onNavigate('home')}>
      <div className="business-exhibit">
        <h3 className="business-pilot-title">博物馆互动展项 · 把这道菜带进博物馆</h3>
        <p className="business-summary">{museumOffer.summary}</p>
        <p className="business-timeline">交付周期：{museumOffer.timeline}</p>

        <div className="business-grid">
          <div className="business-card">
            <h3 className="business-card-title">适用设备</h3>
            <ul className="business-list">
              {museumOffer.devices.map((device) => (
                <li key={device.name}>
                  <strong>{device.name}</strong>
                  <span>{device.purpose}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="business-card">
            <h3 className="business-card-title">{museumOffer.deliverables.label}</h3>
            <ul className="business-list">
              {museumOffer.deliverables.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="business-card">
            <h3 className="business-card-title">{museumOffer.metrics.label}</h3>
            <ul className="business-list">
              {Object.entries(museumOffer.metrics.items).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}</strong>
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="business-extension">
          <h3 className="business-card-title">研学扩展</h3>
          <p>
            可结合研学任务卡与复原证书 SVG 模板，开展馆校合作课程；
            评估指标覆盖体验完成率、平均停留时间、证据热点点击率与研学任务完成率。
          </p>
        </div>

        <div className="business-actions">
          <button type="button" className="business-action" onClick={() => onNavigate('archive')}>
            查看全部馆藏
          </button>
          <button type="button" className="business-action" onClick={() => onNavigate('restore')}>
            查看技术可信说明
          </button>
          <button type="button" className="business-action business-action-primary" onClick={() => onNavigate('business')}>
            商业合作
          </button>
        </div>
      </div>
    </ExhibitShell>
  );
}
