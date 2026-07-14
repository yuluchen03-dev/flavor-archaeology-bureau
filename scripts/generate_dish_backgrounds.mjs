import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const AgnesImageService = require('../backend/src/services/AgnesImageService');

const dishesPath = path.join(repoRoot, 'data/knowledge_graph/nodes_dish.json');
const manifestPath = path.join(repoRoot, 'data/visual_assets/dish_backgrounds.json');
const outputDir = path.join(repoRoot, 'frontend/public/dish-backgrounds');
const envPath = path.join(repoRoot, 'backend/.env');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!process.env[key]) process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

const visualAnchors = {
  dish_001: 'a hollowed ripe orange cup with the top cut off, filled with steamed shredded crab meat and crab roe, small ceramic steaming bowl, no whole crab, no crab legs, no orange slices as garnish',
  dish_002: 'tight close-up crop of Tang-dynasty huai-leaf chilled noodles in a simple antique pottery bowl, pale jade-green thin noodles made with huai leaf juice, cool dry noodle texture with only a light oil sheen, a few small pale huai leaves as garnish, ancient Chinese summer food style, no modern vegetables, no bok choy, no lettuce, no cilantro bunch, no heavy soy sauce pool, no hot soup, no blank stamp area, no brush writing, no inscription, no square stamp, no red stamp, no seal mark, no logo-like mark, no menu, no label, no printed paper, no background text',
  dish_003: 'warm white radish and rice congee, silky pale porridge in a Song-style ceramic bowl, visible softened radish threads and rice grains, minimal elegant plating',
  dish_004: 'refined Qing-dynasty eight-treasure savory custard soup in a shallow celadon bowl, pale golden chicken broth thickened with countless tiny white cloud-like curd blossoms, rice-grain-size soft white flecks dispersed everywhere, minced ham, mushroom, pine nut, chicken and seafood specks evenly suspended through the soup, smooth semi-liquid porridge texture; no square white pieces, no geometric cubes, no large white sheets, no big white blocks, no toppings mound, no decorative panel, no parchment card, no border, no text',
  dish_005: 'tight close-up of Tang palace amber collagen minced meat thick soup filling the bowl, spoon-thick glossy golden red-brown gelatin gravy, tiny boneless minced meat bits no larger than beans, soft translucent collagen jelly dice, viscous sauce clinging to every small piece, no large meat chunks, no bones, no round bone cross-sections, no background side dishes, served as one full bowl of rich imperial minced meat gelatin soup; not a clear soup, not watery broth, no foot-shaped pieces, no bone-shaped garnish, no separate animal part on the table',
  dish_006: 'Tang-dynasty banquet sliced layered savory lamb roulade, a cooked boneless meat roll sliced into neat round medallions with poultry-and-glutinous-rice filling visible in cross section, lacquered brown glaze on a refined ceramic platter, elegant finished-dish presentation with only sliced cooked portions',
  dish_007: 'delicate ancient fish purse dish made from thin white fish fillets folded around fish mousse filling, smooth fish-meat texture visible, steamed or gently braised in clear broth glaze on an elegant Qing-style plate; no dough wrapper, no dumpling pleats, no baozi, no xiaolongbao, no meat-bun filling, no whole fish body',
  dish_008: 'stir-fried kidney flower cut with lychee-like crosshatch knife pattern, glossy sweet-sour brown sauce, curled bite-size kidney pieces as the clear main subject, ginger and scallion garnish only; no real lychee fruit, no lychee shell, no red spiky fruit pieces, no fruit garnish, no fruit platter',
  dish_009: 'lotus seedpod vessel filled in each round hole with steamed white fish mousse, pale green lotus pod container, light clear sauce, no whole fish',
  dish_010: 'neat cubes of Dongpo pork, glossy red-braised five-layer pork belly, thick sauce, classic Chinese ceramic bowl, no charred barbecue slices',
  dish_011: 'Liuzhou luosifen rice noodle soup in a deep bowl, white round rice noodles, red spicy snail broth, sour bamboo shoots, fried tofu skin, black fungus, peanuts, greens, chili oil, no roasted meat platter',
  dish_012: 'Shaxian snacks set on one wooden tray: small wontons in clear soup, peanut sauce noodles, shaomai dumplings, steamed snack bowls, Fujian street-food realism, no western fast food',
  dish_013: 'Jinyun barrel-oven baked thin round sesame flatbread close-up, very thin crisp pancake with golden char spots, crackly surface, white sesame, one small torn edge exposing dark brown preserved mustard greens and minced pork filling, thin layered crust and brittle edge; no thick pie, no green vegetable filling, no western pastry, no pizza slice',
  dish_014: 'Miao sour soup fish in cloudy bright red fermented tomato-sour broth, cooked fish chunks or half fish submerged in Guizhou red sour soup, chili, tomato, herbs and sour soup aromatics, clay pot, strong sour-spicy regional look, no whole intact fish with head and tail as the main display, no clear brown tomato stew, no hotpot clutter',
  dish_015: 'Xinjiang naan bread, round stamped flatbread with sesame, baked blistered surface from tandoor oven, stacked on a woven cloth, no pita wrap or pizza',
  dish_016: 'authentic Lanzhou beef noodle soup in a plain bowl, crystal-clear pale beef broth, hand-pulled thin noodles, paper-thin sliced beef not thick roast pork, white radish slices, bright red chili oil, chopped green garlic sprouts and cilantro, one clear two white three red four green look; no bok choy, no leafy greens, no ramen toppings, no soy egg, no seaweed, no decorated cup, no printed ceramic, no background writing, no rectangular frame, no stamp, no logo',
  dish_017: 'Guilin rice noodles, white rice noodles with dark aromatic gravy, crispy pork, pickled vegetables, peanuts, scallions, street bowl style, no pasta',
  dish_018: 'Yunnan crossing-the-bridge rice noodles close-up, large shallow white bowl of clear golden hot chicken broth with thin chicken-oil sheen and steam, fine white rice noodles, ultra-thin pale raw-looking meat or chicken slices just turning opaque in the broth, several whole tiny quail eggs, greens, bean sprouts and chives newly added; no halved egg, no soy-marinated egg, no ramen pork slices, no thick cooked roast meat, no hotpot clutter',
  dish_019: 'Zhenjiang pot-cover noodles in an old Jiangnan noodle-shop bowl, deep amber soy broth fills the bowl, thin springy wheat noodles lie loosely and irregularly submerged across the soup surface, flat natural noodle tangle not a nest, not a high mound, small scallions and simple bits only, plain documentary food photography; no ramen pork, no egg, no seaweed, no spaghetti coil, no dry sesame paste noodles',
  dish_020: 'Wuhan hot dry noodles close-up documentary food photo, yellow alkaline noodles already fully tossed so every strand is evenly coated tan by sesame paste, dry matte clingy texture, no visible liquid at the bottom, no sauce cap or blob on top, diced pickled long bean or radish, scallions, tiny red chili oil flecks only, ordinary Chinese snack bowl; no spaghetti-like smooth pasta, no tall noodle coil, no broth, no Zhenjiang soup noodles',
  dish_021: 'Hebei donkey meat huoshao street snack close-up, crispy rectangular flatbread split open and stuffed with finely chopped braised donkey meat shreds and tiny green pepper dice, meat is minced/chopped small not large chunks, simple street snack plate, no thick steak pieces, no burger bun, no sandwich loaf, no western sauce',
  dish_022: 'Shandong Zhoucun sesame cracker close-up, extremely thin paper-like round sesame wafers, flat golden sheets densely covered with white sesame, several wafer-thin discs stacked with curling edges and crisp cracks, no thick pastry, no fluffy interior, no bread-like layers, no cookie chunks',
  dish_023: 'Huangqiao sesame pastry, small layered flaky baked cakes with sesame tops, golden oil pastry, neat tea table setting, no hamburger',
  dish_024: 'Goubuli steamed buns, pleated white baozi with visible soup-rich pork filling in one opened bun, bamboo steamer, Tianjin style, no xiaolongbao basket confusion',
  dish_025: 'Dezhou braised chicken, whole cooked chicken with glossy brown skin, tender falling-apart joints on a Chinese platter, old master-stock look, no fried chicken',
  dish_026: 'Daokou roasted-braised chicken, intact spiced chicken with amber glossy skin on a plate, soft deboned texture suggested, Henan old brine, no raw poultry',
  dish_027: 'Goubangzi smoked chicken Northeast deli style, whole or chopped smoked chicken with tight dark tea-brown skin and subtle smoky sheen, amber-brown cold cooked poultry, rustic deli plate, no glossy red roast duck, no goose slices, no honey glaze, no charred black patches',
  dish_028: 'Jinhua ham, thin ruby-red cured ham slices with translucent fat, used as elegant ingredient beside a small broth bowl, Zhejiang cured ham, no bacon strips',
  dish_029: 'Xuanwei ham, rose-red cured ham slices and small steamed ham dish, Yunnan cured aroma, rustic wooden table, no western prosciutto platter',
  dish_030: 'Pixian douban chili broad-bean paste close-up, red fermented bean paste in a plain unlabeled ceramic bowl or jar, chili oil sheen, visible broad-bean pieces and red chili texture, Sichuan cooking ingredient still life on a blank table; no text, no Chinese characters, no label, no stamped jar, no watermark, no ketchup',
  dish_031: 'Zhenjiang aromatic black vinegar still life, glossy black-brown vinegar liquid in a small plain ceramic dipping bowl as the main subject, Jiangnan cold cucumber or dumpling edge only as minor context, clean blank table, no meat dish, no braised pork, no roast meat, no noodles as main subject, no wine glass',
  dish_032: 'Shanxi aged vinegar still life, dark mature vinegar in a rustic ceramic bowl and small clay vinegar jar, sorghum grains and wheat noodles as small background props, smoky aged vinegar mood, vinegar is the main subject, no meat dish, no roast slices, no noodle bowl as main subject, no soy sauce bottle',
  dish_033: 'Shaoxing yellow rice wine still life, amber huangjiu poured in a small traditional ceramic cup beside a plain clay wine jar and rice grains, warm Jiangnan table, wine is the main subject, no meat dish, no roast slices, no western wine bottle, no label text',
  dish_034: 'Beijing roast duck, sliced crispy duck skin and tender meat with thin pancakes, scallions, cucumber and sweet bean sauce, no whole live duck',
  dish_035: 'Beijing douzhi breakfast still life, pale gray-green fermented mung bean drink in a plain bowl as the main subject, crispy jiaoquan fried dough ring and pickled vegetables beside it, old Beijing snack, no porridge grains, no meat, no coffee, no soup noodles',
  dish_036: 'Luoyang water banquet soup dish, sour-spicy soup with sliced vegetables, meatballs or peony swallow-like radish slices, banquet bowl, no generic stew',
  dish_037: 'Xi’an lamb paomo, torn flatbread pieces soaked in rich lamb soup with sliced lamb, glass noodles, cilantro, chili paste and sugar garlic side, no curry',
  dish_038: 'Chaozhou braised goose, sliced lu goose with glossy soy-brown skin, goose wing or tofu pieces, garlic vinegar dip, Chaoshan plating, no roast turkey',
  dish_039: 'Foshan Mangong biscuit, thin hard round biscuits with peanuts and sesame, Cantonese traditional pastry on tea table, no western crackers',
  dish_040: 'Li Liangui smoked meat flatbread, flaky layered flatbread with dark smoked pork slices, scallions and bean sauce, Jilin snack, no sandwich loaf',
};

