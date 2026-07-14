import { Link, useLocation } from 'react-router-dom';
import { isJudgeModeLocation } from '../lib/judgeMode';

const scenarios = [
  {
    title: '博物馆互动展项',
    buyer: '文博馆、非遗馆、城市展厅',
    pain: '展陈内容更新慢，观众停留时间短，饮食文物难从“看见”变成“理解”。',
    modules: ['线索输入台', '证据链大屏', '味觉星图墙', '分享证书'],
    assets: ['展项脚本', '馆藏菜谱数据包', '互动屏 UI', '运营日报模板'],
    kpi: '单展项停留时长 3-6 分钟，扫码分享率 12%-20%，二次到访线索可追踪。',
    price: '8 万-18 万 / 三个月试点',
  },
  {
    title: '研学课程包',
    buyer: '研学机构、中小学社团、文旅营地',
    pain: '课程容易停在故事讲解，缺少可操作任务、可评价成果和跨学科证据训练。',
    modules: ['真假非遗问答', '古籍短摘卡', '复原任务单', '小组证据汇报'],
    assets: ['4-8 课时教案', '教师讲义', '学生工作纸', '结课证书素材'],
    kpi: '每班完成 3 份证据报告，课堂互动率 70%+，复购课程包 2-3 个主题。',
    price: '3 万-8 万 / 校区试点',
  },
  {
    title: '餐饮文化新菜研发',
    buyer: '地方餐饮集团、酒店、文旅街区餐饮主理人',
    pain: '新菜需要文化记忆点，但直接复古难稳定出品，营销故事也常缺少可信出处。',
    modules: ['历史菜谱筛选', '现代替代食材建议', '出品故事卡', '菜单 A/B 试验'],
    assets: ['3-5 道菜研发简报', '证据背书页', '菜单文案', '短视频脚本'],
    kpi: '试点菜点击率提升 15%-30%，文化套餐客单提升 10%+，内容素材复用 6 周。',
    price: '6 万-15 万 / 单品牌试点',
  },
];

const fieldLabels = [
  ['客户痛点', 'pain'],
  ['产品模块', 'modules'],
  ['可交付资产', 'assets'],
  ['KPI', 'kpi'],
  ['试点价格区间', 'price'],
];

const BusinessValue = () => {
  const location = useLocation();
  const isJudgeMode = isJudgeModeLocation(location);

  return (
    <div className="business-value-page paper-grain w-full overflow-x-hidden px-5 py-14 md:px-6 md:py-16">
      <div className="mx-auto w-full max-w-[1120px]">
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-sm tracking-[0.28em] text-cinnabar">商业价值｜B 端试点</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-ink md:text-6xl">
              从一次演示，到可收费的文化数字化方案
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-ink-gray">
              风味考古局不是单次生成工具，而是一套可交付给文博、研学和餐饮品牌的证据化内容生产系统。
            </p>
          </div>
          <div className="archive-surface p-5">
            <p className="text-xs tracking-[0.32em] text-tea-gold">投资人判断点</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-gray">
              三类客户共享同一条技术底座：线索结构化、可信复原、可视证据链与可运营的分享资产。
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {scenarios.map((scenario, index) => (
            <article key={scenario.title} className="enterprise-solution-card p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.28em] text-tea-gold">SCENE {String(index + 1).padStart(2, '0')}</p>
                  <h2 className="mt-3 text-2xl font-bold leading-tight text-ink">{scenario.title}</h2>
                  <p className="mt-2 text-sm text-smoke">{scenario.buyer}</p>
                </div>
                <span className="seal-badge h-12 w-12 shrink-0 rotate-3 text-xs font-bold">B端</span>
              </div>

              <div className="space-y-5">
                {fieldLabels.map(([label, key]) => (
                  <div key={label} className="border-t border-ink/10 pt-4">
                    <p className="mb-2 text-xs font-semibold tracking-[0.26em] text-cinnabar">{label}</p>
                    {Array.isArray(scenario[key]) ? (
                      <div className="flex flex-wrap gap-2">
                        {scenario[key].map((item) => (
                          <span key={item} className="border border-tea-gold/25 bg-tea-gold/5 px-2 py-1 text-xs text-ink-gray">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-ink-gray">{scenario[key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 border-t border-ink/10 pt-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-xs tracking-[0.3em] text-cinnabar">DEMO CLOSE</p>
            <p className="mt-2 text-lg font-semibold text-ink">评委路径完成：从线索、复原、星图、玩法，到可售卖试点方案。</p>
          </div>
          <Link
            to={isJudgeMode ? '/input?demo=judge' : '/input'}
            state={{ judge: isJudgeMode }}
            className="border border-ink/25 px-5 py-3 text-center text-sm font-semibold tracking-[0.18em] text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
          >
            回到线索输入
          </Link>
        </section>
      </div>
    </div>
  );
};

export default BusinessValue;
