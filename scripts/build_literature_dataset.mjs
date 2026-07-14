import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');

const catalogSources = {
  ancientFoodLiterature: {
    id: 'src_ancient_food_literature_collection_2021',
    name: '《古代饮食文献集成》',
    institution: '北京燕山出版社；主编倪建伟、罗全',
    authorityType: 'published_scholarly_collection',
    url: 'https://books.google.com/books/about/%E5%8F%A4%E4%BB%A3%E9%A3%AE%E9%A3%9F%E6%96%87%E7%8D%BB%E9%9B%86%E6%88%90.html?id=twnRzgEACAAJ',
    catalogUrl: 'https://luckysafe.pixnet.net/blog/posts/11405373919',
    verificationNote: 'Google Books 载明书名、编者、出版社与出版年；目录页转录70册总目录，用作条目拆分依据。',
  },
  cookingClassicsSeries: {
    id: 'src_chinese_cooking_classics_series',
    name: '中国烹饪古籍丛刊',
    institution: '中国商业出版社；馆藏目录见 CiNii Books，书目转录见豆瓣书目笔记',
    authorityType: 'library_catalogued_series',
    url: 'https://ci.nii.ac.jp/ncid/BN13499321?l=en',
    catalogUrl: 'https://www.douban.com/note/163074955/',
    verificationNote: 'CiNii Books 可检索该丛刊馆藏；豆瓣书目笔记转录36种目录与出版信息，用作条目拆分依据。',
  },
  modernHundredVolumeSeries: {
    id: 'src_china_food_culture_classics_2025',
    name: '《中国历代饮食文化典籍丛刊》',
    institution: '四川旅游学院川菜发展研究中心；北京燕山出版社',
    authorityType: 'official_academic_project',
    url: 'https://www.sctu.edu.cn/cyzx/info/1083/1891.htm',
    catalogUrl: 'https://www.sctu.edu.cn/tsg/info/1084/2401.htm',
    verificationNote: '四川旅游学院官网确认该丛刊全套100册，系统收录综合类、食谱类、茶酒类、食疗养生类等近百种饮食文献。',
  },
};