const agnesDishNames = {
  dish_002: 'plain bowl jade green cold noodles',
  dish_004: 'plain pale custard soup surface',
  dish_005: 'smooth amber gelatin sauce bowl',
  dish_007: 'flaky white fish fillet rolls',
  dish_008: 'brown crosshatched kidney slices only',
  dish_013: 'thin broken sesame cracker pieces',
  dish_014: 'Miao red sour soup fish',
  dish_016: 'plain clear Lanzhou beef noodle soup',
  dish_018: 'Yunnan crossing bridge rice noodles',
  dish_019: 'Zhenjiang noodles with small pot lid',
  dish_020: 'dark sesame coated Wuhan hot dry noodles',
  dish_021: 'Hebei donkey meat huoshao',
  dish_022: 'paper thin Zhoucun sesame wafer sheets',
  dish_027: 'dark smoked shredded chicken salad',
  dish_030: 'Pixian chili bean paste',
  dish_031: 'Zhenjiang black vinegar still life',
  dish_032: 'black vinegar liquid only still life',
  dish_033: 'amber huangjiu cup only still life',
  dish_035: 'Beijing douzhi fermented drink',
  dish_006: 'sliced savory lamb roulade',
  dish_037: 'Xi-an lamb paomo with torn bread cubes',
  dish_038: 'dark Teochew luwei goose meat bowl',
  dish_039: 'Foshan Mangong biscuit',
};

