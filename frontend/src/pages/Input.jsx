import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../lib/language.jsx';
import { isJudgeModeLocation } from '../lib/judgeMode';
import Eyebrow from '../components/Eyebrow.jsx';

const Input = () => {
  const { t } = useLanguage();
  const demoClue = '橙用黄熟大者，截顶去瓤，留少液。以蟹膏肉实其内，仍以带枝顶覆之。入甑，用酒、醋、水蒸熟。';
  const navigate = useNavigate();
  const location = useLocation();
  const isJudgeDemo = isJudgeModeLocation(location);
  const judgeResultPath = '/result?demo=judge';
  const [inputType, setInputType] = useState('text');
  const [inputText, setInputText] = useState(isJudgeDemo ? demoClue : '');
  const [period, setPeriod] = useState(isJudgeDemo ? '宋元' : '');
  const [region, setRegion] = useState(isJudgeDemo ? '江南' : '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const handleUseDemoClue = () => {
    setInputType('text');
    setInputText(demoClue);
    setPeriod('宋元');
    setRegion('江南');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setError('');

    // 直接跳转到结果页，启用流式考据链模式
    navigate(isJudgeDemo ? judgeResultPath : '/result', {
      state: {
        judge: isJudgeDemo,
        inputText,
        inputType,
        period,
        region,
        useStream: true
      }
    });
  };

  const typeOptions = [
    { key: 'text', label: '古籍片段', code: '甲', desc: '《山家清供》等' },
    { key: 'image', label: '古画描述', code: '乙', desc: '饮食场景描绘' },
    { key: 'oral', label: '口述线索', code: '丙', desc: '家族传承记忆' },
  ];

  return (
    <div className="paper-grain w-full overflow-x-hidden bg-paper px-5 py-14 md:px-6 md:py-16">
      <div className="mx-auto w-full max-w-[1120px]">
        {/* 标题 */}
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <Eyebrow>{t('线索输入｜档案受理', 'INPUT | Archive Intake')}</Eyebrow>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-ink md:text-6xl">唤醒沉睡的味道</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-gray">把古籍、图像和口述记忆整理成可考据的线索卷宗。</p>
          </div>
          <div className="archive-surface p-5">
            <p className="text-xs tracking-[0.3em] text-tea-gold">受理规则</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-gray">线索越具体，复原链越稳：食材、做法、时代、地域和出处都会进入考据模型。</p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* 左侧主输入区 */}
          <div className="space-y-8">
            {/* 类型选择卡片 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {typeOptions.map(item => (
                <button
                  key={item.key}
                  onClick={() => setInputType(item.key)}
                  className={`clue-type-switch ${inputType === item.key ? 'is-active' : ''} min-w-0 p-5 text-left transition-all`}
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-cinnabar/30 text-lg font-bold text-cinnabar">{item.code}</div>
                  <div className={`font-semibold ${inputType === item.key ? 'text-cinnabar' : 'text-ink'}`}>{item.label}</div>
                  <div className="text-xs text-smoke mt-1">{item.desc}</div>
                </button>
              ))}
            </div>

            {/* 输入表单 */}
            <form onSubmit={handleSubmit} className="clue-desk space-y-6 p-6 md:p-8">
              <div>
                <label className="block text-ink text-sm tracking-wider mb-3">
                  {inputType === 'text' && '请输入古籍原文'}
                  {inputType === 'image' && '请描述古画中的饮食场景'}
                  {inputType === 'oral' && '请输入口述的历史菜谱线索'}
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    inputType === 'text'
                      ? '橙用黄熟大者，截顶去瓤，留少液。以蟹膏肉实其内...'
                      : inputType === 'image'
                      ? '《清明上河图》中有一家挂着"正店"招牌的酒楼...'
                      : '我奶奶说，她小时候吃过一种叫"龙凤配"的菜...'
                  }
                  className="w-full h-40 px-4 py-3 bg-paper border-l-4 border-cinnabar/30 focus:border-cinnabar text-ink leading-relaxed resize-none transition-colors outline-none font-serif text-lg"
                  required
                />
                <div className="archive-surface mt-4 flex flex-col gap-4 border-cinnabar/20 bg-paper-warm/40 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs tracking-[0.28em] text-tea-gold">现场演示</p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-gray">一键装入蟹酿橙古籍线索，并锁定宋元江南语境。</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseDemoClue}
                    className="museum-button shrink-0 px-5 py-3 text-sm tracking-widest"
                  >
                    使用蟹酿橙线索
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-smoke text-xs tracking-wider mb-2">历史时期（可选）</label>
                  <select value={period} onChange={e => setPeriod(e.target.value)} className="w-full px-4 py-3 bg-paper border border-ink/20 text-ink focus:border-cinnabar outline-none transition-colors font-serif">
                    <option value="">不限定</option>
                    <option>先秦</option>
                    <option>秦汉</option>
                    <option>魏晋南北朝</option>
                    <option>隋唐</option>
                    <option>宋元</option>
                    <option>明清</option>
                  </select>
                </div>
                <div>
                  <label className="block text-smoke text-xs tracking-wider mb-2">地域（可选）</label>
                  <select value={region} onChange={e => setRegion(e.target.value)} className="w-full px-4 py-3 bg-paper border border-ink/20 text-ink focus:border-cinnabar outline-none transition-colors font-serif">
                    <option value="">不限定</option>
                    <option>北方</option>
                    <option>南方</option>
                    <option>江南</option>
                    <option>岭南</option>
                    <option>西南</option>
                    <option>西北</option>
                  </select>
                </div>
              </div>

              {error && <div className="text-rouge text-sm bg-rouge/10 p-3 border-l-4 border-rouge">{error}</div>}

              <button
                type="submit"
                disabled={isAnalyzing}
                className={`museum-button w-full py-4 text-lg tracking-widest disabled:cursor-not-allowed disabled:opacity-50 ${isJudgeDemo ? 'judge-next-cta' : ''}`}
              >
                {isAnalyzing
                  ? t('智能考据中...', 'AI reasoning...')
                  : isJudgeDemo
                    ? '下一步：可信复原'
                    : t('开 始 复 原', 'START RESTORATION')}
              </button>
            </form>
          </div>

          {/* 右侧贴士 */}
          <div className="space-y-6">
            <div className="evidence-panel sticky top-24 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 bg-tea-gold"></span>
                <span className="text-tea-gold text-xs tracking-widest">考据小贴士</span>
              </div>
              <ul className="space-y-3 text-sm text-ink-gray">
                <li className="flex gap-2"><span className="text-cinnabar">·</span>尽量提供详细原文，包括食材、烹饪方法</li>
                <li className="flex gap-2"><span className="text-cinnabar">·</span>多个版本的记载请分别提供以便对比</li>
                <li className="flex gap-2"><span className="text-cinnabar">·</span>口述线索请包含地域、时间、家庭背景</li>
                <li className="flex gap-2"><span className="text-cinnabar">·</span>古画描述请聚焦饮食场景细节</li>
              </ul>
            </div>
            
            <div className="archive-surface p-6">
              <p className="text-cinnabar text-sm italic leading-relaxed font-serif">
                「给我一行古书，<br/>还你一桌失传的盛宴」
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Input;
