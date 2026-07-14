import { Link } from 'react-router-dom';
import { useLanguage } from '../lib/language.jsx';

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <div className="lost-archive flex min-h-[70vh] w-full items-center justify-center px-5 py-16">
      <div className="archive-surface max-w-xl px-6 py-12 text-center md:px-12">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center border border-cinnabar/30 text-5xl font-bold text-cinnabar/50">404</div>
        <p className="mb-3 text-xs tracking-[0.34em] text-tea-gold">{t('遗失档案', 'LOST ARCHIVE')}</p>
        <h1 className="mb-3 text-3xl font-bold text-ink">{t('此处无古籍记载', 'No Record Here')}</h1>
        <p className="mb-8 text-ink-gray">{t('您访问的页面不存在，可能已失传于历史长河。', 'The page you visited does not exist, perhaps lost to history.')}</p>
        <Link
          to="/"
          className="museum-button px-8 py-3 tracking-wider"
        >
          {t('返回首页', 'Back Home')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
