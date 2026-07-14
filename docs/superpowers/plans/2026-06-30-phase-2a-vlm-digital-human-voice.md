# Phase 2A VLM Digital Human Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real configurable VLM adapter path, role-based digital-human narration, and playable browser voice controls to the light-mode photo ancestor flow.

**Architecture:** Keep `VisionService` as the public image-analysis boundary and move provider-specific logic into `backend/src/services/vision/`. Add focused backend services for candidate mapping, digital-human narration, and voice cue generation, then render those fields in `LightMode` through a small browser speech helper.

**Tech Stack:** Node.js, Express, Jest, native `fetch`, React 19, Vite, browser `speechSynthesis`, existing JSON knowledge graph data.

---

## File Structure

Backend files:

- Create `backend/src/services/vision/VisionCandidateMapper.js`: maps external VLM candidates to known dish IDs.
- Create `backend/src/services/vision/OpenAIVisionProvider.js`: calls OpenAI-compatible Responses API with strict JSON output when configured.
- Create `backend/src/services/DigitalHumanService.js`: builds role-based narration for ancestor results.
- Create `backend/src/services/VoiceService.js`: builds browser-TTS voice cue objects.
- Modify `backend/src/services/VisionService.js`: accept injected providers, try external provider first, normalize mapped candidates, then fallback.
- Modify `backend/src/services/LightModeService.js`: add `digitalHuman` and `voice` to ancestor results.
- Add or modify Jest tests under `backend/src/services/__tests__/`.

Frontend files:

- Create `frontend/src/lib/speechNarration.js`: browser TTS helper for play/stop/support checks.
- Modify `frontend/src/pages/LightMode.jsx`: digital-human card, provider status, voice controls.
- Modify `frontend/src/pages/__tests__/lightModeFoundation.test.mjs`: source-level checks for narration and voice controls.

Verification:

- Backend full Jest suite.
- Frontend Node tests, lint, and build.
- Python unittest suite.
- Browser smoke on `/light`.

---

### Task 1: Vision Candidate Mapper

**Files:**
- Create: `backend/src/services/vision/VisionCandidateMapper.js`
- Test: `backend/src/services/__tests__/VisionCandidateMapper.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/__tests__/VisionCandidateMapper.test.js`:

```js
const VisionCandidateMapper = require('../vision/VisionCandidateMapper');

describe('VisionCandidateMapper', () => {
  test('maps provider candidates by dish id and Chinese dish name', () => {
    const mapped = VisionCandidateMapper.mapCandidates([
      { dishId: 'dish_001', name: 'orange crab', confidence: 0.9, reason: 'id supplied' },
      { name: '蟹酿橙', confidence: 0.88, reason: 'name supplied' },
    ]);

    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
      confidence: 0.9,
      reason: 'id supplied',
    });
    expect(mapped[1]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
      confidence: 0.88,
      reason: 'name supplied',
    });
  });

  test('maps provider candidates by keyword when id and exact name are absent', () => {
    const mapped = VisionCandidateMapper.mapCandidates([
      { name: 'steamed orange shell with crab', confidence: 0.77, reason: 'visual text' },
    ]);

    expect(mapped[0]).toMatchObject({
      dishId: 'dish_001',
      name: '蟹酿橙',
      confidence: 0.77,
    });
  });

  test('keeps unmapped candidates out of selectable dish candidates', () => {
    const mapped = VisionCandidateMapper.mapCandidates([
      { name: 'unknown fantasy dish', confidence: 0.8, reason: 'no local match' },
    ]);

    expect(mapped).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- VisionCandidateMapper.test.js --runInBand
```

Expected: FAIL because `../vision/VisionCandidateMapper` does not exist.

- [ ] **Step 3: Implement mapper**

Create `backend/src/services/vision/VisionCandidateMapper.js`:

```js
const path = require('path');

const dishes = require(path.join(__dirname, '../../../../data/knowledge_graph/nodes_dish.json'));

const keywordRules = [
  { dishId: 'dish_001', keywords: ['crab', 'orange', 'steamed', '蟹', '橙', '蒸'] },
  { dishId: 'dish_002', keywords: ['noodle', 'cold noodle', 'leaf', '槐叶', '冷淘', '面'] },
  { dishId: 'dish_003', keywords: ['radish', 'rice', 'porridge', '萝卜', '粥', '羹'] },
  { dishId: 'dish_004', keywords: ['tofu', 'mushroom', '豆腐', '蘑菇', '菌'] },
  { dishId: 'dish_006', keywords: ['lamb', 'roast', 'meat', '羊', '烤肉', '肉'] },
  { dishId: 'dish_007', keywords: ['fish', '鱼', '鲜鱼'] },
];

function normalize(value = '') {
  return String(value).trim().toLowerCase();
}

function getDishById(id) {
  return dishes.find((dish) => dish.id === id);
}

function findDishForCandidate(candidate = {}) {
  if (candidate.dishId) {
    const byId = getDishById(candidate.dishId);
    if (byId) return byId;
  }

  const normalizedName = normalize(candidate.name);
  const byName = dishes.find((dish) => normalize(dish.name) === normalizedName);
  if (byName) return byName;

  const searchable = normalize([
    candidate.name,
    candidate.reason,
    ...(candidate.labels || []),
    ...(candidate.ingredients || []),
  ].join(' '));
  const rule = keywordRules.find((item) =>
    item.keywords.some((keyword) => searchable.includes(normalize(keyword)))
  );

  return rule ? getDishById(rule.dishId) : undefined;
}

class VisionCandidateMapper {
  static mapCandidates(candidates = []) {
    return candidates
      .map((candidate) => {
        const dish = findDishForCandidate(candidate);
        if (!dish) return null;
        return {
          dishId: dish.id,
          name: dish.name,
          confidence: Number(candidate.confidence) || 0.5,
          reason: candidate.reason || `Mapped provider candidate to ${dish.name}.`,
        };
      })
      .filter(Boolean);
  }
}

module.exports = VisionCandidateMapper;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- VisionCandidateMapper.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit or record git unavailability**

Run:

```powershell
git status --short
```

If git works:

```powershell
git add backend/src/services/vision/VisionCandidateMapper.js backend/src/services/__tests__/VisionCandidateMapper.test.js
git commit -m "feat: map vision candidates to dish ids"
```

If git reports `fatal: not a git repository`, record that in final notes and continue.

---

### Task 2: OpenAI-Compatible Vision Provider

**Files:**
- Create: `backend/src/services/vision/OpenAIVisionProvider.js`
- Test: `backend/src/services/__tests__/OpenAIVisionProvider.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/__tests__/OpenAIVisionProvider.test.js`:

```js
const OpenAIVisionProvider = require('../vision/OpenAIVisionProvider');

describe('OpenAIVisionProvider', () => {
  test('reports unavailable when no API key is configured', () => {
    const provider = new OpenAIVisionProvider({ apiKey: '' });

    expect(provider.isConfigured()).toBe(false);
  });

  test('calls the OpenAI responses endpoint and parses strict JSON content', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'req_123' },
      json: async () => ({
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  labels: ['crab', 'orange'],
                  ingredients: ['crab', 'orange'],
                  dishCandidates: [
                    { name: '蟹酿橙', confidence: 0.91, reason: 'crab and orange cues' },
                  ],
                  confidence: 0.91,
                  evidence: ['Detected crab.', 'Detected orange.'],
                }),
              },
            ],
          },
        ],
      }),
    });
    const provider = new OpenAIVisionProvider({
      apiKey: 'test-key',
      model: 'gpt-4.1-mini',
      fetchImpl: fetchMock,
    });

    const result = await provider.analyze({
      imageData: 'data:image/jpeg;base64,abc123',
      imageLabel: 'crab-orange.jpg',
      description: 'served in an orange shell',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toMatchObject({
      provider: 'external',
      model: 'gpt-4.1-mini',
      labels: ['crab', 'orange'],
      ingredients: ['crab', 'orange'],
      confidence: 0.91,
    });
    expect(result.dishCandidates[0].name).toBe('蟹酿橙');
    expect(result.rawProvider.requestId).toBe('req_123');
  });

  test('returns a fallback request when provider JSON is malformed', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      json: async () => ({
        output: [{ content: [{ type: 'output_text', text: 'not-json' }] }],
      }),
    });
    const provider = new OpenAIVisionProvider({ apiKey: 'test-key', fetchImpl: fetchMock });

    await expect(provider.analyze({
      imageData: 'data:image/jpeg;base64,abc123',
    })).rejects.toThrow('External VLM returned malformed JSON.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- OpenAIVisionProvider.test.js --runInBand
```

Expected: FAIL because `../vision/OpenAIVisionProvider` does not exist.

- [ ] **Step 3: Implement provider**

Create `backend/src/services/vision/OpenAIVisionProvider.js`:

```js
const DEFAULT_MODEL = 'gpt-4.1-mini';

function extractText(payload = {}) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === 'string') return part.text;
    }
  }
  return '';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