const visualAnchorOverrides = {
  dish_002: 'extreme close crop of one plain bowl of Tang huai-leaf chilled noodles so almost no table is visible, pale jade-green thin noodles tossed dry with a tiny oil sheen, only tiny pale leaf flecks and sesame-like seasoning on the noodles, clean unmarked ceramic bowl; absolutely no red object anywhere, no red seal, no stamp, no printed paper, no calligraphy, no menu, no background props, no bok choy, no lettuce, no cilantro bunch, no soup broth, no soy sauce pool',
  dish_004: 'one isolated shallow bowl of pale ivory eight-treasure savory custard soup filling the frame, perfectly smooth semi-liquid surface like steamed egg custard blended into soup, sparse tiny pinhead black and tan flecks dispersed flat across the liquid, no central garnish at all, no seeds, no rice grains, no background dish, no second plate, no meat anywhere in the scene; every visible solid must be smaller than a pepper flake; absolutely no tofu blocks, no square white pieces, no cubes, no diced topping, no mushroom chunks, no meat slices, no beans, no writing',
  dish_005: 'one isolated bowl of smooth amber-brown palace collagen gravy filling the frame, glossy syrupy liquid surface with only pepper-grain dark minced particles suspended in it, no distinct chunks at all, no central lump, no yellow object, no potato-like piece, no carrot, no pork belly cubes, no red-braised meat blocks, no bones, no hoof shape, no animal foot, no clear broth, no stew, no side dishes, no background writing, no Chinese characters',
  dish_007: 'Qing fish fillet rolls made entirely from pearly white fish flesh, several loose rolls of flaky fish fillet with visible fish muscle grain and fish mousse at open edges, lightly glazed with clear broth on porcelain; no rice noodle sheets, no rice rolls, no wheat dough, no dumpling wrapper, no sealed pouch, no pleated top, no baozi, no steamed buns, no chicken meat',
  dish_008: 'brown crosshatched kidney flower stir fry only, close crop of irregular curled kidney slices, every slice has obvious knife-cut crosshatch ridges, glossy brown sauce clings to the ridges, ginger slivers and scallion only; no lychee word as fruit, no red objects, no round balls, no fruit, no nuts, no cashews, no mushrooms, no smooth round pieces',
  dish_013: 'Jinyun sesame shaobing close-up, two small rustic hand-formed round Chinese baked flatbreads with sesame and barrel-oven char freckles, one flatbread torn open by hand exposing a very thin dark preserved-vegetable minced filling line, rough uneven edges, dry crisp surface, street-snack realism; no square crackers, no perfect rectangles, no triangular wedges, no radial slices, no pizza layout, no cheese, no green leafy filling, no western appetizer, no calligraphy, no Chinese characters, no writing',
  dish_016: 'plain Lanzhou beef noodle soup bowl filling the frame, crystal clear pale beef broth visible between thin hand-pulled noodles, small sparse paper-thin lean beef slices, white radish rounds, red chili oil droplets, chopped green garlic and cilantro lightly sprinkled, clean blank table; no calligraphy, no writing, no printed paper, no decorative background, no bok choy, no leafy vegetable cluster, no soy egg, no ramen pork, no thick roast meat slab, no chashu, no seaweed',
  dish_018: 'Yunnan crossing-the-bridge rice noodles, large shallow bowl of clear golden steaming chicken broth with a thin oil sheen, fine white rice noodles mostly submerged, ultra-thin pale meat slices just turning opaque in the hot broth, several whole tiny quail eggs, bean sprouts and chives; no halved egg, no soy egg, no ramen, no thick roast pork, no noodle mound, no hotpot platter',
  dish_019: 'Zhenjiang pot-cover noodles, deep dark amber soy broth dominates a plain bowl, thin wheat noodles are spread loose and mostly submerged across the soup surface, a small round wooden pot lid is partly floating in the broth near the edge, small scallions only, old Jiangnan noodle shop realism; no pale clear broth, no high noodle nest, no ramen pork, no egg, no seaweed, no dry sesame paste noodles, no spaghetti coil',
  dish_020: 'Wuhan hot dry noodles after vigorous mixing, alkaline noodles are all the same deep tan-brown color from thick sesame paste, visible matte sesame paste coating in the crevices between strands, diced pickled radish or long beans and scallions mixed throughout the noodles, dry sticky texture; no pale noodles, no separate sauce mound, no sauce cap, no garnish pile, no liquid, no soup, no oil pool, no glossy spaghetti, no Italian pasta',
  dish_021: 'Hebei donkey meat huoshao street snack, rectangular crispy flaky flatbread split open like a pocket, densely stuffed with finely chopped braised donkey meat shreds and tiny green pepper dice, handheld snack presentation; no large meat chunks, no steak slices on a plate, no burger bun, no western sandwich bread',
  dish_022: 'Shandong Zhoucun sesame cracker, many ultra-thin round sesame wafer sheets under one millimeter thick, paper-like discs and broken shards lying flat directly on the table, translucent curling edges, dry brittle cracks, dense white sesame surface, hard crisp wafer texture; no single thick pancake, no raised rim, no pizza, no thick biscuit, no stacked pastry height, no bread, no cookie mound, no fluffy interior',
  dish_027: 'Goubangzi smoked chicken as Northeast cold deli shredded chicken, a low mound of dark tea-smoked pulled chicken strips and chopped breast meat, fibrous beige-brown meat with dry smoky edges, matte not glossy, no intact poultry anatomy visible, simple cold appetizer plate cropped close; no skin sheets, no golden skin bands, no sliced roast breast with skin, no sauce puddle, no orange glaze, no honey glaze, no roast duck, no goose, no whole bird silhouette, no leg, no drumstick, no wing, no lacquered barbecue look, no black char',
  dish_031: 'Zhenjiang aromatic black vinegar ingredient still life, minimal close-up of one small plain ceramic dipping bowl filled only with glossy black-brown vinegar liquid, one plain unlabeled vinegar jar blurred behind it, empty blank table with no plated food; the liquid vinegar is the only subject; no meat, no braised pork, no roast, no noodles, no dumplings, no vegetables as main subject, no wine cup, no label text',
  dish_032: 'Shanxi aged vinegar ingredient still life, only dark black-brown vinegar liquid in a small rustic ceramic bowl as the main foreground subject, one plain unlabeled clay vinegar jar behind it, a few dry sorghum grains scattered on an otherwise empty table; no cooked food anywhere, no meat, no roast slices, no noodles, no food plate, no chopsticks, no soy sauce bottle, no label, no text',
  dish_033: 'Shaoxing yellow rice wine still life, only transparent amber huangjiu liquid in one small traditional ceramic cup as the main foreground subject, one plain unlabeled clay wine jar behind it, a few dry rice grains on an otherwise empty table; no cooked food anywhere, no meat dish, no roast slices, no noodles, no braised food, no food plate, no chopsticks, no western bottle, no label, no text',
  dish_035: 'old Beijing douzhi breakfast still life, pale gray-green fermented mung bean drink as smooth thin liquid in a plain bowl or cup, jiaoquan fried dough ring on a separate small plate and a small pile of pickles beside it, liquid drink is the main subject; no porridge grains, no cereal, no meat, no shrimp, no noodles, no soup stew, no coffee',
  dish_037: 'Xi-an lamb paomo close-up, many small hand-torn white flatbread cubes densely soaked in clear lamb soup, sliced lamb, glass noodles, cilantro, red chili paste and a small side of sugar garlic, the bread pieces are small cubes not large sheets; no wide noodles, no big flatbread strips, no ramen, no curry',
  dish_038: 'Teochew Chaozhou luwei goose cold platter, irregular dark soy master-stock goose meat chunks and torn boneless pieces in a shallow celadon bowl, deep brown braised surfaces and beige cut faces mixed together, a clearly visible small saucer of chopped garlic in black vinegar beside the bowl, old Chaoshan brine-house table mood; no glossy poultry skin, no roast duck, no roast chicken, no orange lacquer surface, no neat fan slices, no whole bird, no head, no neck, no leg, no drumstick, no wing, no tofu blocks, no border decoration, no writing',
  dish_039: 'Foshan Mangong biscuit close-up, very thin hard pale-golden Cantonese tea biscuits, flat round discs only a few millimeters thick, dry dense firm texture, embedded crushed peanuts and sesame clearly visible, neatly stacked on a plain Chinese tea plate; no soft cookie, no western cookie mound, no thick biscuit, no syrup, no sauce, no chocolate chips, no flaky pastry',
};

