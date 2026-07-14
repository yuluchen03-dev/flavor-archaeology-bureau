# Phase 1 Product Foundation Design

## Goal

Move the current hackathon MVP toward the full project-plan vision by turning light mode into a persistent product foundation: image-aware ancestor recognition, account-backed collection state, expanded game content, fragment-library APIs, and platform-ready sharing.

This phase intentionally does not implement digital human voice, AR kitchen, or the UGC community surface. Those features depend on the identity, content, collection, and share foundations created here.

## Current State

The app already has:

- A React/Vite frontend with `LightMode`, `Input`, `Result`, `Teaching`, `StarMap`, and `Evolution` pages.
- Express backend routes for auth, restoration, teaching, star map, evolution, and light mode.
- JWT auth on the backend, but no frontend login/register flow.
- `LightModeService.recognizeAncestor`, which currently maps `description` and `imageLabel` keywords to known dishes.
- Daily revival, true-or-fake, and share certificate objects, but without user-backed draw records, collection economy, expanded question bank, or platform share intent.

## Approved Scope

### 1. Vision Interface For Ancestor Recognition

Add a backend `VisionService` with one stable method:

```js
analyzeFoodImage({ imageData, imageLabel, description })
```

It returns:

```js
{
  provider: 'fallback' | 'external',
  labels: ['orange', 'crab', 'steamed dish'],
  ingredients: ['crab', 'orange'],
  dishCandidates: [
    { dishId: 'dish_001', name: '蟹酿橙', confidence: 0.92, reason: 'Detected crab and orange cues.' }
  ],
  confidence: 0.92,
  evidence: ['filename mentions crab', 'description mentions orange']
}
```

If no external VLM configuration exists, the fallback must be explicit and honest. It should inspect image metadata, file name, and text clues, then return evidence showing why it chose the ancestor. The API shape must be compatible with a future real VLM adapter, so replacing fallback later does not change `LightModeService` or the frontend.

`LightModeService.recognizeAncestor` will call `VisionService` first, then combine image candidates with existing text clues. The response must include a `vision` object so the frontend can show what was detected.

### 2. Frontend Auth Loop

Add a minimal account experience:

- Login/register panel or modal in the main layout.
- Token persisted in `localStorage`.
- Authenticated requests attach `Authorization: Bearer <token>`.
- Current user can be loaded from `/api/auth/me`.
- Light mode still works anonymously, but signed-in users get persistent collection/draw/share state.

This phase does not add password reset, profile editing, OAuth, or admin tooling.

### 3. Collection And Draw Economy

Add backend services and database tables for:

- User collection entries keyed by `user_id` and `dish_id`.
- Daily draw records keyed by `user_id`, date, and draw type.
- Share records storing platform, card metadata, generated copy, and status.

Daily revival should return:

```js
{
  draws: { usedToday: 1, limit: 3, remaining: 2, streakDays: 2 },
  collection: { status: 'new' | 'duplicate' | 'lit', starId: 'star-dish_001', constellation: '宋代风味星座' }
}
```

Anonymous users receive deterministic daily data but no persistent draw economy.

### 4. Expanded True-Or-Fake Question Bank

Move fake dishes and quiz rounds into data files under `data/light_mode/`. Add enough entries to stop the game from feeling like a two-item stub:

- At least 12 fake dishes.
- At least 12 quizable real dish references from existing dish data.
- Each fake item includes `id`, `name`, `dynasty`, `description`, `source`, `tell`, and `difficulty`.

`getAuthenticityRound` should support `seed`, `dynasty`, and `difficulty` inputs while preserving the existing API shape.

### 5. Fragment Library API

Add a structured fragment library under `data/fragments/` and backend routes:

- `GET /api/fragments`
- `GET /api/fragments/:id`

Fragments include:

```js
{
  id: 'fragment_shanjiaqinggong_xieniangcheng',
  title: '蟹酿橙残句',
  source: '山家清供',
  dynasty: '宋代',
  passage: '...',
  relatedDishId: 'dish_001',
  tags: ['蟹', '橙', '蒸'],
  difficulty: 'iron_sample'
}
```

List filtering supports `q`, `dynasty`, `source`, and `tag`.

### 6. Platform Share Intent

Extend share-card generation to include platform-ready output for `xiaohongshu` and `douyin`:

