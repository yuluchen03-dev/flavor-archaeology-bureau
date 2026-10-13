import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/language.jsx';
import Eyebrow from '../components/Eyebrow.jsx';
import heroImage from '../assets/hero.png';
import crabOrangeImage from '../assets/crab-orange.png';

const evidenceSteps = [
  { num: '01', seal: '籍', title: '古籍解码', desc: '从《山家清供》《随园食单》等文本抽取食材、器具、技法和语境。' },
  { num: '02', seal: '证', title: '食材考证', desc: '用朝代、地域、节令和可得性约束，排除不属于那个时代的想象。' },
  { num: '03', seal: '演', title: '技法推演', desc: '把蒸、酿、脍、糟、羹等古法翻译成现代厨房可执行步骤。' },
  { num: '04', seal: '现', title: '成品复原', desc: '生成菜品图、证据链、复原说明和可以分享的风味档案。' },
];

const Home = () => {
  const { t } = useLanguage();

  return (
    <div className="paper-grain bg-paper">
      <section className="museum-hero relative min-h-[82vh] overflow-hidden">
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/35 to-transparent"></div>

        <div className="relative z-10 mx-auto grid min-h-[82vh] w-full max-w-[1180px] items-center gap-10 px-6 py-16 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-3 border border-paper/25 bg-ink/35 px-4 py-2 text-paper backdrop-blur">
              <span className="h-px w-8 bg-tea-gold"></span>
              <span className="text-xs tracking-[0.28em]">{t('非遗美食 · 智能复原', 'Heritage Cuisine · AI Restoration')}</span>
            </div>

            <h1 className="mb-8 text-5xl font-bold leading-[1.05] text-paper drop-shadow md:text-7xl">
              让灭绝的味道
              <br />
              <span className="text-[#f3c56b]">重新复生</span>
            </h1>

            <p className="mb-10 max-w-2xl text-lg leading-relaxed text-paper/88 md:text-xl">
              给我一行古书，还你一桌失传的盛宴。
              <br />
              {t('智能系统从古籍、古画与口述中，推理复原千年前的中华美味。', 'AI reasons from old books, paintings, and oral clues to restore Chinese flavors from a thousand years ago.')}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              to="/input?demo=judge"
              className="judge-demo-primary museum-button px-10 py-4 font-medium tracking-wider"
            >
              现场演示 · 90 秒评委路径 →
            </Link>
            <Link
              to="/light"
              className="px-3 py-2 text-sm font-medium tracking-wider text-paper/82 underline decoration-paper/35 underline-offset-4 transition-colors hover:text-paper"
            >
              三秒轻量玩法
            </Link>
            <Link
              to="/starmap"
              className="px-3 py-2 text-sm font-medium tracking-wider text-paper/82 underline decoration-paper/35 underline-offset-4 transition-colors hover:text-paper"
            >
              探索味觉星图
            </Link>
          </div>
        </div>

          <aside className="archive-surface hidden p-6 lg:block">
            <p className="mb-3 text-xs tracking-[0.28em] text-cinnabar">{t('当前档案', 'CURRENT DOSSIER')}</p>
            <h2 className="mb-3 text-3xl font-bold text-ink">南宋 · 蟹酿橙</h2>
            <p className="mb-5 text-sm leading-relaxed text-ink-gray">
              原文、食材、器皿、蒸制技法与现代成品图被放进同一份可追溯档案。
            </p>
            <div className="mb-5 border-l-2 border-cinnabar/45 bg-cinnabar/5 px-4 py-3">
              <p className="text-xs tracking-[0.28em] text-cinnabar">90 秒评委路径</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-gray">一键线索、流式考据、证据图谱、成品复原、星图点亮连续展示。</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {['古籍', '食材', '技法'].map((item) => (
                <div key={item} className="evidence-panel px-3 py-4">
                  <p className="text-lg font-bold text-cinnabar">{item}</p>
                  <p className="mt-1 text-xs text-smoke">已校验</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* 考据流程 */}
      <section className="bg-paper-warm/55 px-6 py-24">
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="text-center mb-16">
            <div className="mb-4">
              <Eyebrow align="center">{t('考据四步', 'PROCESS · Four Steps')}</Eyebrow>
            </div>
            <h2 className="text-4xl font-bold text-ink">从碎片到复活</h2>
          </div>
          
          <div className="grid gap-5 md:grid-cols-4">
            {evidenceSteps.map((step) => (
              <div key={step.num} className="archive-surface relative overflow-hidden p-6">
                <div className="mb-8 flex items-start justify-between">
                  <span className="text-xs tracking-[0.28em] text-smoke">{step.num}</span>
                  <span className="seal-badge h-10 w-10 rotate-3 text-sm font-bold">{step.seal}</span>
                </div>
                <h3 className="mb-3 text-xl font-semibold text-ink">{step.title}</h3>
                <p className="text-sm leading-relaxed text-ink-gray">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 铁打样本展示 */}
      <section className="px-6 py-24">
        <div className="mx-auto w-full max-w-[1040px]">
          <div className="grid items-center gap-12 md:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <div className="mx-auto w-full max-w-md md:mx-0">
              <div className="mb-4">
                <Eyebrow>{t('铁打样本', 'SIGNATURE · Proven Sample')}</Eyebrow>
              </div>
              <h2 className="text-4xl font-bold text-ink mb-6">蟹酿橙</h2>
              <p className="text-ink-gray leading-relaxed mb-4">
                出自南宋林洪《山家清供》。将蟹肉填入橙壳蒸制，橙香与蟹鲜交融，
                是宋代文人"以器为味"美学的极致体现。
              </p>
              <div className="evidence-panel my-6 border-l-4 border-cinnabar p-5">
                <p className="text-sm text-ink-gray italic">
                  "橙用黄熟大者，截顶去瓤，留少液。以蟹膏肉实其内，
                  仍以带枝顶覆之。入甑，用酒、醋、水蒸熟。"
                </p>
                <p className="text-xs text-smoke mt-2">—— 《山家清供》南宋·林洪</p>
              </div>
              <Link to="/result" className="inline-flex items-center gap-2 text-cinnabar hover:text-rouge font-medium transition-colors">
                查看完整复原 →
              </Link>
            </div>
            <div className="relative mx-auto w-full max-w-xl">
              <div className="archive-surface signature-dish-frame aspect-[4/3] overflow-hidden p-4">
                <img src={crabOrangeImage} alt="南宋蟹酿橙复原成品" loading="lazy" decoding="async" width={1152} height={864} className="signature-dish-image h-full w-full opacity-95" />
              </div>
              {/* 印章装饰 */}
              <div className="seal-badge absolute -right-4 -top-4 h-20 w-20 rotate-6">
                <span className="text-paper font-bold text-xs text-center leading-tight">非遗<br/>复原</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 三大特色 */}
      <section className="py-24 px-6 bg-ink text-paper">
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="text-center mb-16">
            <div className="mb-4">
              <Eyebrow align="center">{t('三大特色', 'FEATURES · Three Highlights')}</Eyebrow>
            </div>
            <h2 className="text-4xl font-bold">不只是查菜谱，而是推理一道菜回来</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { title: '可见考据链', desc: t('智能系统的每一步推理都肉眼可见地跑在屏幕上，不是动画特效，是真实推理链的界面。', 'Every reasoning step is visible on screen as a real evidence chain, not a decorative animation.'), quote: t('看着智能系统一层层想回历史深处', 'Watching the reasoning walk back into history') },
              { title: '数字传承人', desc: '复活的菜召出那个朝代的大师，对话式教学，每步编码文化规则。', quote: '文化即规则，而非装饰' },
              { title: '轻量玩法', desc: '拍照认祖、每日抽卡、真假非遗、复活证书，让评委和观众三秒上手。', quote: '硬核之上，人人能玩' },
            ].map((feat, i) => (
              <div key={i} className="group">
                <div className="text-tea-gold text-3xl font-bold mb-4 opacity-50 group-hover:opacity-100 transition-opacity">0{i+1}</div>
                <h3 className="text-xl font-semibold mb-3 text-paper">{feat.title}</h3>
                <p className="text-paper/70 text-sm leading-relaxed mb-4">{feat.desc}</p>
                <p className="text-cinnabar/80 text-sm italic border-l-2 border-cinnabar/50 pl-3">「{feat.quote}」</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