function buildPromptLegacy(dish) {
  const anchor = visualAnchors[dish.id] || `${dish.name}, ${dish.description}, ${dish.taste_profile}`;
  return [
    'Use case: photorealistic-natural',
    'Asset type: website star-map dish detail background image, landscape banner.',
    `Primary request: ${dish.name} high-quality food background image generated with Agnes AI.`,
    `Dish facts: ${dish.description} Flavor: ${dish.taste_profile}.`,
    `Subject: ${anchor}.`,
    'Composition/framing: 3/4 overhead food photography, main dish slightly left of center, clean right-side negative space for UI text, full plate or bowl visible.',
    'Lighting/mood: warm natural museum-table light, refined Chinese culinary archive atmosphere, shallow depth of field, appetizing but restrained.',
    'Color palette: warm paper, celadon ceramic, cinnabar accents when appropriate.',
    'Constraints: the food must look real, cooked, edible, and specific to the named dish; no fantasy ingredients; no raw animal body unless the dish is traditionally served whole and cooked.',
    'Avoid: text, labels, watermark, logo, hands, people, cartoon, abstract collage, ingredient inventory layout, western plating unless explicitly part of the food.',
    '中文补充：必须像这道菜本身，不要生成无关烤肉盘、西餐、抽象拼贴或食材陈列。画面要适合作为网页详情卡背景，右侧可读文字。',
  ].join('\n');
}

