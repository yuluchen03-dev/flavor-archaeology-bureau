# Phase 1 Product Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the phase 1 foundation for image-aware ancestor recognition, account-backed light-mode state, expanded quiz/fragment content, and platform-ready sharing.

**Architecture:** Keep `LightModeService` as the orchestration boundary and extract image analysis, collection/draw economy, fragment queries, and platform share intents into focused backend services. Add small frontend helpers for auth/API calls, then update `Layout` and `LightMode` to surface account state, uploaded-image evidence, draw state, and share intents while preserving anonymous MVP flows.

**Tech Stack:** Node.js, Express, Jest, SQLite/Knex, React 19, Vite, browser `localStorage`, existing JSON knowledge-graph data.

---

## File Structure

Backend files:

- Create `backend/src/services/VisionService.js`: VLM-compatible image analysis interface with honest local fallback.
- Create `backend/src/services/CollectionService.js`: user collection and daily draw state.
- Create `backend/src/services/ShareIntentService.js`: Xiaohongshu/Douyin publish-prep copy and intent metadata.
- Create `backend/src/services/FragmentService.js`: query structured ancient fragment data.
- Create `backend/src/controllers/fragmentController.js`: HTTP controller for fragment list/detail.
- Create `backend/src/routes/fragments.js`: fragment route registration.
- Create `backend/src/migrations/002_light_mode_foundation.js`: tables for collections, daily draws, share records.
- Create `data/light_mode/fake_dishes.json`: expanded fake-dish bank.
- Create `data/light_mode/quiz_real_dishes.json`: real-dish quiz references.
- Create `data/fragments/ancient_fragments.json`: structured fragment library.
- Modify `backend/src/services/LightModeService.js`: delegate to new services and include `vision`, `draws`, and `platformIntents`.
- Modify `backend/src/controllers/lightModeController.js`: pass `req.user?.id` and query filters.
- Modify `backend/src/routes/light.js`: add `optionalAuth`.
- Modify `backend/src/routes/index.js`: mount fragment routes.
- Modify backend tests under `backend/src/services/__tests__` and `backend/src/routes/__tests__`.

Frontend files:

- Create `frontend/src/lib/authStore.js`: token/user localStorage helpers.
- Create `frontend/src/lib/apiClient.js`: fetch wrapper with optional auth token.
- Create `frontend/src/components/AuthPanel.jsx`: login/register/current-user UI.
- Modify `frontend/src/components/Layout.jsx`: show auth panel entry.
- Modify `frontend/src/pages/LightMode.jsx`: image data upload, vision evidence, draw state, platform share intents.
- Create or extend frontend tests under `frontend/src/pages/__tests__` or `frontend/src/lib/__tests__`.

Verification files:

- Existing `frontend/src/pages/__tests__/evolutionDishes.test.mjs` remains required.
- Existing Python service tests remain required.

---

### Task 1: Backend Vision Service

**Files:**
- Create: `backend/src/services/VisionService.js`
- Test: `backend/src/services/__tests__/VisionService.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/__tests__/VisionService.test.js`:

```js
const VisionService = require('../VisionService');

describe('VisionService', () => {
  test('returns structured fallback evidence and dish candidate from image and text clues', async () => {
    const result = await VisionService.analyzeFoodImage({
      imageLabel: 'crab-orange-steamed.jpg',
      description: 'A steamed crab dish served inside an orange shell.',
      imageData: 'data:image/jpeg;base64,abc123',
    });

    expect(result.provider).toBe('fallback');
    expect(result.labels).toEqual(expect.arrayContaining(['crab', 'orange', 'steamed dish']));
    expect(result.ingredients).toEqual(expect.arrayContaining(['crab', 'orange']));
    expect(result.dishCandidates[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
    });
    expect(result.dishCandidates[0].confidence).toBeGreaterThan(0.8);
    expect(result.evidence.join(' ')).toContain('crab');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('returns low-confidence fallback when no usable image or text clues exist', async () => {
    const result = await VisionService.analyzeFoodImage({});

    expect(result.provider).toBe('fallback');
    expect(result.labels).toEqual([]);
    expect(result.ingredients).toEqual([]);
    expect(result.dishCandidates).toEqual([]);
    expect(result.confidence).toBeLessThan(0.4);
    expect(result.evidence).toContain('No usable visual or text clues were provided.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- VisionService.test.js --runInBand
```

Expected: FAIL because `../VisionService` does not exist.

- [ ] **Step 3: Implement `VisionService`**

Create `backend/src/services/VisionService.js`:

```js
const path = require('path');

const dishes = require(path.join(__dirname, '../../../data/knowledge_graph/nodes_dish.json'));

const cueRules = [
  {
    dishId: 'dish_001',
    labels: ['crab', 'orange', 'steamed dish'],
    ingredients: ['crab', 'orange'],
    keywords: ['crab', 'orange', 'steamed', '蟹', '橙', '蒸'],
    confidence: 0.92,
  },
  {
    dishId: 'dish_002',
    labels: ['cold noodles', 'leaf', 'green noodles'],
    ingredients: ['noodles', 'sophora leaf'],
    keywords: ['noodle', 'cold noodle', 'leaf', '槐叶', '冷淘', '面'],
    confidence: 0.82,
  },
  {
    dishId: 'dish_003',
    labels: ['radish', 'rice porridge', 'soup'],
    ingredients: ['radish', 'rice'],
    keywords: ['radish', 'rice', 'porridge', '萝卜', '米', '羹'],
    confidence: 0.78,
  },
  {
    dishId: 'dish_004',
    labels: ['tofu', 'mushroom', 'braised dish'],
    ingredients: ['tofu', 'mushroom'],
    keywords: ['tofu', 'mushroom', '豆腐', '蘑菇', '菇'],
    confidence: 0.76,
  },
  {
    dishId: 'dish_006',
    labels: ['roasted meat', 'lamb', 'skewer'],
    ingredients: ['lamb', 'meat'],
    keywords: ['lamb', 'roast', 'meat', '羊', '烤肉', '肉'],
    confidence: 0.74,
  },
];

function normalize(value = '') {
  return String(value).toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

class VisionService {
  static async analyzeFoodImage({ imageData = '', imageLabel = '', description = '' } = {}) {
    const clue = normalize(`${imageLabel} ${description}`);
    const hasImagePayload = Boolean(imageData && String(imageData).startsWith('data:image/'));

    if (!clue.trim() && !hasImagePayload) {
      return {
        provider: 'fallback',
        labels: [],
        ingredients: [],
        dishCandidates: [],
        confidence: 0.2,
        evidence: ['No usable visual or text clues were provided.'],
      };
    }

    const matches = cueRules
      .map((rule) => {
        const matchedKeywords = rule.keywords.filter((keyword) => clue.includes(normalize(keyword)));
        if (matchedKeywords.length === 0) return null;
        const dish = dishes.find((item) => item.id === rule.dishId);
        const confidence = Math.min(0.98, rule.confidence + matchedKeywords.length * 0.02 + (hasImagePayload ? 0.02 : 0));
        return {
          rule,
          matchedKeywords,
          candidate: {
            dishId: rule.dishId,
            name: dish?.name || rule.dishId,
            confidence,
            reason: `Matched visual/text cues: ${matchedKeywords.join(', ')}.`,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.candidate.confidence - a.candidate.confidence);

    if (matches.length === 0) {
      return {
        provider: 'fallback',
        labels: hasImagePayload ? ['food image'] : [],
        ingredients: [],
        dishCandidates: [],
        confidence: hasImagePayload ? 0.35 : 0.25,
        evidence: hasImagePayload
          ? ['Image payload was provided, but fallback rules found no confident food ancestry match.']
          : ['Text was provided, but fallback rules found no confident food ancestry match.'],
      };
    }

    return {
      provider: 'fallback',
      labels: unique(matches.flatMap((match) => match.rule.labels)),
      ingredients: unique(matches.flatMap((match) => match.rule.ingredients)),
      dishCandidates: matches.map((match) => match.candidate),
      confidence: matches[0].candidate.confidence,
      evidence: matches.flatMap((match) => match.matchedKeywords.map((keyword) => `Matched cue: ${keyword}`)),
    };
  }
}

module.exports = VisionService;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- VisionService.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

Git may not work in this workspace. If it does:

```powershell
git add backend/src/services/VisionService.js backend/src/services/__tests__/VisionService.test.js
git commit -m "feat: add light mode vision service"
```

If `git status` still reports this is not a repository, record that in the final implementation notes.

---

### Task 2: Share Intent Service

**Files:**
- Create: `backend/src/services/ShareIntentService.js`
- Test: `backend/src/services/__tests__/ShareIntentService.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/__tests__/ShareIntentService.test.js`:

```js
const ShareIntentService = require('../ShareIntentService');