class OpenAIVisionProvider {
  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_VISION_MODEL || DEFAULT_MODEL,
    fetchImpl = global.fetch,
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl;
  }

  isConfigured() {
    return Boolean(this.apiKey && this.fetchImpl);
  }

  buildPrompt({ imageLabel = '', description = '' } = {}) {
    return [
      'You are a Chinese culinary archaeology vision model.',
      'Analyze the food image and return strict JSON only.',
      'JSON keys: labels, ingredients, dishCandidates, confidence, evidence.',
      'dishCandidates items must include name, optional dishId, confidence, reason.',
      `Image label: ${imageLabel}`,
      `User description: ${description}`,
    ].join('\n');
  }

  async analyze({ imageData = '', imageLabel = '', description = '' } = {}) {
    if (!this.isConfigured()) {
      throw new Error('External VLM provider is not configured.');
    }
    if (!imageData || !String(imageData).startsWith('data:image/')) {
      throw new Error('External VLM requires an image data URL.');
    }

    const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: this.buildPrompt({ imageLabel, description }) },
              { type: 'input_image', image_url: imageData },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`External VLM request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    const text = extractText(payload);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('External VLM returned malformed JSON.');
    }

    return {
      provider: 'external',
      model: this.model,
      labels: normalizeArray(parsed.labels),
      ingredients: normalizeArray(parsed.ingredients),
      dishCandidates: normalizeArray(parsed.dishCandidates),
      confidence: Number(parsed.confidence) || 0.5,
      evidence: normalizeArray(parsed.evidence),
      rawProvider: {
        requestId: response.headers?.get?.('x-request-id') || null,
      },
    };
  }
}

module.exports = OpenAIVisionProvider;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- OpenAIVisionProvider.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit or record git unavailability**

Run `git status --short`; commit if available:

```powershell
git add backend/src/services/vision/OpenAIVisionProvider.js backend/src/services/__tests__/OpenAIVisionProvider.test.js
git commit -m "feat: add openai vision provider"
```

---

### Task 3: Vision Service External Provider Orchestration

**Files:**
- Modify: `backend/src/services/VisionService.js`
- Modify: `backend/src/services/__tests__/VisionService.test.js`

- [ ] **Step 1: Add failing tests for provider injection and fallback**

Append to `backend/src/services/__tests__/VisionService.test.js`:

```js
test('uses configured external provider and maps candidates to known dishes', async () => {
  const provider = {
    isConfigured: () => true,
    analyze: jest.fn().mockResolvedValue({
      provider: 'external',
      model: 'test-vlm',
      labels: ['crab', 'orange'],
      ingredients: ['crab', 'orange'],
      dishCandidates: [{ name: '蟹酿橙', confidence: 0.91, reason: 'visual match' }],
      confidence: 0.91,
      evidence: ['external evidence'],
    }),
  };

  const result = await VisionService.analyzeFoodImage({
    imageData: 'data:image/jpeg;base64,abc123',
    imageLabel: 'photo.jpg',
    description: '',
    provider,
  });

  expect(provider.analyze).toHaveBeenCalled();
  expect(result.provider).toBe('external');
  expect(result.model).toBe('test-vlm');
  expect(result.dishCandidates[0]).toMatchObject({
    dishId: 'dish_001',
    name: '蟹酿橙',
    confidence: 0.91,
  });
});