function buildPrompt(dish) {
  const anchor = visualAnchorOverrides[dish.id] || visualAnchors[dish.id] || `${dish.description}; ${dish.taste_profile}`;
  return [
    'Use case: photorealistic-natural',
    'Asset type: website star-map dish detail background image, landscape banner.',
    `Primary request: high-quality photorealistic Chinese heritage food background image generated with Agnes AI for ${dish.id}.`,
    `Subject: ${anchor}.`,
    'Composition/framing: 3/4 overhead food photography, main dish slightly left of center, clean right-side negative space for UI text, full plate or bowl visible.',
    'Lighting/mood: warm natural museum-table light, refined Chinese culinary archive atmosphere, shallow depth of field, appetizing but restrained.',
    'Color palette: warm paper, celadon ceramic, cinnabar accents when appropriate.',
    'Food realism constraints: the subject must look real and specific to this dish; if it is a liquid condiment or beverage, make that liquid the coherent subject, otherwise make it one coherent cooked plated dish, not a raw ingredient display and not a fantasy collage.',
    'Critical text ban: absolutely no visible words, no Chinese characters, no English letters, no calligraphy, no label, no menu, no watermark, no logo, no seal stamp, no decorative title plaque, no border panel.',
    'Avoid: hands, people, cartoon, abstract collage, ingredient inventory layout, western plating unless explicitly part of the food, unrelated roast meat platter.',
  ].join('\n');
}