```js
platformIntents: {
  xiaohongshu: {
    title,
    body,
    hashtags,
    copyText,
    publishUrl,
    canAutoPublish: false,
    reason: 'Requires user account authorization on platform.'
  },
  douyin: { ... }
}
```

The UI can copy platform copy and show the intended publish destination. It must not claim the app has posted to third-party platforms unless an authenticated platform API integration exists.

## Out Of Scope For Phase 1

- Digital human visual avatar and voice playback.
- AR kitchen camera overlays.
- UGC public community, moderation, likes, or comments.
- True automatic posting to Xiaohongshu or Douyin.
- Full external VLM integration requiring a paid key. The architecture must support it, but fallback remains valid for local development.

## Backend Architecture

New or changed backend units:

- `backend/src/services/VisionService.js`: image analysis abstraction and local fallback.
- `backend/src/services/CollectionService.js`: collection and draw state.
- `backend/src/services/ShareIntentService.js`: platform copy/intents.
- `backend/src/services/FragmentService.js`: fragment library queries.
- `backend/src/routes/fragments.js` and controller.
- New migration for `user_collections`, `daily_draws`, and `share_records`.
- `LightModeService` remains the orchestrator for light-mode features but delegates specialized responsibilities.

## Frontend Architecture

New or changed frontend units:

- `frontend/src/lib/apiClient.js`: API helper with token support.
- `frontend/src/lib/authStore.js`: localStorage-backed token/user helpers.
- `frontend/src/components/AuthPanel.jsx`: login/register/current-user UI.
- `LightMode.jsx`: image preview, image payload submission, vision result display, draw economy display, platform share actions.
- `Layout.jsx`: user/account entry point.

## Data Flow

1. User uploads or captures a food image in light mode.
2. Frontend reads a small data URL payload and submits `description`, `imageLabel`, and `imageData`.
3. Backend `LightModeService` calls `VisionService`.
4. `VisionService` returns labels, ingredients, dish candidates, confidence, and evidence.
5. `LightModeService` chooses the best ancestor using image candidates plus text matching.
6. If signed in, collection state is written through `CollectionService`.
7. Response returns ancestor result, `vision`, collection state, and share card platform intents.
8. Frontend renders image preview, detected evidence, ancestor result, collection state, and share actions.

## Error Handling

- Missing image data is allowed; text-only ancestor recognition still works.
- Invalid image payloads return a clear `vision.provider: 'fallback'` result with low confidence, not a 500.
- Auth failures do not break anonymous light-mode flows; they only disable persistent collection updates.
- Fragment filters with no matches return an empty list with `success: true`.
- Share intents always return `canAutoPublish: false` until a real platform API exists.

## Testing And Verification

Backend tests must prove:

- `VisionService` extracts structured labels/candidates/evidence from image label and description fallback.
- Ancestor recognition includes `vision` and uses vision candidates ahead of text-only defaulting.
- Authenticated daily revival records draw state and collection status.
- True-or-fake rounds draw from expanded data and respect seed/difficulty.
- Fragment API filters by query, dynasty, source, and tag.
- Share cards include Xiaohongshu and Douyin platform intents with `canAutoPublish: false`.

Frontend tests or browser smoke checks must prove:

- Login/register stores token and sends authenticated requests.
- Light mode sends image data and displays vision evidence.
- Daily revival shows draw remaining/collection state when returned.
- Share actions expose platform copy for Xiaohongshu/Douyin.

Full verification commands:

```powershell
cd backend; npm test -- --runInBand
cd frontend; npm run lint
cd frontend; npm run build
cd frontend; node --test src\pages\__tests__\evolutionDishes.test.mjs
C:\Users\hacjr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m unittest discover -v
```

## Acceptance Criteria

Phase 1 is complete when:

- The uploaded-image ancestor flow returns and displays structured `vision` evidence.
- Signed-in users can register, log in, stay authenticated locally, and trigger authenticated light-mode requests.
- Daily revival has a visible draw/collection economy backed by backend state.
- True-or-fake no longer depends on a two-item fake bank.
- Fragment library APIs are available and tested.
- Share cards include platform-specific Xiaohongshu/Douyin publish preparation without falsely claiming automatic posting.
- Existing MVP routes and tests still pass.