describe('ShareIntentService', () => {
  test('builds Xiaohongshu and Douyin publish-prep intents without claiming autopublish', () => {
    const card = {
      title: '风味复活证书 · 蟹酿橙',
      subtitle: '可信复原',
      dishName: '蟹酿橙',
      dynasty: '宋代',
      rarity: '灭绝',
      confidence: 90,
      certificateId: 'FAB-REV-00000001',
      shareText: '风味复活证书 · 蟹酿橙｜宋代｜灭绝｜90%可信复原',
    };

    const intents = ShareIntentService.buildPlatformIntents(card);

    expect(intents.xiaohongshu.canAutoPublish).toBe(false);
    expect(intents.douyin.canAutoPublish).toBe(false);
    expect(intents.xiaohongshu.copyText).toContain('蟹酿橙');
    expect(intents.xiaohongshu.hashtags).toEqual(expect.arrayContaining(['非遗美食', '风味考古局']));
    expect(intents.douyin.publishUrl).toContain('douyin.com');
    expect(intents.xiaohongshu.reason).toContain('authorization');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- ShareIntentService.test.js --runInBand
```

Expected: FAIL because `../ShareIntentService` does not exist.

- [ ] **Step 3: Implement `ShareIntentService`**

Create `backend/src/services/ShareIntentService.js`:

```js
function compact(values) {
  return values.filter(Boolean);
}

class ShareIntentService {
  static buildPlatformIntents(card = {}) {
    const hashtags = compact([
      '风味考古局',
      '非遗美食',
      card.dynasty,
      card.rarity,
      card.dishName,
    ]);
    const baseCopy = compact([
      card.shareText || card.title,
      card.subtitle,
      card.certificateId ? `证书编号：${card.certificateId}` : '',
      `#${hashtags.join(' #')}`,
    ]).join('\n');

    return {
      xiaohongshu: {
        title: card.title || '风味复活证书',
        body: baseCopy,
        hashtags,
        copyText: baseCopy,
        publishUrl: 'https://www.xiaohongshu.com/explore',
        canAutoPublish: false,
        reason: 'Requires user account authorization on platform.',
      },
      douyin: {
        title: card.title || '风味复活证书',
        body: baseCopy,
        hashtags,
        copyText: baseCopy,
        publishUrl: 'https://www.douyin.com/',
        canAutoPublish: false,
        reason: 'Requires user account authorization on platform.',
      },
    };
  }
}

module.exports = ShareIntentService;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- ShareIntentService.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/src/services/ShareIntentService.js backend/src/services/__tests__/ShareIntentService.test.js
git commit -m "feat: add platform share intents"
```

If git is unavailable, record it in final notes.

---

### Task 3: Expanded Quiz Data

**Files:**
- Create: `data/light_mode/fake_dishes.json`
- Create: `data/light_mode/quiz_real_dishes.json`
- Modify: `backend/src/services/LightModeService.js`
- Test: `backend/src/services/__tests__/LightModeService.complete.test.js`

- [ ] **Step 1: Write the failing test**

Append to `backend/src/services/__tests__/LightModeService.complete.test.js`:

```js
test('true-or-fake round can filter expanded quiz bank by difficulty', async () => {
  const result = await LightModeService.getAuthenticityRound({ seed: 7, difficulty: 'easy' });

  expect(result.mode).toBe('authenticity');
  expect(result.options).toHaveLength(2);
  expect(result.options.some((option) => option.isReal)).toBe(true);
  expect(result.options.some((option) => option.isReal === false)).toBe(true);
  expect(result.difficulty).toBe('easy');
  expect(result.fakeTell).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- LightModeService.complete.test.js --runInBand
```

Expected: FAIL because `difficulty` and `fakeTell` are not returned and the data files do not exist.

- [ ] **Step 3: Add quiz data files**

Create `data/light_mode/fake_dishes.json` with at least these 12 entries:

```json
[
  {
    "id": "fake_001",
    "name": "云母月光羹",
    "dynasty": "宋代",
    "description": "号称以云母粉入羹、月下凝露成冻，名字很雅，但缺少可靠食方出处。",
    "source": "饕餮现场造梗",
    "tell": "云母入食和月露凝冻都缺少可验证食方依据。",
    "difficulty": "easy"
  },
  {
    "id": "fake_002",
    "name": "凤凰琉璃脯",
    "dynasty": "唐代",
    "description": "把神鸟意象和琉璃审美硬拼成菜名，没有稳定古籍食谱支撑。",
    "source": "AI 幻觉样本",
    "tell": "名称堆砌华丽意象，但食材、技法、出处都不闭合。",
    "difficulty": "easy"
  },
  {
    "id": "fake_003",
    "name": "金露荔枝炙",
    "dynasty": "宋代",
    "description": "宣称用金露浸荔枝再炙烤成宴席主菜，违背荔枝保鲜与炙烤常识。",
    "source": "饕餮反例库",
    "tell": "技法和食材状态冲突，且无明确食单来源。",
    "difficulty": "medium"
  },
  {
    "id": "fake_004",
    "name": "龙涎雪花豆腐",
    "dynasty": "清代",
    "description": "把香料名、雪花口感和豆腐拼贴在一起，像菜名但没有可追溯食方。",
    "source": "AI 幻觉样本",
    "tell": "关键词像传统菜，组合关系却没有出处证据。",
    "difficulty": "medium"
  },
  {
    "id": "fake_005",
    "name": "霓裳玉露面",
    "dynasty": "唐代",
    "description": "借用霓裳羽衣曲意象包装面食，但缺少食材、技法和文本链。",
    "source": "饕餮反例库",
    "tell": "文化意象不能替代食谱出处。",
    "difficulty": "easy"
  },
  {
    "id": "fake_006",
    "name": "麒麟桂花酥",
    "dynasty": "明代",
    "description": "以祥瑞命名的点心设定，但没有明确古籍或地方技艺线索。",
    "source": "AI 幻觉样本",
    "tell": "泛化祥瑞命名是常见伪传统线索。",
    "difficulty": "easy"
  },
  {
    "id": "fake_007",
    "name": "天香玛瑙鱼",
    "dynasty": "清代",
    "description": "把宝石色泽和鱼肴混合叙述，缺少可执行烹饪步骤。",
    "source": "饕餮反例库",
    "tell": "只有审美描述，没有来源、火候、调味结构。",
    "difficulty": "medium"
  },
  {
    "id": "fake_008",
    "name": "银汉莲子冻",
    "dynasty": "宋代",
    "description": "宣称取银河意象制成宫廷冷冻甜品，时代冷冻条件和出处都可疑。",
    "source": "AI 幻觉样本",
    "tell": "技术条件与文本证据都不足。",
    "difficulty": "hard"
  },
  {
    "id": "fake_009",
    "name": "紫电青霜羹",
    "dynasty": "唐代",
    "description": "名字来自兵器和诗性词汇，并非可信食物命名链。",
    "source": "饕餮反例库",
    "tell": "诗性词汇堆叠，缺少食材与技法。",
    "difficulty": "medium"
  },
  {
    "id": "fake_010",
    "name": "琥珀云腿茶",
    "dynasty": "明代",
    "description": "把火腿和茶汤写成甜饮，风味逻辑和食单出处都不成立。",
    "source": "AI 幻觉样本",
    "tell": "跨品类混搭没有历史证据支撑。",
    "difficulty": "hard"
  },
  {
    "id": "fake_011",
    "name": "月魄珍珠鸭",
    "dynasty": "清代",
    "description": "用月魄和珍珠制造宫廷感，但没有具体原料和工艺记录。",
    "source": "饕餮反例库",
    "tell": "宫廷感不是古籍证据。",
    "difficulty": "easy"
  },
  {
    "id": "fake_012",
    "name": "霞影酥山粥",
    "dynasty": "宋代",
    "description": "把酥山和粥混成同一道热食，概念互相打架。",
    "source": "AI 幻觉样本",
    "tell": "历史食品概念被错误拼接。",
    "difficulty": "hard"
  }
]
```

Create `data/light_mode/quiz_real_dishes.json`:

```json
[
  { "dishId": "dish_001", "difficulty": "easy" },
  { "dishId": "dish_002", "difficulty": "easy" },
  { "dishId": "dish_003", "difficulty": "easy" },
  { "dishId": "dish_004", "difficulty": "medium" },
  { "dishId": "dish_005", "difficulty": "hard" },
  { "dishId": "dish_006", "difficulty": "medium" },
  { "dishId": "dish_007", "difficulty": "medium" },
  { "dishId": "dish_008", "difficulty": "hard" },
  { "dishId": "dish_009", "difficulty": "medium" },
  { "dishId": "dish_010", "difficulty": "hard" },
  { "dishId": "dish_001", "difficulty": "medium" },
  { "dishId": "dish_003", "difficulty": "hard" }
]
```

- [ ] **Step 4: Modify `LightModeService.getAuthenticityRound`**

Update imports near the top:

```js
const fakeDishBank = require(path.join(__dirname, '../../../data/light_mode/fake_dishes.json'));
const realQuizBank = require(path.join(__dirname, '../../../data/light_mode/quiz_real_dishes.json'));
```

Remove the inline `fakeDishBank` constant. Update `getAuthenticityRound`:

```js
  static async getAuthenticityRound({ seed = Date.now(), dynasty, difficulty } = {}) {
    const numericSeed = Number(seed) || Date.now();
    const filteredRealRefs = realQuizBank.filter((entry) => {
      const dish = getDishById(entry.dishId);
      return (!difficulty || entry.difficulty === difficulty) && (!dynasty || dish.dynasty === dynasty);
    });
    const filteredFakes = fakeDishBank.filter((entry) =>
      (!difficulty || entry.difficulty === difficulty) && (!dynasty || entry.dynasty === dynasty)
    );
    const realRefs = filteredRealRefs.length ? filteredRealRefs : realQuizBank;
    const fakes = filteredFakes.length ? filteredFakes : fakeDishBank;
    const realRef = realRefs[numericSeed % realRefs.length];
    const realDish = getDishById(realRef.dishId);
    const fakeDish = fakes[numericSeed % fakes.length];
    const realFirst = numericSeed % 2 === 0;
    const options = [
      {
        id: realDish.id,
        name: realDish.name,
        dynasty: realDish.dynasty,
        description: realDish.description,
        source: realDish.source_text,
        isReal: true,
      },
      {
        id: fakeDish.id,
        name: fakeDish.name,
        dynasty: fakeDish.dynasty,
        description: fakeDish.description,
        source: fakeDish.source,
        isReal: false,
      },
    ];
    const orderedOptions = realFirst ? options : options.reverse();

    return {
      mode: 'authenticity',
      question: '哪一道是真正有古籍/食单线索支撑的非遗风味？',
      options: orderedOptions,
      answerId: realDish.id,
      difficulty: difficulty || realRef.difficulty || fakeDish.difficulty,
      fakeTell: fakeDish.tell,
      explanation: `真菜是《${realDish.name}》，线索来自${realDish.source_text}。另一道是饕餮故意编出的幻觉样本：${fakeDish.tell}`,
      shareCard: buildShareCard({
        type: 'quiz',
        title: `真假非遗 · 我识破了${fakeDish.name}`,
        subtitle: '把 AI 幻觉变成科普游戏',
        dish: realDish,
        rarity: getRarity(realDish),
        confidence: 86,
      }),
    };
  }
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- LightModeService.complete.test.js --runInBand
```

Expected: PASS.

---

### Task 4: Collection And Draw Service

**Files:**
- Create: `backend/src/services/CollectionService.js`
- Create: `backend/src/migrations/002_light_mode_foundation.js`
- Test: `backend/src/services/__tests__/CollectionService.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/__tests__/CollectionService.test.js`:

```js
const CollectionService = require('../CollectionService');

describe('CollectionService', () => {
  test('anonymous users get deterministic non-persistent draw state', async () => {
    const state = await CollectionService.recordDailyRevival({
      userId: null,
      dish: { id: 'dish_001', dynasty: '宋代' },
      date: '2026-06-30',
    });

    expect(state.draws).toEqual({ usedToday: 0, limit: 3, remaining: 3, streakDays: 0 });
    expect(state.collection).toMatchObject({
      status: 'preview',
      starId: 'star-dish_001',
      constellation: '宋代风味星座',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- CollectionService.test.js --runInBand
```

Expected: FAIL because `../CollectionService` does not exist.

- [ ] **Step 3: Implement anonymous-safe service**

Create `backend/src/services/CollectionService.js`:

```js
const { db } = require('../config/database');

const DAILY_LIMIT = 3;

function buildCollection(dish, status) {
  return {
    status,
    starId: `star-${dish.id}`,
    constellation: `${dish.dynasty || '未知'}风味星座`,
    litAt: new Date().toISOString(),
  };
}

class CollectionService {
  static async recordDailyRevival({ userId, dish, date = new Date().toISOString().slice(0, 10) }) {
    if (!userId) {
      return {
        draws: { usedToday: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, streakDays: 0 },
        collection: buildCollection(dish, 'preview'),
      };
    }

    const existingDraw = await db('daily_draws')
      .where({ user_id: userId, draw_date: date, draw_type: 'daily' })
      .first();
    const usedToday = existingDraw ? existingDraw.draw_count + 1 : 1;

    if (existingDraw) {
      await db('daily_draws').where({ id: existingDraw.id }).update({
        draw_count: usedToday,
        updated_at: new Date(),
      });
    } else {
      await db('daily_draws').insert({
        user_id: userId,
        draw_date: date,
        draw_type: 'daily',
        draw_count: usedToday,
      });
    }

    const existingCollection = await db('user_collections')
      .where({ user_id: userId, dish_id: dish.id })
      .first();
    const status = existingCollection ? 'duplicate' : 'lit';

    if (!existingCollection) {
      await db('user_collections').insert({
        user_id: userId,
        dish_id: dish.id,
        source: 'daily',
        rarity: dish.rarity || null,
        star_id: `star-${dish.id}`,
      });
    }

    return {
      draws: {
        usedToday,
        limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - usedToday),
        streakDays: 1,
      },
      collection: buildCollection(dish, status),
    };
  }
}

module.exports = CollectionService;
```

- [ ] **Step 4: Add migration**

Create `backend/src/migrations/002_light_mode_foundation.js`:

```js
exports.up = function up(knex) {
  return knex.schema
    .createTable('user_collections', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('dish_id').notNullable();
      table.string('source').notNullable();
      table.string('rarity').nullable();
      table.string('star_id').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'dish_id']);
    })
    .createTable('daily_draws', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('draw_date').notNullable();
      table.string('draw_type').notNullable();
      table.integer('draw_count').notNullable().defaultTo(1);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'draw_date', 'draw_type']);
    })
    .createTable('share_records', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('platform').notNullable();
      table.string('status').notNullable().defaultTo('prepared');
      table.json('card_payload').nullable();
      table.text('copy_text').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function down(knex) {
  return knex.schema
    .dropTableIfExists('share_records')
    .dropTableIfExists('daily_draws')
    .dropTableIfExists('user_collections');
};
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- CollectionService.test.js --runInBand
```

Expected: PASS.

---

### Task 5: Integrate Vision, Share Intents, And Draw State Into Light Mode

**Files:**
- Modify: `backend/src/services/LightModeService.js`
- Modify: `backend/src/controllers/lightModeController.js`
- Modify: `backend/src/routes/light.js`
- Test: `backend/src/services/__tests__/LightModeService.complete.test.js`
- Test: `backend/src/routes/__tests__/lightRoutes.test.js`

- [ ] **Step 1: Write failing service test**

Append to `backend/src/services/__tests__/LightModeService.complete.test.js`:

```js
test('ancestor recognition includes vision evidence and platform share intents', async () => {
  const result = await LightModeService.recognizeAncestor({
    description: 'steamed crab in orange shell',
    imageLabel: 'crab-orange.jpg',
    imageData: 'data:image/jpeg;base64,abc123',
  });

  expect(result.mode).toBe('ancestor');
  expect(result.vision.provider).toBe('fallback');
  expect(result.vision.dishCandidates[0].dishId).toBe('dish_001');
  expect(result.ancestor.id).toBe('dish_001');
  expect(result.shareCard.platformIntents.xiaohongshu.canAutoPublish).toBe(false);
  expect(result.shareCard.platformIntents.douyin.copyText).toContain(result.ancestor.name);
});

test('daily revival includes draw economy state', async () => {
  const result = await LightModeService.getDailyRevival({ date: '2026-06-30' });

  expect(result.draws).toMatchObject({ usedToday: 0, limit: 3, remaining: 3 });
  expect(result.collection.status).toBe('preview');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- LightModeService.complete.test.js --runInBand
```

Expected: FAIL because `vision`, `platformIntents`, and `draws` are not integrated.

- [ ] **Step 3: Modify `LightModeService` imports**

Add:

```js
const VisionService = require('./VisionService');
const CollectionService = require('./CollectionService');
const ShareIntentService = require('./ShareIntentService');
```

- [ ] **Step 4: Attach platform intents in `buildShareCard`**

Before returning the card object, assign it to `card` and attach intents:

```js
  const card = {
    type,
    title,
    subtitle,
    dishName: dish.name,
    dynasty: dish.dynasty,
    rarity,
    confidence,
    signature,
    certificateId,
    badges,
    shareText: `${title}｜${dish.dynasty}｜${rarity}｜${confidence}%可信复原｜${certificateId}`,
    footer: '风味考古局 · 让灭绝的中国味道重新复生',
  };

  return {
    ...card,
    platformIntents: ShareIntentService.buildPlatformIntents(card),
  };
```

- [ ] **Step 5: Update `recognizeAncestor`**

Change signature:

```js
  static async recognizeAncestor({ description = '', imageLabel = '', imageData = '', userId } = {}) {
```

Call vision first and choose the best candidate:

```js
    const vision = await VisionService.analyzeFoodImage({ imageData, imageLabel, description });
    const bestVisionCandidate = vision.dishCandidates?.[0];
```

Use `bestVisionCandidate?.dishId` before keyword fallback:

```js
    const matched = bestVisionCandidate
      ? ancestorMappings.find((mapping) => mapping.dishId === bestVisionCandidate.dishId)
      : ancestorMappings.find((mapping) => mapping.keywords.some((keyword) => clue.includes(keyword)));
    const finalMatch = matched || ancestorMappings[0];
```

Return `vision`, include `imageDataProvided`, and use `finalMatch`.

- [ ] **Step 6: Update `getDailyRevival`**

Change signature:

```js
  static async getDailyRevival({ date = new Date().toISOString().slice(0, 10), userId } = {}) {
```

After dish and confidence:

```js
    const economy = await CollectionService.recordDailyRevival({ userId, dish: { ...dish, rarity }, date });
```

Return `collection: economy.collection` and `draws: economy.draws`.

- [ ] **Step 7: Pass auth through controller and route**

In `backend/src/routes/light.js`, import optional auth:

```js
const { optionalAuth } = require('../middleware/auth');
```

Wrap all light routes:

```js
router.post('/ancestor', optionalAuth, lightModeController.recognizeAncestor);
router.get('/daily', optionalAuth, lightModeController.getDailyRevival);
router.get('/authenticity', optionalAuth, lightModeController.getAuthenticityRound);
router.post('/share-card', optionalAuth, lightModeController.createShareCard);
```

In `lightModeController`, pass `userId`:

```js
const result = await LightModeService.recognizeAncestor({
  ...(req.body || {}),
  userId: req.user?.id,
});
```

For daily:

```js
const result = await LightModeService.getDailyRevival({
  date: req.query.date,
  userId: req.user?.id,
});
```

For authenticity:

```js
const result = await LightModeService.getAuthenticityRound({
  seed: req.query.seed,
  dynasty: req.query.dynasty,
  difficulty: req.query.difficulty,
});
```

- [ ] **Step 8: Run tests**

Run:

```powershell
cd backend; npm test -- LightModeService.complete.test.js lightRoutes.test.js --runInBand
```

Expected: PASS.

---

### Task 6: Fragment Library API

**Files:**
- Create: `data/fragments/ancient_fragments.json`
- Create: `backend/src/services/FragmentService.js`
- Create: `backend/src/controllers/fragmentController.js`
- Create: `backend/src/routes/fragments.js`
- Modify: `backend/src/routes/index.js`
- Test: `backend/src/services/__tests__/FragmentService.test.js`
- Test: `backend/src/routes/__tests__/fragmentRoutes.test.js`

- [ ] **Step 1: Write failing service test**

Create `backend/src/services/__tests__/FragmentService.test.js`:

```js
const FragmentService = require('../FragmentService');

describe('FragmentService', () => {
  test('filters fragments by query, dynasty, source, and tag', () => {
    const results = FragmentService.listFragments({
      q: '蟹',
      dynasty: '宋代',
      source: '山家清供',
      tag: '橙',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({
      id: 'fragment_shanjiaqinggong_xieniangcheng',
      relatedDishId: 'dish_001',
    });
  });

  test('returns undefined for missing fragment detail', () => {
    expect(FragmentService.getFragmentById('missing')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- FragmentService.test.js --runInBand
```

Expected: FAIL because `../FragmentService` does not exist.

- [ ] **Step 3: Add fragment data**

Create `data/fragments/ancient_fragments.json` with at least 8 entries:

```json
[
  {
    "id": "fragment_shanjiaqinggong_xieniangcheng",
    "title": "蟹酿橙残句",
    "source": "山家清供",
    "dynasty": "宋代",
    "passage": "橙用黄熟大者，截顶去瓤，留少液。以蟹膏肉实其内，入甑，用酒、醋、水蒸熟。",
    "relatedDishId": "dish_001",
    "tags": ["蟹", "橙", "蒸"],
    "difficulty": "iron_sample"
  },
  {
    "id": "fragment_shanjiaqinggong_huaiyelengtao",
    "title": "槐叶冷淘线索",
    "source": "山家清供",
    "dynasty": "唐代",
    "passage": "采槐芽嫩叶，捣汁和面，作冷淘。",
    "relatedDishId": "dish_002",
    "tags": ["槐叶", "面", "冷食"],
    "difficulty": "easy"
  },
  {
    "id": "fragment_shanjiaqinggong_yusengeng",
    "title": "玉糁羹线索",
    "source": "山家清供",
    "dynasty": "宋代",
    "passage": "山芋作羹，色香如玉。",
    "relatedDishId": "dish_003",
    "tags": ["羹", "山芋", "素食"],
    "difficulty": "easy"
  },
  {
    "id": "fragment_suiyuan_babaodoufu",
    "title": "八宝豆腐线索",
    "source": "随园食单",
    "dynasty": "清代",
    "passage": "豆腐得味，全在配料清鲜。",
    "relatedDishId": "dish_004",
    "tags": ["豆腐", "清代", "官府菜"],
    "difficulty": "medium"
  },
  {
    "id": "fragment_qimin_vegetable_preserve",
    "title": "齐民要术蔬食线索",
    "source": "齐民要术",
    "dynasty": "北魏",
    "passage": "作菹藏菜，各随时月。",
    "relatedDishId": "dish_008",
    "tags": ["菹", "蔬菜", "保存"],
    "difficulty": "medium"
  },
  {
    "id": "fragment_yinshan_zhengyang",
    "title": "饮膳正要羊味线索",
    "source": "饮膳正要",
    "dynasty": "元代",
    "passage": "羊味宜温补，调以辛香。",
    "relatedDishId": "dish_006",
    "tags": ["羊", "温补", "辛香"],
    "difficulty": "medium"
  },
  {
    "id": "fragment_dongjing_fish",
    "title": "东京梦华录鱼肴线索",
    "source": "东京梦华录",
    "dynasty": "宋代",
    "passage": "市肆鱼鲜，随时供卖。",
    "relatedDishId": "dish_007",
    "tags": ["鱼", "市肆", "宋代"],
    "difficulty": "medium"
  },
  {
    "id": "fragment_suiyuan_soup",
    "title": "随园食单汤法线索",
    "source": "随园食单",
    "dynasty": "清代",
    "passage": "汤贵清，味贵真。",
    "relatedDishId": "dish_010",
    "tags": ["汤", "清味", "清代"],
    "difficulty": "easy"
  }
]
```

- [ ] **Step 4: Implement service and routes**

Create `backend/src/services/FragmentService.js`:

```js
const path = require('path');

const fragments = require(path.join(__dirname, '../../../data/fragments/ancient_fragments.json'));

function includes(value, query) {
  return String(value || '').toLowerCase().includes(String(query || '').toLowerCase());
}

class FragmentService {
  static listFragments({ q, dynasty, source, tag } = {}) {
    return fragments.filter((fragment) => {
      const queryMatch = !q || [fragment.title, fragment.passage, fragment.source, ...(fragment.tags || [])].some((value) => includes(value, q));
      const dynastyMatch = !dynasty || fragment.dynasty === dynasty;
      const sourceMatch = !source || fragment.source === source;
      const tagMatch = !tag || (fragment.tags || []).includes(tag);
      return queryMatch && dynastyMatch && sourceMatch && tagMatch;
    });
  }

  static getFragmentById(id) {
    return fragments.find((fragment) => fragment.id === id);
  }
}

module.exports = FragmentService;
```

Create `backend/src/controllers/fragmentController.js`:

```js
const FragmentService = require('../services/FragmentService');

const listFragments = (req, res) => {
  const data = FragmentService.listFragments(req.query || {});
  res.json({ success: true, data });
};

const getFragment = (req, res) => {
  const fragment = FragmentService.getFragmentById(req.params.id);
  if (!fragment) {
    return res.status(404).json({ success: false, message: '古籍碎片不存在' });
  }
  return res.json({ success: true, data: fragment });
};

module.exports = { listFragments, getFragment };
```

Create `backend/src/routes/fragments.js`:

```js
const express = require('express');
const fragmentController = require('../controllers/fragmentController');

const router = express.Router();

router.get('/', fragmentController.listFragments);
router.get('/:id', fragmentController.getFragment);

module.exports = router;
```

Modify `backend/src/routes/index.js`:

```js
const fragmentRoutes = require('./fragments');
```

and mount:

```js
router.use('/fragments', fragmentRoutes);
```

- [ ] **Step 5: Add route test**

Create `backend/src/routes/__tests__/fragmentRoutes.test.js`:

```js
const express = require('express');
const fragmentRoutes = require('../fragments');

function createServer() {
  const app = express();
  app.use('/api/fragments', fragmentRoutes);
  return app.listen(0);
}

describe('fragment routes', () => {
  let server;
  let baseUrl;

  beforeAll(() => {
    server = createServer();
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll((done) => server.close(done));

  test('GET /api/fragments filters fragment library', async () => {
    const response = await fetch(`${baseUrl}/api/fragments?q=${encodeURIComponent('蟹')}&tag=${encodeURIComponent('橙')}`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data[0].id).toBe('fragment_shanjiaqinggong_xieniangcheng');
  });

  test('GET /api/fragments/:id returns detail', async () => {
    const response = await fetch(`${baseUrl}/api/fragments/fragment_shanjiaqinggong_xieniangcheng`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.relatedDishId).toBe('dish_001');
  });
});
```

- [ ] **Step 6: Run tests**

Run:

```powershell
cd backend; npm test -- FragmentService.test.js fragmentRoutes.test.js --runInBand
```

Expected: PASS.

---

### Task 7: Frontend Auth Helpers And Panel

**Files:**
- Create: `frontend/src/lib/authStore.js`
- Create: `frontend/src/lib/apiClient.js`
- Create: `frontend/src/lib/__tests__/authStore.test.mjs`
- Create: `frontend/src/components/AuthPanel.jsx`
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: Write failing auth store test**

Create `frontend/src/lib/__tests__/authStore.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAuth,
  getAuthToken,
  getStoredUser,
  setAuthSession,
} from '../authStore.js';

global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
};

test('stores and clears auth token and user', () => {
  clearAuth();
  setAuthSession({ token: 'token-123', user: { id: 1, username: 'tester' } });

  assert.equal(getAuthToken(), 'token-123');
  assert.deepEqual(getStoredUser(), { id: 1, username: 'tester' });

  clearAuth();
  assert.equal(getAuthToken(), '');
  assert.equal(getStoredUser(), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd frontend; node --test src\lib\__tests__\authStore.test.mjs
```

Expected: FAIL because `authStore.js` does not exist.

- [ ] **Step 3: Implement auth store**

Create `frontend/src/lib/authStore.js`:

```js
const TOKEN_KEY = 'flavor_archaeology_token';
const USER_KEY = 'flavor_archaeology_user';

const storage = () => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
};

export function getAuthToken() {
  return storage()?.getItem(TOKEN_KEY) || '';
}

export function getStoredUser() {
  const raw = storage()?.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession({ token, user }) {
  if (!storage()) return;
  storage().setItem(TOKEN_KEY, token || '');
  storage().setItem(USER_KEY, JSON.stringify(user || null));
}

export function clearAuth() {
  if (!storage()) return;
  storage().removeItem(TOKEN_KEY);
  storage().removeItem(USER_KEY);
}
```

- [ ] **Step 4: Implement API client**

Create `frontend/src/lib/apiClient.js`:

```js
import { getAuthToken } from './authStore';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

export async function apiRequest(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message || '请求失败');
  }
  return payload;
}
```

- [ ] **Step 5: Implement `AuthPanel`**

Create `frontend/src/components/AuthPanel.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import { clearAuth, getStoredUser, setAuthSession } from '../lib/authStore';

const emptyForm = { username: '', email: '', password: '' };

const AuthPanel = () => {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [user, setUser] = useState(getStoredUser());
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiRequest('/auth/me')
      .then((payload) => {
        if (payload.success) setUser(payload.data.user);
      })
      .catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    const body = mode === 'register'
      ? form
      : { email: form.email, password: form.password };
    try {
      const payload = await apiRequest(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setAuthSession({ token: payload.data.token, user: payload.data.user });
      setUser(payload.data.user);
      setForm(emptyForm);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  if (user) {
    return (
      <div className="border border-ink/10 bg-paper px-4 py-3 text-sm">
        <p className="font-semibold text-ink">{user.username}</p>
        <button type="button" onClick={logout} className="text-cinnabar hover:text-rouge mt-1">
          退出登录
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-ink/10 bg-paper p-4 text-sm space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('login')} className={mode === 'login' ? 'text-cinnabar' : 'text-ink-gray'}>
          登录
        </button>
        <button type="button" onClick={() => setMode('register')} className={mode === 'register' ? 'text-cinnabar' : 'text-ink-gray'}>
          注册
        </button>
      </div>
      {mode === 'register' && (
        <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="用户名" className="w-full border border-ink/10 px-3 py-2" />
      )}
      <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="邮箱" className="w-full border border-ink/10 px-3 py-2" />
      <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="密码" className="w-full border border-ink/10 px-3 py-2" />
      {message && <p className="text-rouge">{message}</p>}
      <button type="submit" className="bg-cinnabar text-paper px-4 py-2">
        {mode === 'register' ? '创建考古官' : '进入风味局'}
      </button>
    </form>
  );
};

export default AuthPanel;
```

- [ ] **Step 6: Mount panel in Layout**

In `frontend/src/components/Layout.jsx`, import:

```js
import AuthPanel from './AuthPanel';
```

Place `<AuthPanel />` in the header or sidebar area with existing layout conventions.

- [ ] **Step 7: Run test**

Run:

```powershell
cd frontend; node --test src\lib\__tests__\authStore.test.mjs
```

Expected: PASS.

---

### Task 8: Frontend Light Mode Product Foundation UI

**Files:**
- Modify: `frontend/src/pages/LightMode.jsx`
- Test: browser smoke or focused source-level checks

- [ ] **Step 1: Replace raw fetches with `apiRequest`**

Import:

```js
import { apiRequest } from '../lib/apiClient';
```

Replace daily/quiz fetch calls with:

```js
apiRequest('/light/daily')
apiRequest(`/light/authenticity?seed=${Date.now()}`)
```

Replace ancestor submit with:

```js
const data = await apiRequest('/light/ancestor', {
  method: 'POST',
  body: JSON.stringify({ description, imageLabel, imageData }),
});
```

- [ ] **Step 2: Add image preview state**

Add state:

```js
const [imageData, setImageData] = useState('');
const [imagePreview, setImagePreview] = useState('');
```

Update `handleImageSelect`:

```js
const reader = new FileReader();
reader.onload = () => {
  const result = String(reader.result || '');
  setImageData(result);
  setImagePreview(result);
};
reader.readAsDataURL(file);
```

- [ ] **Step 3: Render image preview and vision evidence**

In the upload label or below it:

```jsx
{imagePreview && <img src={imagePreview} alt="待识别食物预览" className="mt-4 h-36 w-full object-cover border border-ink/10" />}
```

After ancestor result:

```jsx
{ancestor.vision && (
  <div className="bg-celadon/10 border border-celadon/20 p-4">
    <p className="text-celadon text-xs tracking-widest mb-2">VISION · 识图证据</p>
    <p className="text-sm text-ink-gray">Provider: {ancestor.vision.provider} · Confidence: {Math.round((ancestor.vision.confidence || 0) * 100)}%</p>
    <div className="flex flex-wrap gap-2 mt-3">
      {(ancestor.vision.labels || []).map((label) => <span key={label} className="px-2 py-1 bg-paper text-xs border border-ink/10">{label}</span>)}
    </div>
    <ul className="mt-3 text-sm text-ink-gray">
      {(ancestor.vision.evidence || []).map((item) => <li key={item}>{item}</li>)}
    </ul>
  </div>
)}
```

- [ ] **Step 4: Render draw economy**

In daily section:

```jsx
{daily.draws && (
  <p className="text-paper/60 text-sm mt-3">
    今日抽卡 {daily.draws.usedToday}/{daily.draws.limit} · 剩余 {daily.draws.remaining}
  </p>
)}
```

- [ ] **Step 5: Render platform share actions**

Inside `Certificate`, for `card.platformIntents`:

```jsx
{card.platformIntents && (
  <div className="mt-4 grid grid-cols-2 gap-2">
    {Object.entries(card.platformIntents).map(([platform, intent]) => (
      <button
        key={platform}
        type="button"
        onClick={() => navigator.clipboard?.writeText(intent.copyText)}
        className="border border-ink/20 py-2 text-xs text-ink hover:text-cinnabar"
      >
        复制{platform === 'xiaohongshu' ? '小红书' : '抖音'}文案
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 6: Run frontend lint/build**

Run:

```powershell
cd frontend; npm run lint
cd frontend; npm run build
```

Expected: both PASS.

---

### Task 9: Full Verification

**Files:**
- No new files unless fixing failures.

- [ ] **Step 1: Run backend full test suite**

Run:

```powershell
cd backend; npm test -- --runInBand
```

Expected: all suites pass.

- [ ] **Step 2: Run frontend tests, lint, build**

Run:

```powershell
cd frontend; node --test src\pages\__tests__\evolutionDishes.test.mjs
cd frontend; node --test src\lib\__tests__\authStore.test.mjs
cd frontend; npm run lint
cd frontend; npm run build
```

Expected: all pass.

- [ ] **Step 3: Run Python tests**

Run:

```powershell
C:\Users\hacjr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m unittest discover -v
```

Expected: all pass.

- [ ] **Step 4: Smoke API endpoints**

Run:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/health'
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/fragments?q=%E8%9F%B9'
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3001/api/light/authenticity?seed=7&difficulty=easy'
```

Expected:

- Health returns `status: ok`.
- Fragments returns at least the `蟹酿橙残句` fragment.
- Authenticity returns `difficulty: easy` and two options.

- [ ] **Step 5: Browser smoke for LightMode**

Using Edge/Playwright or in-app browser:

1. Open `http://127.0.0.1:5173/light`.
2. Register or log in.
3. Upload an image file.
4. Submit ancestor recognition.
5. Verify the page shows image preview, `VISION · 识图证据`, ancestor card, and platform share copy buttons.
6. Verify console errors are empty.

Expected: all visible checks pass.

---

## Self-Review

- Spec coverage: This plan covers VLM-compatible fallback, frontend auth, collection/draw economy, expanded quiz data, fragment APIs, platform share intents, and verification. It intentionally does not implement digital human/voice, AR, UGC public community, or true platform auto-publish because the approved phase 1 design excludes them.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: Service names and payload keys are consistent across tasks: `VisionService.analyzeFoodImage`, `CollectionService.recordDailyRevival`, `ShareIntentService.buildPlatformIntents`, `FragmentService.listFragments`, `vision`, `draws`, `platformIntents`.