test('falls back with evidence when external provider fails', async () => {
  const provider = {
    isConfigured: () => true,
    analyze: jest.fn().mockRejectedValue(new Error('network down')),
  };

  const result = await VisionService.analyzeFoodImage({
    imageData: 'data:image/jpeg;base64,abc123',
    imageLabel: 'crab-orange-steamed.jpg',
    description: 'A steamed crab dish served inside an orange shell.',
    provider,
  });

  expect(result.provider).toBe('fallback');
  expect(result.evidence).toEqual(expect.arrayContaining([
    'External VLM unavailable; fallback used. network down',
  ]));
  expect(result.dishCandidates[0].dishId).toBe('dish_001');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- VisionService.test.js --runInBand
```

Expected: FAIL because `VisionService.analyzeFoodImage` ignores injected providers.

- [ ] **Step 3: Update `VisionService`**

Replace `backend/src/services/VisionService.js` with:

```js
const path = require('path');
const OpenAIVisionProvider = require('./vision/OpenAIVisionProvider');
const VisionCandidateMapper = require('./vision/VisionCandidateMapper');

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
    keywords: ['tofu', 'mushroom', '豆腐', '蘑菇', '菌'],
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

function getDishById(id) {
  return dishes.find((item) => item.id === id);
}

function buildFallback({ imageData = '', imageLabel = '', description = '', extraEvidence = [] } = {}) {
  const clue = normalize(`${imageLabel} ${description}`);
  const hasImagePayload = Boolean(imageData && String(imageData).startsWith('data:image/'));

  if (!clue.trim() && !hasImagePayload) {
    return {
      provider: 'fallback',
      labels: [],
      ingredients: [],
      dishCandidates: [],
      confidence: 0.2,
      evidence: [...extraEvidence, 'No usable visual or text clues were provided.'],
    };
  }

  const matches = cueRules
    .map((rule) => {
      const matchedKeywords = rule.keywords.filter((keyword) => clue.includes(normalize(keyword)));
      if (matchedKeywords.length === 0) return null;
      const dish = getDishById(rule.dishId);
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
      evidence: [
        ...extraEvidence,
        hasImagePayload
          ? 'Image payload was provided, but fallback rules found no confident food ancestry match.'
          : 'Text was provided, but fallback rules found no confident food ancestry match.',
      ],
    };
  }

  return {
    provider: 'fallback',
    labels: unique(matches.flatMap((match) => match.rule.labels)),
    ingredients: unique(matches.flatMap((match) => match.rule.ingredients)),
    dishCandidates: matches.map((match) => match.candidate),
    confidence: matches[0].candidate.confidence,
    evidence: [
      ...extraEvidence,
      ...matches.flatMap((match) => match.matchedKeywords.map((keyword) => `Matched cue: ${keyword}`)),
    ],
  };
}

class VisionService {
  static async analyzeFoodImage({
    imageData = '',
    imageLabel = '',
    description = '',
    provider = new OpenAIVisionProvider(),
  } = {}) {
    if (provider?.isConfigured?.()) {
      try {
        const external = await provider.analyze({ imageData, imageLabel, description });
        const mappedCandidates = VisionCandidateMapper.mapCandidates(external.dishCandidates || []);
        return {
          ...external,
          dishCandidates: mappedCandidates,
          evidence: external.evidence || [],
        };
      } catch (error) {
        return buildFallback({
          imageData,
          imageLabel,
          description,
          extraEvidence: [`External VLM unavailable; fallback used. ${error.message}`],
        });
      }
    }

    return buildFallback({ imageData, imageLabel, description });
  }
}

module.exports = VisionService;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- VisionService.test.js VisionCandidateMapper.test.js OpenAIVisionProvider.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit or record git unavailability**

Run `git status --short`; commit if available:

```powershell
git add backend/src/services/VisionService.js backend/src/services/__tests__/VisionService.test.js
git commit -m "feat: orchestrate external vision provider"
```

---

### Task 4: Digital Human Service

**Files:**
- Create: `backend/src/services/DigitalHumanService.js`
- Test: `backend/src/services/__tests__/DigitalHumanService.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/__tests__/DigitalHumanService.test.js`:

```js
const DigitalHumanService = require('../DigitalHumanService');

describe('DigitalHumanService', () => {
  test('builds a role-based ancestor narration from vision and dish evidence', () => {
    const narration = DigitalHumanService.buildAncestorNarration({
      ancestorResult: {
        ancestor: {
          name: '蟹酿橙',
          dynasty: '宋代',
          source_text: '山家清供',
          description: '南宋名菜，将蟹肉填入橙壳中蒸制。',
        },
        rarity: '灭绝',
        confidence: 91,
        vision: {
          provider: 'external',
          labels: ['crab', 'orange', 'steamed dish'],
          evidence: ['Detected crab.', 'Detected orange.'],
        },
      },
    });

    expect(narration.speaker).toMatchObject({
      id: 'taotie-curator',
      name: '饕餮考古官',
      role: '风味证据讲解员',
    });
    expect(narration.emotion).toBe('curious');
    expect(narration.headline).toContain('蟹酿橙');
    expect(narration.script).toContain('山家清供');
    expect(narration.evidenceBullets).toEqual(expect.arrayContaining([
      expect.stringContaining('crab'),
      expect.stringContaining('91%'),
    ]));
    expect(narration.shareLine).toContain('蟹酿橙');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- DigitalHumanService.test.js --runInBand
```

Expected: FAIL because `../DigitalHumanService` does not exist.

- [ ] **Step 3: Implement service**

Create `backend/src/services/DigitalHumanService.js`:

```js
function compact(values) {
  return values.filter(Boolean);
}

class DigitalHumanService {
  static buildAncestorNarration({ ancestorResult = {}, fragments = [] } = {}) {
    const dish = ancestorResult.ancestor || {};
    const vision = ancestorResult.vision || {};
    const labels = (vision.labels || []).slice(0, 4);
    const source = dish.source_text || fragments[0]?.source || '风味知识库';
    const confidence = ancestorResult.confidence || Math.round((vision.confidence || 0) * 100) || 70;
    const providerLine = vision.provider === 'external'
      ? '这次我优先读取了真实视觉模型的识别线索'
      : '这次我使用本地兜底识别先做判断';

    return {
      speaker: {
        id: 'taotie-curator',
        name: '饕餮考古官',
        role: '风味证据讲解员',
        avatarTone: 'bronze-mask-curator',
      },
      emotion: 'curious',
      headline: `这口风味，很像${dish.dynasty || '古代'}的《${dish.name || '未知菜'}》。`,
      script: `${providerLine}。我看到${labels.length ? labels.join('、') : '食物外观'}这些线索，再对照《${source}》与${dish.description || '已知风味档案'}，所以把它归到${dish.name || '这道古菜'}一脉。`,
      evidenceBullets: compact([
        labels.length ? `视觉线索：${labels.join('、')}` : '视觉线索：暂无高置信标签',
        `古籍线索：${source}`,
        `可信度：${confidence}%`,
      ]),
      shareLine: `我的这一口被饕餮考古官认成了${dish.dynasty || '古代'}${dish.name || '风味古菜'}。`,
    };
  }
}

module.exports = DigitalHumanService;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- DigitalHumanService.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit or record git unavailability**

Run `git status --short`; commit if available:

```powershell
git add backend/src/services/DigitalHumanService.js backend/src/services/__tests__/DigitalHumanService.test.js
git commit -m "feat: add digital human narration"
```

---

### Task 5: Voice Service

**Files:**
- Create: `backend/src/services/VoiceService.js`
- Test: `backend/src/services/__tests__/VoiceService.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/src/services/__tests__/VoiceService.test.js`:

```js
const VoiceService = require('../VoiceService');

describe('VoiceService', () => {
  test('builds a browser TTS cue for narration text', () => {
    const cue = VoiceService.buildVoiceCue({
      script: '我看见了蟹与橙的线索。',
      speaker: { id: 'taotie-curator', name: '饕餮考古官' },
      emotion: 'curious',
    });

    expect(cue).toEqual({
      mode: 'browser-tts',
      language: 'zh-CN',
      voiceName: 'zh-CN',
      rate: 0.95,
      pitch: 1.05,
      text: '我看见了蟹与橙的线索。',
      audioUrl: null,
      speakerId: 'taotie-curator',
      emotion: 'curious',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- VoiceService.test.js --runInBand
```

Expected: FAIL because `../VoiceService` does not exist.

- [ ] **Step 3: Implement service**

Create `backend/src/services/VoiceService.js`:

```js
class VoiceService {
  static buildVoiceCue({ script = '', speaker = {}, emotion = 'curious' } = {}) {
    return {
      mode: 'browser-tts',
      language: 'zh-CN',
      voiceName: 'zh-CN',
      rate: 0.95,
      pitch: 1.05,
      text: script,
      audioUrl: null,
      speakerId: speaker.id || 'taotie-curator',
      emotion,
    };
  }
}

module.exports = VoiceService;
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd backend; npm test -- VoiceService.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit or record git unavailability**

Run `git status --short`; commit if available:

```powershell
git add backend/src/services/VoiceService.js backend/src/services/__tests__/VoiceService.test.js
git commit -m "feat: add voice narration cue service"
```

---

### Task 6: Integrate Digital Human And Voice Into Light Mode

**Files:**
- Modify: `backend/src/services/LightModeService.js`
- Modify: `backend/src/services/__tests__/LightModeService.complete.test.js`

- [ ] **Step 1: Add failing integration test**

Append to `backend/src/services/__tests__/LightModeService.complete.test.js`:

```js
test('ancestor recognition includes digital human narration and voice cue', async () => {
  const result = await LightModeService.recognizeAncestor({
    description: '午饭是一碗蟹粉拌面，带一点橙香。',
    imageLabel: 'crab-orange.jpg',
    imageData: 'data:image/jpeg;base64,abc123',
  });

  expect(result.digitalHuman).toMatchObject({
    speaker: {
      id: 'taotie-curator',
      name: '饕餮考古官',
    },
    emotion: 'curious',
  });
  expect(result.digitalHuman.script).toContain(result.ancestor.name);
  expect(result.digitalHuman.evidenceBullets.length).toBeGreaterThan(1);
  expect(result.voice).toMatchObject({
    mode: 'browser-tts',
    language: 'zh-CN',
    text: result.digitalHuman.script,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd backend; npm test -- LightModeService.complete.test.js --runInBand
```

Expected: FAIL because `digitalHuman` and `voice` are not returned.

- [ ] **Step 3: Update `LightModeService` imports**

In `backend/src/services/LightModeService.js`, add imports near the existing service imports:

```js
const DigitalHumanService = require('./DigitalHumanService');
const VoiceService = require('./VoiceService');
```

- [ ] **Step 4: Build narration inside `recognizeAncestor`**

Inside `recognizeAncestor`, after `confidence` is computed and before `return`, add:

```js
    const baseAncestorResult = {
      ancestor,
      rarity,
      confidence,
      vision,
    };
    const digitalHuman = DigitalHumanService.buildAncestorNarration({
      ancestorResult: baseAncestorResult,
    });
    const voice = VoiceService.buildVoiceCue({
      script: digitalHuman.script,
      speaker: digitalHuman.speaker,
      emotion: digitalHuman.emotion,
    });
```

Then add these fields to the returned object:

```js
      digitalHuman,
      voice,
```

- [ ] **Step 5: Run integration tests**

Run:

```powershell
cd backend; npm test -- LightModeService.complete.test.js VisionService.test.js DigitalHumanService.test.js VoiceService.test.js --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit or record git unavailability**

Run `git status --short`; commit if available:

```powershell
git add backend/src/services/LightModeService.js backend/src/services/__tests__/LightModeService.complete.test.js
git commit -m "feat: add narration and voice to ancestor flow"
```

---

### Task 7: Frontend Speech Narration Helper

**Files:**
- Create: `frontend/src/lib/speechNarration.js`
- Test: `frontend/src/lib/__tests__/speechNarration.test.mjs`

- [ ] **Step 1: Write failing test**

Create `frontend/src/lib/__tests__/speechNarration.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUseSpeechNarration,
  playSpeechNarration,
  stopSpeechNarration,
} from '../speechNarration.js';

test('reports unsupported when speech synthesis is absent', () => {
  delete global.window;

  assert.equal(canUseSpeechNarration(), false);
});

test('plays and stops browser speech narration when supported', () => {
  const spoken = [];
  const cancelled = [];
  global.window = {
    SpeechSynthesisUtterance: class SpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      speak(utterance) {
        spoken.push(utterance);
      },
      cancel() {
        cancelled.push(true);
      },
    },
  };

  assert.equal(canUseSpeechNarration(), true);
  playSpeechNarration({
    text: '我看见了蟹与橙。',
    language: 'zh-CN',
    rate: 0.95,
    pitch: 1.05,
  });
  stopSpeechNarration();

  assert.equal(spoken[0].text, '我看见了蟹与橙。');
  assert.equal(spoken[0].lang, 'zh-CN');
  assert.equal(spoken[0].rate, 0.95);
  assert.equal(spoken[0].pitch, 1.05);
  assert.equal(cancelled.length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd frontend; node --test src\lib\__tests__\speechNarration.test.mjs
```

Expected: FAIL because `speechNarration.js` does not exist.

- [ ] **Step 3: Implement helper**

Create `frontend/src/lib/speechNarration.js`:

```js
export function canUseSpeechNarration() {
  return Boolean(
    typeof window !== 'undefined' &&
    window.speechSynthesis &&
    window.SpeechSynthesisUtterance
  );
}

export function stopSpeechNarration() {
  if (!canUseSpeechNarration()) return;
  window.speechSynthesis.cancel();
}

export function playSpeechNarration({
  text = '',
  language = 'zh-CN',
  rate = 0.95,
  pitch = 1.05,
} = {}) {
  if (!canUseSpeechNarration() || !text) return false;
  stopSpeechNarration();
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = rate;
  utterance.pitch = pitch;
  window.speechSynthesis.speak(utterance);
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
cd frontend; node --test src\lib\__tests__\speechNarration.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit or record git unavailability**

Run `git status --short`; commit if available:

```powershell
git add frontend/src/lib/speechNarration.js frontend/src/lib/__tests__/speechNarration.test.mjs
git commit -m "feat: add browser speech narration helper"
```

---

### Task 8: Frontend Light Mode Digital Human UI

**Files:**
- Modify: `frontend/src/pages/LightMode.jsx`
- Modify: `frontend/src/pages/__tests__/lightModeFoundation.test.mjs`

- [ ] **Step 1: Add failing source-level checks**

Append to `frontend/src/pages/__tests__/lightModeFoundation.test.mjs`:

```js
test('light mode renders digital human narration and voice controls', () => {
  assert.match(lightModeSource, /digitalHuman/);
  assert.match(lightModeSource, /playSpeechNarration/);
  assert.match(lightModeSource, /stopSpeechNarration/);
  assert.match(lightModeSource, /canUseSpeechNarration/);
  assert.match(lightModeSource, /VOICE/);
  assert.match(lightModeSource, /Provider Status/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd frontend; node --test src\pages\__tests__\lightModeFoundation.test.mjs
```

Expected: FAIL because `LightMode.jsx` does not import or render speech narration.

- [ ] **Step 3: Import speech helper**

In `frontend/src/pages/LightMode.jsx`, add:

```js
import {
  canUseSpeechNarration,
  playSpeechNarration,
  stopSpeechNarration,
} from '../lib/speechNarration';
```

- [ ] **Step 4: Add digital-human panel component**

Add this component above `LightMode`:

```jsx
const DigitalHumanPanel = ({ digitalHuman, voice }) => {
  if (!digitalHuman) return null;
  const speechSupported = canUseSpeechNarration();
  const providerText = voice?.mode === 'external-audio' ? '外部语音' : '浏览器语音';

  return (
    <div className="mt-5 border border-tea-gold/30 bg-paper-warm/70 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-tea-gold">DIGITAL HUMAN · 风味讲解员</p>
          <h4 className="mt-2 text-xl font-bold text-ink">{digitalHuman.speaker.name}</h4>
          <p className="text-sm text-smoke">{digitalHuman.speaker.role}</p>
        </div>
        <div className="h-14 w-14 shrink-0 border border-cinnabar/30 bg-cinnabar text-paper flex items-center justify-center text-xs font-bold leading-tight">
          饕餮<br />讲解
        </div>
      </div>
      <p className="mb-3 text-lg font-semibold text-ink">{digitalHuman.headline}</p>
      <p className="text-sm leading-relaxed text-ink-gray">{digitalHuman.script}</p>
      <ul className="mt-4 space-y-2 text-sm text-ink-gray">
        {(digitalHuman.evidenceBullets || []).map((item) => (
          <li key={item} className="border-l-2 border-celadon/50 pl-3">{item}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-xs tracking-[0.25em] text-smoke">VOICE · {providerText}</span>
        <button
          type="button"
          disabled={!speechSupported || !voice?.text}
          onClick={() => playSpeechNarration(voice)}
          className="border border-ink/20 px-4 py-2 text-xs text-ink transition-colors hover:border-cinnabar hover:text-cinnabar disabled:opacity-40"
        >
          播放讲解
        </button>
        <button
          type="button"
          onClick={stopSpeechNarration}
          className="border border-ink/20 px-4 py-2 text-xs text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
        >
          停止
        </button>
      </div>
      {!speechSupported && (
        <p className="mt-2 text-xs text-smoke">当前浏览器不支持语音合成，仍可阅读文字讲解。</p>
      )}
    </div>
  );
};
```

- [ ] **Step 5: Add provider status in the vision panel**

Inside the existing `{ancestor.vision && (...)}` panel, add this line after the `Provider:` paragraph:

```jsx
                      <p className="mt-1 text-xs text-smoke">
                        Provider Status: {ancestor.vision.provider === 'external' ? 'external VLM' : 'fallback evidence'}
                        {ancestor.vision.provider !== 'external' ? ' · 当前使用本地兜底识别；配置 VLM key 后会优先走真实视觉模型。' : ''}
                      </p>
```

- [ ] **Step 6: Render digital-human panel**

Inside the ancestor result card, after the vision panel, add:

```jsx
                  <DigitalHumanPanel digitalHuman={ancestor.digitalHuman} voice={ancestor.voice} />
```

- [ ] **Step 7: Run frontend source tests**

Run:

```powershell
cd frontend; node --test src\pages\__tests__\lightModeFoundation.test.mjs src\lib\__tests__\speechNarration.test.mjs
```

Expected: PASS.

- [ ] **Step 8: Commit or record git unavailability**

Run `git status --short`; commit if available:

```powershell
git add frontend/src/pages/LightMode.jsx frontend/src/pages/__tests__/lightModeFoundation.test.mjs
git commit -m "feat: show digital human voice controls"
```

---

### Task 9: Full Verification

**Files:**
- No new files unless fixing failures.

- [ ] **Step 1: Run backend full test suite**

Run:

```powershell
cd backend; npm test -- --runInBand
```

Expected: all Jest suites pass.

- [ ] **Step 2: Run frontend tests**

Run:

```powershell
cd frontend; node --test src\pages\__tests__\evolutionDishes.test.mjs
cd frontend; node --test src\pages\__tests__\lightModeFoundation.test.mjs src\lib\__tests__\authStore.test.mjs src\lib\__tests__\speechNarration.test.mjs
```

Expected: all Node tests pass.

- [ ] **Step 3: Run frontend lint and build**

Run:

```powershell
cd frontend; npm run lint
cd frontend; npm run build
```

Expected: both pass.

- [ ] **Step 4: Run Python tests**

Run:

```powershell
C:\Users\hacjr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m unittest discover -v
```

Expected: all Python tests pass.

- [ ] **Step 5: Smoke current-code API**

If an old backend is still running on port 3001, start the current code on 3101:

```powershell
$env:PORT='3101'; $env:NODE_ENV='development'; Start-Process -FilePath 'node' -ArgumentList 'src/app.js' -WorkingDirectory 'C:\Users\hacjr\Desktop\风味考古局\backend' -WindowStyle Hidden
```

Then run:

```powershell
$body = @{ description='A steamed crab dish served inside an orange shell.'; imageLabel='crab-orange.jpg'; imageData='data:image/jpeg;base64,abc123' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:3101/api/light/ancestor' -Method Post -ContentType 'application/json' -Body $body
```

Expected response includes:

- `data.vision.provider`
- `data.digitalHuman.speaker.name`
- `data.voice.mode`
- `data.shareCard.platformIntents`

- [ ] **Step 6: Browser smoke**

Use the in-app browser or another local browser:

1. Open `http://127.0.0.1:5174/light` with `VITE_API_BASE=http://127.0.0.1:3101/api`.
2. Submit the default ancestor description.
3. Confirm the page shows `VISION · 识图证据`.
4. Confirm the page shows `DIGITAL HUMAN · 风味讲解员`.
5. Confirm the page shows `VOICE`.
6. Click `播放讲解`, then `停止`.
7. Confirm console errors are empty.

Expected: all visible checks pass.

---

## Self-Review

- Spec coverage: Tasks cover external VLM adapter, candidate normalization, fallback preservation, digital-human narration, browser voice cue, backend integration, frontend speech helper, frontend UI, and full verification.
- Placeholder scan: This plan contains no TBD or TODO markers.
- Type consistency: Service names and payload keys are consistent across tasks: `VisionCandidateMapper.mapCandidates`, `OpenAIVisionProvider.analyze`, `DigitalHumanService.buildAncestorNarration`, `VoiceService.buildVoiceCue`, `digitalHuman`, `voice`, and `provider`.
- Scope note: Phase 2A still leaves AR kitchen, UGC community, full draw economy, true platform auto-publish, and production-scale content expansion for later phases of the original goal.