const volumeCatalog = [
  ['第一册', '居家必用事类全集·己集庚集；饮膳正要（一）', '元代', '综合/食疗'],
  ['第二册', '饮膳正要（二）；饮食须知；云林堂饮食制度集', '元代', '食疗/食谱'],
  ['第三册', '雅尚斋遵生八笺·饮馔服食笺；饮食绅言；钦定古今图书集成·食货典（一）', '明清', '食谱/类书'],
  ['第四册', '钦定古今图书集成·食货典（二）', '清代', '类书'],
  ['第五册', '钦定古今图书集成·食货典（三）', '清代', '类书'],
  ['第六册', '钦定古今图书集成·食货典（四）', '清代', '类书'],
  ['第七册', '钦定古今图书集成·食货典（五）', '清代', '类书'],
  ['第八册', '钦定古今图书集成·食货典（六）', '清代', '类书'],
  ['第九册', '钦定古今图书集成·食货典（七）', '清代', '类书'],
  ['第十册', '钦定古今图书集成·食货典（八）', '清代', '类书'],
  ['第十一册', '钦定古今图书集成·食货典（九）', '清代', '类书'],
  ['第十二册', '膳夫经手录；太平御览·百谷部/饮食部/果部/菜茹部（一）', '唐宋', '食谱/类书'],
  ['第十三册', '太平御览·百谷部/饮食部/果部/菜茹部（二）；本心斋蔬食谱；山家清供；饮食须知', '宋元', '类书/素食/食谱'],
  ['第十四册', '易牙遗意；食品集；多能鄙事·饮食类', '明代', '食谱/家政'],
  ['第十五册', '墨娥小录·饮膳集珍；汤茗品胜；食宪鸿秘；闲情偶寄·饮馔部', '明清', '食谱/茶饮'],
  ['第十六册', '渊鉴类函·食物部（一）', '清代', '类书'],
  ['第十七册', '渊鉴类函·食物部（二）', '清代', '类书'],
  ['第十八册', '醒园录；随园食单；听钟山房集食味杂咏；养小录；粥谱；广粥谱', '清代', '食谱/粥谱'],
  ['第十九册', '调鼎集（一）', '清代', '食谱'],
  ['第二十册', '调鼎集（二）', '清代', '食谱'],
  ['第二十一册', '中馈录；乡味杂咏；御膳单；蔬食谱', '清代', '食谱/御膳/素食'],
  ['第二十二册', '清稗类钞·饮食类；茶经；茶具图赞；外集', '唐清', '饮食掌故/茶书'],
  ['第二十三册', '原本茶经；续茶经；附录', '唐清', '茶书'],
  ['第二十四册', '茶书五部（一）', '唐明', '茶书'],
  ['第二十五册', '茶书五部（二）', '唐明', '茶书'],
  ['第二十六册', '十六汤品；品茶要录；东溪试茶录；北苑别录；宣和北苑贡茶录；茗史；水品；煮茶小品；茶董；茶集；烹茶图集', '唐宋明', '茶汤/茶书'],
  ['第二十七册', '茶苑', '明代', '茶书'],
  ['第二十八册', '茶史；茶史补；北山酒经；合刻酒经觞政；酒谱；酒史', '宋明清', '茶书/酒书'],
  ['第二十九册', '酒概；酒史续编', '明清', '酒书'],
  ['第三十册', '胜饮编；酒人觞政；荔枝谱；蟹略；橘录；王西楼先生野菜谱', '宋明清', '酒书/谱录/野菜'],
  ['第三十一册', '野菜博录', '明代', '荒政/野菜'],
  ['第三十二册', '茹草编；海错百一录', '明清', '野菜/水产'],
  ['第三十三册', '闽中荔支通谱', '明代', '果品谱录'],
  ['第三十四册', '晴川蟹录；晴川后蟹录；晴川续蟹录；湖南方物志（一）', '清代', '水产/方物'],
  ['第三十五册', '湖南方物志（二）；岭南荔支谱；吴蕈谱；食医心鉴；养生月览；家传日用本草', '唐宋元清', '方物/菌谱/食疗/本草'],
  ['第三十六册', '食物本草（一）', '元明', '食物本草'],
  ['第三十七册', '食物本草（二）', '元明', '食物本草'],
  ['第三十八册', '食物本草（三）', '元明', '食物本草'],
  ['第三十九册', '食物本草（四）', '元明', '食物本草'],
  ['第四十册', '食物本草（五）', '元明', '食物本草'],
  ['第四十一册', '救荒本草', '明代', '荒政/食用植物'],
  ['第四十二册', '本草纲目（一）', '明代', '本草/食材'],
  ['第四十三册', '本草纲目（二）', '明代', '本草/食材'],
  ['第四十四册', '本草纲目（三）', '明代', '本草/食材'],
  ['第四十五册', '本草纲目（四）', '明代', '本草/食材'],
  ['第四十六册', '本草纲目（五）', '明代', '本草/食材'],
  ['第四十七册', '本草纲目（六）', '明代', '本草/食材'],
  ['第四十八册', '本草纲目（七）', '明代', '本草/食材'],
  ['第四十九册', '本草纲目（八）', '明代', '本草/食材'],
  ['第五十册', '本草纲目（九）', '明代', '本草/食材'],
  ['第五十一册', '本草纲目（十）', '明代', '本草/食材'],
  ['第五十二册', '本草纲目（十一）', '明代', '本草/食材'],
  ['第五十三册', '本草纲目（十二）', '明代', '本草/食材'],
  ['第五十四册', '学圃杂疏；蒲水斋食治广要；食鉴本草；食物本草会纂（一）', '明清', '园蔬/食疗/本草'],
  ['第五十五册', '食物本草会纂（二）', '清代', '食物本草'],
  ['第五十六册', '食物本草会纂（三）', '清代', '食物本草'],
  ['第五十七册', '调疾饮食辩（一）', '清代', '食疗养生'],
  ['第五十八册', '调疾饮食辩（二）；随息居饮食谱', '清代', '食疗/饮食谱'],
  ['第五十九册', '齐民要术；杂说', '北魏', '农书/食品加工'],
  ['第六十册', '农桑衣食撮要；农桑辑要', '元代', '农书/时令饮食'],
  ['第六十一册', '钦定授时通考（一）', '清代', '农书/类书'],
  ['第六十二册', '钦定授时通考（二）', '清代', '农书/类书'],
  ['第六十三册', '钦定授时通考（三）', '清代', '农书/类书'],
  ['第六十四册', '钦定授时通考（四）', '清代', '农书/类书'],
  ['第六十五册', '钦定授时通考（五）', '清代', '农书/类书'],
  ['第六十六册', '钦定授时通考（六）', '清代', '农书/类书'],
  ['第六十七册', '钦定授时通考（七）', '清代', '农书/类书'],
  ['第六十八册', '钦定授时通考（八）', '清代', '农书/类书'],
  ['第六十九册', '钦定授时通考（九）', '清代', '农书/类书'],
  ['第七十册', '西石梁农圃便览', '清代', '农圃/食材'],
];

