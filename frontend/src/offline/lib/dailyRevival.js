// 离线每日复原：用本地 YYYY-MM-DD 哈希到 40 道菜列表，同一天返回相同结果。

import { museumDishes } from '../data/offlineMuseumData.js';

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// djb2 风格确定性哈希，保证同一日期字符串落点稳定。
function hashIndex(key) {
  let h = 5381;
  for (let i = 0; i < key.length; i += 1) {
    h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
  }
  return museumDishes.length ? h % museumDishes.length : 0;
}

export function getDailyRevival(date) {
  const key = toDateKey(date);
  const index = hashIndex(key);
  const dish = museumDishes[index];
  return {
    date: key,
    index,
    id: dish.id,
    name: dish.name,
    dynasty: dish.dynasty,
    region: dish.region,
    image: dish.image,
    archiveState: dish.archiveState,
    flavor: dish.flavor,
    technique: dish.technique,
    passage: dish.passage,
    source: dish.source,
    mode: '离线每日复原',
  };
}
