import { ArrowRight, GitMerge } from 'lucide-react';
import { museumDishes } from '../data/offlineMuseumData.js';
import { fuseDishes } from '../lib/fusionEngine.js';

const parentIds = ['dish_001', 'dish_003'];
const parents = parentIds.map((id) => museumDishes.find((dish) => dish.id === id));
const featuredResult = fuseDishes('dish_001', 'dish_003');

function FusionParent({ dish, label }) {
  if (!dish) return null;

  return (
    <figure className="featured-fusion-parent">
      <div className="featured-fusion-image-wrap">
        <img
          src={dish.image}
          alt={dish.name}
          width="320"
          height="180"
          onError={(event) => {
            event.currentTarget.hidden = true;
            event.currentTarget.parentElement?.classList.add('is-image-missing');
          }}
        />
      </div>
      <figcaption>
        <span>{label}</span>
        <strong>{dish.name}</strong>
        <small>{dish.dynasty} · {dish.technique}</small>
      </figcaption>
    </figure>
  );
}

export default function FeaturedFusion({ onOpen }) {
  return (
    <section className="featured-fusion" aria-labelledby="featured-fusion-title">
      <header className="featured-fusion-heading">
        <span><GitMerge aria-hidden="true" size={16} /> 衍生展项提案</span>
        <strong>待专家复核</strong>
      </header>
      <div className="featured-fusion-equation" aria-label="蟹酿橙与玉糁羹融合">
        <FusionParent dish={parents[0]} label="父本 A" />
        <span className="featured-fusion-plus" aria-hidden="true">×</span>
        <FusionParent dish={parents[1]} label="父本 B" />
      </div>
      <div className="featured-fusion-result">
        <span>融合结果 001</span>
        <h2 id="featured-fusion-title">{featuredResult.resultName}</h2>
        <p>{featuredResult.description}</p>
        <dl>
          <div><dt>继承</dt><dd>橙香蟹鲜 · 米羹结构</dd></div>
          <div><dt>用途</dt><dd>数字展项 · 研学试作</dd></div>
        </dl>
      </div>
      <button type="button" className="featured-fusion-command" onClick={onOpen}>
        <span>查看融合推演</span>
        <ArrowRight aria-hidden="true" size={17} />
      </button>
    </section>
  );
}