const cookingSeries = [
  ['东京梦华录、都城纪胜、西湖老人繁胜录、梦粱录、武林旧事', '宋代', '城市饮食'],
  ['吕氏春秋·本味篇', '先秦', '烹饪理论'],
  ['闲情偶寄·饮馔部', '清代', '饮馔理论'],
  ['养小录', '清代', '家政食谱'],
  ['中馈录', '宋代', '家庭食谱'],
  ['随园食单', '清代', '食谱'],
  ['云林堂饮食制度集', '元代', '食谱'],
  ['易牙遗意', '明代', '食谱'],
  ['醒园录', '清代', '川菜/食谱'],
  ['素食说略', '近代', '素食'],
  ['齐民要术·饮食部分', '北魏', '农书/食品加工'],
  ['千金食治、食疗方', '唐代', '食疗'],
  ['清异录·饮食部分', '宋代', '饮食掌故'],
  ['山家清供', '宋代', '食谱/清供'],
  ['饮馔服食笺', '明代', '食谱/养生'],
  ['食宪鸿秘', '清代', '食谱'],
  ['随息居饮食谱', '清代', '食疗/食物谱'],
  ['饮食须知', '元代', '饮食禁忌'],
  ['造洋饭书', '清代', '中西交流/西餐'],
  ['粥谱二种', '清代', '粥谱'],
  ['居家必用事类全集', '元代', '家政/食谱'],
  ['调鼎集', '清代', '食谱'],
  ['能改斋漫录', '宋代', '饮食掌故'],
  ['先秦烹饪史料选注', '先秦', '史料选注'],
  ['吴氏中馈录、本心斋疏食谱', '宋代', '家庭食谱/素食'],
  ['筵款丰馐依样调鼎新录', '清代', '宴席食谱'],
  ['饮膳正要', '元代', '宫廷食疗'],
  ['菽园杂记·饮食部分、升庵外集·饮食部分、饮食绅言·饮食部分', '明代', '饮食笔记'],
  ['陆游饮食诗选注', '宋代', '饮食文学'],
  ['清嘉录', '清代', '岁时饮食'],
  ['宋氏养生部·饮食部分', '明代', '养生饮食'],
  ['浪迹丛谈四种·饮食部分', '清代', '饮食笔记'],
  ['食疗本草', '唐代', '食疗本草'],
  ['太平御览·饮食部', '宋代', '类书'],
  ['东京梦华录（校注本）', '宋代', '城市饮食'],
  ['随园食单补证', '清代', '食谱补证'],
];

function makeEntry({ id, title, dynasty, category, collection, source, includedTexts = [], sequence }) {
  return {
    id,
    title,
    author: '详见所收各书',
    dynasty,
    category,
    collection,
    sequence,
    description: `${title}，收录/整理与中国传统饮食、食谱、茶酒、食疗、农书或食材相关的文献。`,
    included_texts: includedTexts,
    total_recipes: null,
    significance: '可作为菜谱复原、食材考证、技法推断和饮食文化语境分析的权威文献来源。',
    authority: {
      source_id: source.id,
      source_name: source.name,
      institution: source.institution,
      authority_type: source.authorityType,
      source_url: source.url,
      catalog_url: source.catalogUrl,
      verification_note: source.verificationNote,
    },
    restoration_scope: ['菜品复原', '食材考证', '技法推断', '饮食文化说明'],
  };
}

const collectionItems = volumeCatalog.map(([volume, included, dynasty, category], index) => makeEntry({
  id: `lit_afl_${String(index + 1).padStart(3, '0')}`,
  title: `古代饮食文献集成·${volume}`,
  dynasty,
  category,
  collection: '古代饮食文献集成',
  sequence: index + 1,
  includedTexts: included.split('；'),
  source: catalogSources.ancientFoodLiterature,
}));

const seriesItems = cookingSeries.map(([title, dynasty, category], index) => makeEntry({
  id: `lit_ccs_${String(index + 1).padStart(3, '0')}`,
  title,
  dynasty,
  category,
  collection: '中国烹饪古籍丛刊',
  sequence: index + 1,
  includedTexts: title.split('、').flatMap((part) => part.split('；')),
  source: catalogSources.cookingClassicsSeries,
}));

const items = [...collectionItems, ...seriesItems];

const dataset = {
  version: '2026-07-05',
  description: '风味考古局权威饮食/菜谱文献目录。条目优先来自正式出版丛书、图书馆馆藏目录和高校研究中心公开信息。',
  minimum_requirement: 100,
  total: items.length,
  sources: Object.values(catalogSources),
  items,
};

const literatureDir = resolve(repoRoot, 'data', 'literature');
mkdirSync(literatureDir, { recursive: true });
writeFileSync(
  resolve(literatureDir, 'authoritative_recipe_texts.json'),
  `${JSON.stringify(dataset, null, 2)}\n`,
  'utf8'
);

const ancientTextPath = resolve(repoRoot, 'data', 'knowledge_graph', 'nodes_ancient_text.json');
const existingTexts = JSON.parse(readFileSync(ancientTextPath, 'utf8'));
const existingByTitle = new Map(existingTexts.map((item) => [item.title, item]));
const generatedNodes = items.map((item, index) => ({
  id: `text_lit_${String(index + 1).padStart(3, '0')}`,
  title: item.title,
  author: item.author,
  dynasty: item.dynasty,
  description: item.description,
  total_recipes: item.total_recipes,
  significance: item.significance,
  category: item.category,
  collection: item.collection,
  source_url: item.authority.source_url,
  catalog_url: item.authority.catalog_url,
  authority_institution: item.authority.institution,
  verification_note: item.authority.verification_note,
  included_texts: item.included_texts,
}));

const mergedNodes = [
  ...existingTexts,
  ...generatedNodes.filter((item) => !existingByTitle.has(item.title)),
];

writeFileSync(ancientTextPath, `${JSON.stringify(mergedNodes, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  authoritativeRecipeTexts: items.length,
  ancientTextNodes: mergedNodes.length,
}, null, 2));
