# Phase 2A VLM Digital Human Voice Design

## Goal

Turn the light-mode photo ancestor flow into a credible image-first experience by adding a real external VLM adapter, a role-based digital-human explanation layer, and playable voice narration while keeping the existing fallback path honest and testable.

This phase directly addresses two remaining project-plan gaps:

- Photo ancestor recognition is still MVP-level when it relies only on file names and text clues.
- Digital human image/personality and voice narration are not present.

## Current State

Phase 1 already added:

- `VisionService.analyzeFoodImage({ imageData, imageLabel, description })`
- A fallback provider that returns labels, ingredients, candidates, confidence, and evidence.
- `LightModeService.recognizeAncestor`, which includes `vision` in the response.
- Frontend image upload, image preview, vision evidence, and platform share copy.

The current limitation is that `VisionService` has a stable VLM-compatible response shape but does not yet call a real vision model. The frontend also shows evidence as plain data, not as a guided “digital human” narration.

## Approved Scope

### 1. External VLM Adapter

Add a provider adapter under `backend/src/services/vision/` that can call a real external VLM when configured.

The service must choose providers in this order:

1. `external` when all required environment variables are present and the call succeeds.
2. `fallback` when no external config exists, the image payload is missing, or the external call fails.

Required configuration:

```env
OPENAI_API_KEY=<key>
OPENAI_VISION_MODEL=gpt-4.1-mini
```

`OPENAI_VISION_MODEL` may be omitted; the service must use a safe default. The code must not require the `openai` npm package unless already installed. It can use `fetch` so the project does not gain an unnecessary dependency.

External provider output must be normalized to the existing shape:

```js
{
  provider: 'external',
  model: 'gpt-4.1-mini',
  labels: ['crab', 'orange', 'steamed dish'],
  ingredients: ['crab', 'orange'],
  dishCandidates: [
    {
      dishId: 'dish_001',
      name: '蟹酿橙',
      confidence: 0.91,
      reason: 'The image appears to show crab and citrus/orange serving cues.'
    }
  ],
  confidence: 0.91,
  evidence: [
    'Detected crab-like ingredient.',
    'Detected citrus/orange container or garnish.',
    'Matched known dish profile for 蟹酿橙.'
  ],
  rawProvider: {
    requestId: 'optional-provider-id'
  }
}
```

The prompt to the VLM must ask for strict JSON only. If the provider returns malformed JSON, the service records an evidence line explaining the parse failure and falls back.

### 2. Dish Candidate Normalization

External VLMs may return dish names rather than internal IDs. Add a small normalization layer that maps provider candidates to known `data/knowledge_graph/nodes_dish.json` IDs by:

- Exact `dishId` match if provided.
- Exact Chinese dish name match.
- Keyword match from existing ancestor mappings as a final local aid.

If a provider candidate cannot be mapped, it can remain in evidence but must not become the selected ancestor.

### 3. Digital Human Explanation

Add `DigitalHumanService` with one stable method:

```js
buildAncestorNarration({ ancestorResult, fragments = [] })
```

It returns:

```js
{
  speaker: {
    id: 'taotie-curator',
    name: '饕餮考古官',
    role: '风味证据讲解员',
    avatarTone: 'bronze-mask-curator'
  },
  emotion: 'curious',
  headline: '这口橙香蟹鲜，祖上住在南宋黄橙里。',
  script: '我先看见了蟹与橙的组合，再对照《山家清供》的蒸制线索，所以把它归到蟹酿橙一脉。',
  evidenceBullets: [
    '视觉线索：crab、orange、steamed dish',
    '古籍线索：山家清供记录了橙壳盛蟹并蒸熟',
    '可信度：91%'
  ],
  shareLine: '我的午饭被饕餮考古官认成了南宋蟹酿橙。'
}
```

This phase does not create a 3D animated character. It creates a production-ready narrative object and a frontend visual persona card. A full animated avatar belongs in a future phase.

### 4. Voice Narration Contract

Add `VoiceService` with one stable method:

```js
buildVoiceCue({ script, speaker, emotion })
```

It returns:

```js
{
  mode: 'browser-tts',
  language: 'zh-CN',
  voiceName: 'zh-CN',
  rate: 0.95,
  pitch: 1.05,
  text: '...',
  audioUrl: null
}
```

For Phase 2A, browser TTS is the default because it works without API keys. When `OPENAI_TTS_API_KEY` and a model are configured, the same contract can return:

```js
{
  mode: 'external-audio',
  audioUrl: '/api/light/voice/<id>.mp3',
  text: '...'
}
```

No external audio generation is required in this phase unless the key exists and an adapter can be safely added. The frontend must handle both modes.

### 5. Light Mode Response Shape

`LightModeService.recognizeAncestor` must return:

```js
{
  vision: { ... },
  digitalHuman: { ... },
  voice: { ... },
  ancestor: { ... },
  shareCard: { ... }
}
```

The existing `vision`, `ancestor`, `collection`, and `shareCard` fields remain backward compatible.

### 6. Frontend Experience

Update `LightMode.jsx` to show:

- Provider status: `external VLM` or `fallback evidence`.
- A digital-human card with speaker name, role, headline, narration script, and evidence bullets.
- Voice controls:
  - Play narration.
  - Stop narration.
  - Disabled state when `speechSynthesis` is unavailable.