function buildManifestPrompt(dish, prompt) {
  return [
    `Manifest dish name: ${dish.name}. Do not render this metadata as visible image text.`,
    prompt,
  ].join('\n');
}

async function downloadImage(imageUrl) {
  if (imageUrl.startsWith('data:')) {
    return Buffer.from(imageUrl.split(',')[1], 'base64');
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download generated image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function readManifest() {
  if (!fs.existsSync(manifestPath)) {
    return { generatedAt: null, images: [] };
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=');
    args.set(key, value);
  }
  return args;
}

async function main() {
  loadEnvFile(envPath);
  const args = parseArgs();
  const only = args.get('only');
  const limit = Number(args.get('limit') || 0);
  const force = args.get('force') === 'true';
  const suffix = args.get('suffix') || '';
  const dishes = JSON.parse(fs.readFileSync(dishesPath, 'utf8'));
  const service = new AgnesImageService({ size: process.env.AGNES_BACKGROUND_SIZE || '1536x1024' });

  if (!service.isConfigured()) {
    throw new Error('Agnes image generation is not configured. Check backend/.env AGNES_API_KEY.');
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const manifest = readManifest();
  const byDish = new Map(manifest.images.map((entry) => [entry.dishId, entry]));
  const targets = dishes
    .filter((dish) => !only || dish.id === only)
    .filter((dish) => force || !byDish.get(dish.id)?.imagePath || !fs.existsSync(path.join(repoRoot, 'frontend/public', byDish.get(dish.id).imagePath.replace(/^\//, ''))))
    .slice(0, limit || undefined);

  for (const dish of targets) {
    const prompt = buildPrompt(dish);
    const outName = `${dish.id}${suffix ? `-${suffix}` : ''}.png`;
    const outPath = path.join(outputDir, outName);
    console.log(`Generating ${dish.id} ${dish.name}`);
    const generated = await service.generate({ dishName: agnesDishNames[dish.id] || dish.name, prompt });
    const buffer = await downloadImage(generated.imageUrl);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved ${outPath} (${buffer.length} bytes)`);

    if (suffix) {
      continue;
    }

    byDish.set(dish.id, {
      dishId: dish.id,
      dishName: dish.name,
      provider: 'agnes',
      model: generated.model,
      imagePath: `/dish-backgrounds/${outName}`,
      prompt: buildManifestPrompt(dish, prompt),
      qaStatus: 'pending_review',
      bytes: buffer.length,
      generatedAt: new Date().toISOString(),
    });

    manifest.generatedAt = new Date().toISOString();
    manifest.images = dishes.map((item) => byDish.get(item.id)).filter(Boolean);
    writeManifest(manifest);
  }

  console.log(JSON.stringify({ generated: targets.length, manifestPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