- A clear sentence when fallback is active: “当前使用本地兜底识别；配置 VLM key 后会优先走真实视觉模型。”

The UI should fit the existing paper/cinnabar/celadon style and should not introduce a landing-page-like hero.

## Out Of Scope

- AR kitchen overlays.
- UGC community, moderation, likes, and comments.
- Full draw economy beyond Phase 1 daily draw state.
- True automatic posting to Xiaohongshu or Douyin.
- 3D or video digital-human avatar.
- Mandatory paid TTS generation.

These remain for Phase 2B and Phase 2C.

## Backend Architecture

New files:

- `backend/src/services/vision/OpenAIVisionProvider.js`
- `backend/src/services/vision/VisionCandidateMapper.js`
- `backend/src/services/DigitalHumanService.js`
- `backend/src/services/VoiceService.js`
- Tests for each new unit under `backend/src/services/__tests__/`

Modified files:

- `backend/src/services/VisionService.js`
- `backend/src/services/LightModeService.js`
- `backend/src/services/__tests__/VisionService.test.js`
- `backend/src/services/__tests__/LightModeService.complete.test.js`

`VisionService` remains the public boundary. Provider-specific logic stays under `services/vision/` so future VLMs can be added without changing the light-mode orchestrator.

## Frontend Architecture

New or modified frontend units:

- `frontend/src/lib/speechNarration.js`: small browser TTS helper.
- `frontend/src/pages/LightMode.jsx`: render digital-human card and voice controls.
- `frontend/src/pages/__tests__/lightModeFoundation.test.mjs`: extend source-level checks for digital human and voice controls.

The frontend must not make direct VLM calls. Images continue to go through the backend, where provider keys and prompt logic stay private.

## Data Flow

1. User uploads or captures a food image.
2. Frontend sends `imageData`, `imageLabel`, and `description` to `/api/light/ancestor`.
3. `LightModeService` calls `VisionService`.
4. `VisionService` attempts the external VLM provider if configured.
5. Provider result is normalized through `VisionCandidateMapper`.
6. If external provider is unavailable or invalid, fallback analysis runs.
7. `LightModeService` chooses the ancestor from mapped vision candidates plus existing text matching.
8. `DigitalHumanService` builds a narration from the ancestor result and evidence.
9. `VoiceService` returns a browser-TTS cue for the narration.
10. Frontend renders the ancestor card, evidence, digital-human narration, and voice controls.

## Error Handling

- Missing API key is not an error; it produces `provider: 'fallback'`.
- External provider HTTP failure falls back and adds evidence such as `External VLM unavailable; fallback used.`
- Malformed provider JSON falls back and adds parse-failure evidence.
- Provider candidates that cannot map to known dishes appear only in evidence.
- Browser without `speechSynthesis` shows disabled voice controls but still displays text narration.
- Image payload size remains constrained by existing Express JSON limits.

## Testing And Verification

Backend tests must prove:

- `VisionService` uses an injected external provider when configured and returns `provider: 'external'`.
- `VisionService` falls back when provider config is missing, throws, or returns malformed JSON.
- `VisionCandidateMapper` maps known dish names to dish IDs.
- `DigitalHumanService` creates a speaker, headline, script, evidence bullets, and share line from an ancestor result.
- `VoiceService` creates a browser TTS cue.
- `LightModeService.recognizeAncestor` includes `digitalHuman` and `voice` in addition to existing fields.

Frontend tests or smoke checks must prove:

- `LightMode.jsx` renders digital-human narration fields.
- Voice controls call the browser speech helper.
- Fallback provider status is visible.
- Existing image preview, vision evidence, draw economy, and platform share actions still render.

Full verification commands:

```powershell
cd backend; npm test -- --runInBand
cd frontend; node --test src\pages\__tests__\evolutionDishes.test.mjs
cd frontend; node --test src\pages\__tests__\lightModeFoundation.test.mjs src\lib\__tests__\authStore.test.mjs
cd frontend; npm run lint
cd frontend; npm run build
C:\Users\hacjr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m unittest discover -v
```

Browser smoke:

1. Open `/light`.
2. Upload a food image or submit the default description.
3. Verify ancestor result includes provider status, `VISION · 识图证据`, a digital-human card, and voice controls.
4. Click play and stop. Voice should play when supported and fail gracefully when unsupported.
5. Verify console errors are empty.

## Acceptance Criteria

Phase 2A is complete when:

- The backend has a real external VLM adapter path behind configuration.
- The backend still has honest fallback behavior when no key or provider failure exists.
- Ancestor recognition returns `vision.provider: 'external'` in provider-injected tests and `fallback` in local no-key tests.
- Ancestor recognition returns `digitalHuman` and `voice`.
- The frontend displays provider status, digital-human narration, evidence bullets, and play/stop voice controls.
- All backend, frontend, and Python verification commands pass.

## Remaining After Phase 2A

The full project-plan goal will still require:

- Phase 2B: AR kitchen, complete draw economy, larger content/card pool.
- Phase 2C: UGC community, richer account/profile system, moderation, platform publish adapters.
- Phase 2D: full data/content expansion if “全量碎片库” means a curated production corpus rather than the current seed library.
