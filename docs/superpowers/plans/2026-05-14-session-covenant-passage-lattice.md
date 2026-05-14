# Session Covenant Passage Lattice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first adaptive session covenant and Passage Lattice slice so Jungial can shape each session through chosen intensity, symbolic boundaries, non-repeating dream fragments, EchoTrace memory, and redacted GNI context.

**Architecture:** Add small focused modules that mirror existing patterns: JSON catalogs in `data/`, normalizers in `src/contentCatalog.js`, runtime validators in `src/contracts.js`, strict schemas in `data/schemas/`, generated fixtures, and simulation integration through `runSimulation()`. The player-facing and internal runtime names stay dream-native: `SessionCovenant`, `Passage`, `EchoTrace`, `EchoThread`, and `VariationLattice`.

**Tech Stack:** Dependency-free Node.js ES modules, Node built-in test runner, JSON catalogs/schemas, current GNI bridge, current SaveGame wrapper.

---

## Scope Check

The approved spec contains several future production concerns: voice UX, full horror library, crisis help surfaces, UE5 rendering, and cloud privacy policy. This plan implements only the first engine-agnostic slice:

- `SessionCovenantV1`
- `PassageV1` catalog
- `EchoTraceV1`
- `VariationLattice` selection and recurrence helpers
- redacted GNI handoff fields
- SaveGame persistence
- fixture/schema/contract coverage

Do not add UI, audio capture, clinical flows, cloud sync, or full content libraries in this pass.

## Files

- Create: `src/sessionCovenant.js` - normalize spoken/session preferences into `SessionCovenantV1`.
- Create: `src/passageLattice.js` - select Passages, apply boundary/intensity rules, create EchoTrace records, and compute recurrence schedules.
- Create: `data/passages.json` - first small Passage catalog.
- Create: `data/schemas/session_covenant.schema.json` - strict contract schema.
- Create: `data/schemas/passage.schema.json` - strict Passage schema.
- Create: `data/schemas/echo_trace.schema.json` - strict EchoTrace schema.
- Create: `tests/sessionCovenant.test.js` - covenant normalization and redaction tests.
- Create: `tests/passageLattice.test.js` - selection, recurrence, boundary, and determinism tests.
- Modify: `src/contentCatalog.js` - load/normalize/validate Passage catalog.
- Modify: `src/contracts.js` - validators for covenant, Passage, EchoTrace, and optional SessionBundle fields.
- Modify: `src/contractValidator.js` - route new schemas.
- Modify: `src/ai.js` - copy redacted covenant/passage context into `GniProcessingRequestV1`.
- Modify: `src/simulation.js` - run a first Passage and save covenant/echo data.
- Modify: `src/dreamerProfile.js` - aggregate motifs/gestures/passages without raw speech.
- Modify: `src/fixtureExporter.js` - export new contract fixtures.
- Modify: `tests/dataContracts.test.js` - validate new contracts and SaveGame fields.
- Modify: `tests/contentCatalog.test.js` - prove Passage catalog loads and validates.
- Modify: `tests/simulationHarness.test.js` - prove simulation saves and sends redacted Passage context.
- Modify: `tests/fixtureExporter.test.js` - expect new fixtures.
- Modify: `data/schemas/session_bundle.schema.json` - optional covenant/passage context.
- Modify: `data/schemas/save_game.schema.json` - optional covenant/echo/profile fields.
- Modify: `package.json` - include new fixtures in `npm run contracts`.
- Modify: `README.md` - document commands and data contracts.
- Modify: `data/scenarios/smoke_baseline.json` - refresh only after verifying expected deterministic behavior changed.

## Future Power-Ups Not In First Slice

These are strong ideas to keep warm, but not implement in this plan:

- `Dream Weather`: a hidden pressure climate that slowly changes possible Passages.
- `Oneiric Dialects`: each save develops its own visual/symbol grammar over time.
- `Rite Decks`: curated packs of Passages for grief, terror, beauty, wonder, and transformation.
- `Mask Memory`: masks remember not facts, but the shape of how the player last met them.
- `False Familiarity`: a Passage looks familiar but has one impossible changed detail.
- `Dream Scar Tissue`: repeated hard boundaries leave protective architecture in the world.
- `Constellation Journal`: journal entries form star maps instead of plain chronological logs.
- `Horror Budgets`: separate budgets for visual shock, audio shock, bodily unease, pursuit, helplessness, and cosmic dread.
- `Local GNI Firebreak`: a final contract gate that strips any forbidden content before engine systems see it.

---

### Task 1: Session Covenant Model

**Files:**
- Create: `src/sessionCovenant.js`
- Test: `tests/sessionCovenant.test.js`

- [ ] **Step 1: Write the failing normalization tests**

Create `tests/sessionCovenant.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SESSION_COVENANT,
  createSessionCovenant,
  createFirstListeningCovenant,
  createTonightShapeCovenant,
  toGniCovenantContext
} from '../src/sessionCovenant.js';

test('default session covenant is gentle, bounded, and session scoped', () => {
  const covenant = createSessionCovenant();

  assert.equal(covenant.schema, 'SessionCovenantV1');
  assert.equal(covenant.schemaVersion, 1);
  assert.equal(covenant.mode, 'tonight_shape');
  assert.deepEqual(covenant.toneTags, DEFAULT_SESSION_COVENANT.toneTags);
  assert.equal(covenant.intensityCeiling, 0.35);
  assert.deepEqual(covenant.hardBoundaryTags, ['real_world_self_harm']);
  assert.equal(covenant.memoryScope, 'session_only');
});

test('first listening covenant redacts raw speech into symbolic preferences', () => {
  const covenant = createFirstListeningCovenant({
    spokenTokens: ['Let it become strange', 'No teeth tonight', 'Keep the lamp near'],
    selectedToneTags: ['dark', 'horrific'],
    returnAnchor: 'lamp near the note'
  });

  assert.equal(covenant.mode, 'first_listening');
  assert.deepEqual(covenant.toneTags, ['dark', 'horrific', 'strange']);
  assert.equal(covenant.intensityCeiling, 0.78);
  assert.deepEqual(covenant.softBoundaryTags, ['teeth']);
  assert.deepEqual(covenant.returnAnchor, { kind: 'image', value: 'lamp near the note' });
  assert.equal(Object.hasOwn(covenant, 'spokenTokens'), false);
});

test('tonight shape covenant clamps intensity and deduplicates tags', () => {
  const covenant = createTonightShapeCovenant({
    toneTags: ['dark', 'dark', 'strange'],
    intensityCeiling: 4,
    hardBoundaryTags: ['body_horror', 'body_horror'],
    softBoundaryTags: ['helplessness']
  });

  assert.deepEqual(covenant.toneTags, ['dark', 'strange']);
  assert.equal(covenant.intensityCeiling, 1);
  assert.deepEqual(covenant.hardBoundaryTags, ['real_world_self_harm', 'body_horror']);
  assert.deepEqual(covenant.softBoundaryTags, ['helplessness']);
});

test('GNI covenant context sends only redacted fields', () => {
  const covenant = createSessionCovenant({
    toneTags: ['strange'],
    intensityCeiling: 0.5,
    hardBoundaryTags: ['body_horror'],
    softBoundaryTags: ['teeth'],
    returnAnchor: { kind: 'image', value: 'small lamp' },
    groundingPreference: 'quiet_room',
    memoryScope: 'profile_aggregate'
  });

  assert.deepEqual(toGniCovenantContext(covenant), {
    schema: 'SessionCovenantContextV1',
    schemaVersion: 1,
    mode: 'tonight_shape',
    toneTags: ['strange'],
    intensityCeiling: 0.5,
    hardBoundaryTags: ['real_world_self_harm', 'body_horror'],
    softBoundaryTags: ['teeth'],
    allowedPressureTags: [],
    returnAnchorKind: 'image',
    groundingPreference: 'quiet_room',
    memoryScope: 'profile_aggregate'
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```powershell
node --test --test-concurrency=1 tests/sessionCovenant.test.js
```

Expected: FAIL with module not found for `../src/sessionCovenant.js`.

- [ ] **Step 3: Implement the covenant module**

Create `src/sessionCovenant.js`:

```js
export const INTENSITY_BANDS = Object.freeze({
  gentle: 0.25,
  strange: 0.45,
  dark: 0.62,
  horrific: 0.78,
  abyssal: 0.92,
  cathartic: 0.68,
  beautiful: 0.38,
  chaotic: 0.72
});

export const DEFAULT_SESSION_COVENANT = Object.freeze({
  schema: 'SessionCovenantV1',
  schemaVersion: 1,
  mode: 'tonight_shape',
  toneTags: ['gentle', 'strange'],
  intensityCeiling: 0.35,
  hardBoundaryTags: ['real_world_self_harm'],
  softBoundaryTags: [],
  allowedPressureTags: [],
  returnAnchor: { kind: 'image', value: 'the note in the Threshold Chamber' },
  groundingPreference: 'quiet_room',
  memoryScope: 'session_only'
});

export function createSessionCovenant(input = {}) {
  const toneTags = normalizeTags(input.toneTags ?? DEFAULT_SESSION_COVENANT.toneTags);
  return {
    schema: 'SessionCovenantV1',
    schemaVersion: 1,
    mode: normalizeMode(input.mode),
    toneTags,
    intensityCeiling: clamp01(input.intensityCeiling ?? inferIntensityCeiling(toneTags)),
    hardBoundaryTags: mergeTags(['real_world_self_harm'], input.hardBoundaryTags),
    softBoundaryTags: normalizeTags(input.softBoundaryTags),
    allowedPressureTags: normalizeTags(input.allowedPressureTags),
    returnAnchor: normalizeReturnAnchor(input.returnAnchor),
    groundingPreference: normalizeToken(input.groundingPreference) || 'quiet_room',
    memoryScope: ['session_only', 'profile_aggregate'].includes(input.memoryScope)
      ? input.memoryScope
      : 'session_only'
  };
}

export function createFirstListeningCovenant({
  spokenTokens = [],
  selectedToneTags = [],
  returnAnchor = null,
  memoryScope = 'session_only'
} = {}) {
  const derived = deriveTagsFromSpeech(spokenTokens);
  return createSessionCovenant({
    mode: 'first_listening',
    toneTags: [...selectedToneTags, ...derived.toneTags],
    softBoundaryTags: derived.softBoundaryTags,
    returnAnchor: returnAnchor ? { kind: 'image', value: returnAnchor } : undefined,
    memoryScope
  });
}

export function createTonightShapeCovenant(input = {}) {
  return createSessionCovenant({
    ...input,
    mode: 'tonight_shape'
  });
}

export function toGniCovenantContext(covenant = createSessionCovenant()) {
  const normalized = createSessionCovenant(covenant);
  return {
    schema: 'SessionCovenantContextV1',
    schemaVersion: 1,
    mode: normalized.mode,
    toneTags: [...normalized.toneTags],
    intensityCeiling: normalized.intensityCeiling,
    hardBoundaryTags: [...normalized.hardBoundaryTags],
    softBoundaryTags: [...normalized.softBoundaryTags],
    allowedPressureTags: [...normalized.allowedPressureTags],
    returnAnchorKind: normalized.returnAnchor.kind,
    groundingPreference: normalized.groundingPreference,
    memoryScope: normalized.memoryScope
  };
}

function deriveTagsFromSpeech(spokenTokens) {
  const text = spokenTokens.join(' ').toLowerCase();
  return {
    toneTags: [
      text.includes('strange') ? 'strange' : null,
      text.includes('dark') ? 'dark' : null,
      text.includes('horror') || text.includes('horrific') ? 'horrific' : null
    ].filter(Boolean),
    softBoundaryTags: [
      text.includes('no teeth') || text.includes('teeth') ? 'teeth' : null,
      text.includes('no chase') || text.includes('chase') ? 'pursuit' : null
    ].filter(Boolean)
  };
}

function inferIntensityCeiling(toneTags) {
  return Math.max(...toneTags.map((tag) => INTENSITY_BANDS[tag] ?? 0.35), 0.35);
}

function normalizeMode(mode) {
  return ['first_listening', 'tonight_shape'].includes(mode) ? mode : 'tonight_shape';
}

function normalizeReturnAnchor(input) {
  if (typeof input === 'string') {
    return { kind: 'image', value: input.trim() || DEFAULT_SESSION_COVENANT.returnAnchor.value };
  }
  if (input && typeof input === 'object') {
    return {
      kind: normalizeToken(input.kind) || 'image',
      value: String(input.value ?? DEFAULT_SESSION_COVENANT.returnAnchor.value).trim()
    };
  }
  return { ...DEFAULT_SESSION_COVENANT.returnAnchor };
}

function mergeTags(required, tags) {
  return normalizeTags([...(required ?? []), ...(tags ?? [])]);
}

function normalizeTags(tags = []) {
  return [...new Set((Array.isArray(tags) ? tags : [])
    .map(normalizeToken)
    .filter(Boolean))];
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(Number(value).toFixed(3))));
}
```

- [ ] **Step 4: Run the covenant tests**

Run:

```powershell
node --test --test-concurrency=1 tests/sessionCovenant.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/sessionCovenant.js tests/sessionCovenant.test.js
git commit -m "feat: add session covenant model"
```

---

### Task 2: Passage Catalog And Content Validation

**Files:**
- Create: `data/passages.json`
- Modify: `src/contentCatalog.js`
- Modify: `tests/contentCatalog.test.js`

- [ ] **Step 1: Write failing catalog tests**

Append to `tests/contentCatalog.test.js`:

```js
test('bundled Passage catalog loads into runtime-ready catalog objects', () => {
  const catalog = loadBundledContentCatalog();

  assert.ok(catalog.passages.length >= 5);
  const door = catalog.passages.find((passage) => passage.id === 'door_breathing_low');
  assert.deepEqual(door.motifs, ['door', 'breath', 'threshold']);
  assert.equal(door.intensityBand, 'strange');
  assert.equal(door.variationFamily, 'threshold_doors');
});

test('content catalog validation rejects malformed Passage content', () => {
  const result = validateContentCatalog({
    archetypes: ['Seeker'],
    symbolLexicon: [{ id: 'known_symbol', domain: 'test', note: 'Known.' }],
    toolSigils: [],
    dreamModules: [],
    masks: [],
    passages: [
      {
        id: 'bad_passage',
        motifs: ['unknown_symbol'],
        pressureTags: ['unknown'],
        formTags: [],
        intensityBand: 'too_much',
        allowedResponseKinds: [],
        returnAnchorTags: ['missing_anchor'],
        variationFamily: ''
      }
    ]
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'passages.bad_passage has unknown motif unknown_symbol',
    'passages.bad_passage has unknown return anchor missing_anchor',
    'passages.bad_passage has unsupported intensity band too_much',
    'passages.bad_passage variationFamily is required'
  ]);
});
```

- [ ] **Step 2: Run catalog tests and verify failure**

Run:

```powershell
node --test --test-concurrency=1 tests/contentCatalog.test.js
```

Expected: FAIL because `catalog.passages` is undefined.

- [ ] **Step 3: Add the Passage catalog**

Create `data/passages.json`:

```json
{
  "schema": "PassageCatalogV1",
  "passages": [
    {
      "id": "door_breathing_low",
      "motifs": ["door", "breath", "threshold"],
      "pressure_tags": ["unknown", "invitation"],
      "form_tags": ["locked_door", "warm_air", "soft_knocking"],
      "intensity_band": "strange",
      "allowed_response_kinds": ["approach", "speak", "wait", "withdraw", "alter_object"],
      "return_anchor_tags": ["lamp", "note", "threshold"],
      "variation_family": "threshold_doors",
      "base_weight": 1
    },
    {
      "id": "candle_refuses_dark",
      "motifs": ["light", "threshold", "memory"],
      "pressure_tags": ["hope", "refusal"],
      "form_tags": ["candle", "dim_room", "held_flame"],
      "intensity_band": "gentle",
      "allowed_response_kinds": ["protect", "speak", "wait", "alter_object"],
      "return_anchor_tags": ["lamp", "note", "hearth"],
      "variation_family": "unspent_lights",
      "base_weight": 1
    },
    {
      "id": "mirror_yesterday_room",
      "motifs": ["mirror", "memory", "self-observation"],
      "pressure_tags": ["reflection", "recurrence"],
      "form_tags": ["mist_mirror", "old_room", "delayed_motion"],
      "intensity_band": "dark",
      "allowed_response_kinds": ["approach", "speak", "wait", "withdraw", "alter_object"],
      "return_anchor_tags": ["mirror", "note", "threshold"],
      "variation_family": "returning_reflections",
      "base_weight": 0.9
    },
    {
      "id": "garden_keyholes",
      "motifs": ["garden", "growth", "key"],
      "pressure_tags": ["beauty", "invitation"],
      "form_tags": ["flowers", "keyholes", "soft_path"],
      "intensity_band": "strange",
      "allowed_response_kinds": ["approach", "speak", "wait", "alter_object"],
      "return_anchor_tags": ["garden", "key", "threshold"],
      "variation_family": "inviting_growth",
      "base_weight": 0.95
    },
    {
      "id": "black_star_silence",
      "motifs": ["star", "silence", "void"],
      "pressure_tags": ["cosmic_mystery", "annihilation"],
      "form_tags": ["black_star", "soundless_pull", "distant_ring"],
      "intensity_band": "horrific",
      "allowed_response_kinds": ["approach", "withdraw", "speak", "return_anchor"],
      "return_anchor_tags": ["lamp", "threshold", "light"],
      "variation_family": "cosmic_thresholds",
      "base_weight": 0.55
    }
  ]
}
```

- [ ] **Step 4: Update content catalog loading and validation**

Modify `src/contentCatalog.js`:

```js
export function loadBundledContentCatalog() {
  return normalizeContentCatalog({
    archetypes: require('../data/archetypes.json').archetypes,
    toolSigils: require('../data/tool_sigils.json').tool_sigils,
    dreamModules: require('../data/dream_modules.json').modules,
    masks: require('../data/masks.json').masks,
    symbolLexicon: require('../data/symbols.json').symbols,
    passages: require('../data/passages.json').passages
  });
}
```

Add this property inside the object returned by `normalizeContentCatalog()`:

```js
passages: (raw.passages ?? []).map((passage) => ({
  id: passage.id,
  motifs: [...(passage.motifs ?? [])],
  pressureTags: [...(passage.pressureTags ?? passage.pressure_tags ?? [])],
  formTags: [...(passage.formTags ?? passage.form_tags ?? [])],
  intensityBand: passage.intensityBand ?? passage.intensity_band ?? 'strange',
  allowedResponseKinds: [...(passage.allowedResponseKinds ?? passage.allowed_response_kinds ?? [])],
  returnAnchorTags: [...(passage.returnAnchorTags ?? passage.return_anchor_tags ?? [])],
  variationFamily: passage.variationFamily ?? passage.variation_family ?? '',
  baseWeight: passage.baseWeight ?? passage.base_weight ?? 1
}))
```

Add the supported band set near the existing `knownSymbols` declarations:

```js
const supportedIntensityBands = new Set(['gentle', 'strange', 'dark', 'horrific', 'abyssal']);
```

Add this validation block before the final `return`:

```js
for (const passage of normalized.passages) {
  if (knownSymbols.size > 0) {
    for (const motif of passage.motifs) {
      if (!knownSymbols.has(motif)) {
        errors.push(`passages.${passage.id} has unknown motif ${motif}`);
      }
    }
    for (const anchor of passage.returnAnchorTags) {
      if (!knownSymbols.has(anchor)) {
        errors.push(`passages.${passage.id} has unknown return anchor ${anchor}`);
      }
    }
  }
  if (!supportedIntensityBands.has(passage.intensityBand)) {
    errors.push(`passages.${passage.id} has unsupported intensity band ${passage.intensityBand}`);
  }
  if (!passage.variationFamily) {
    errors.push(`passages.${passage.id} variationFamily is required`);
  }
}
```

- [ ] **Step 5: Add lexicon symbols used by the Passage catalog**

Modify `data/symbols.json` by adding these exact symbol objects to the `symbols` array when they are not already present:

```json
{ "id": "breath", "domain": "body", "note": "A sign of life, pressure, and invitation." },
{ "id": "door", "domain": "threshold", "note": "A closed or open edge between states." },
{ "id": "garden", "domain": "garden", "note": "A living place where growth becomes visible." },
{ "id": "key", "domain": "threshold", "note": "Permission, access, and chosen entry." },
{ "id": "lamp", "domain": "threshold", "note": "A carried return point when the dark gathers." },
{ "id": "note", "domain": "threshold", "note": "A small written presence that waits to be read." },
{ "id": "star", "domain": "cosmic", "note": "A distant light or wound in the dream sky." },
{ "id": "void", "domain": "void", "note": "A depth where form loosens and scale disappears." }
```

Keep ids lowercase and stable.

- [ ] **Step 6: Run catalog validation**

Run:

```powershell
node --test --test-concurrency=1 tests/contentCatalog.test.js
npm run validate
```

Expected: PASS and content validation prints valid output.

- [ ] **Step 7: Commit**

```powershell
git add data/passages.json data/symbols.json src/contentCatalog.js tests/contentCatalog.test.js
git commit -m "feat: add Passage content catalog"
```

---

### Task 3: Contract Schemas And Validators

**Files:**
- Create: `data/schemas/session_covenant.schema.json`
- Create: `data/schemas/passage.schema.json`
- Create: `data/schemas/echo_trace.schema.json`
- Modify: `src/contracts.js`
- Modify: `src/contractValidator.js`
- Modify: `data/schemas/session_bundle.schema.json`
- Modify: `data/schemas/save_game.schema.json`
- Test: `tests/dataContracts.test.js`
- Test: `tests/contractValidator.test.js`

- [ ] **Step 1: Write failing contract tests**

Append to `tests/dataContracts.test.js`:

```js
import {
  createSessionCovenant
} from '../src/sessionCovenant.js';
```

If the file already has the contract imports block, add these names to it:

```js
validateEchoTrace,
validatePassage,
validateSessionCovenant
```

Add these tests:

```js
test('session covenant validation accepts bounded session preferences', () => {
  const result = validateSessionCovenant(createSessionCovenant({
    toneTags: ['strange', 'dark'],
    intensityCeiling: 0.6,
    hardBoundaryTags: ['body_horror'],
    softBoundaryTags: ['teeth'],
    allowedPressureTags: ['shadow'],
    returnAnchor: { kind: 'image', value: 'small lamp' }
  }));

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('session covenant validation rejects raw speech fields', () => {
  const result = validateSessionCovenant({
    ...createSessionCovenant(),
    rawSpeech: ['I should not be stored']
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ['covenant.rawSpeech is not allowed']);
});

test('Passage validation accepts dream-native content contracts', () => {
  const result = validatePassage({
    schema: 'PassageV1',
    schemaVersion: 1,
    id: 'door_breathing_low',
    motifs: ['door', 'breath', 'threshold'],
    pressureTags: ['unknown', 'invitation'],
    formTags: ['locked_door'],
    intensityBand: 'strange',
    allowedResponseKinds: ['approach', 'speak'],
    returnAnchorTags: ['lamp'],
    variationFamily: 'threshold_doors',
    baseWeight: 1
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('EchoTrace validation accepts compact symbolic observation', () => {
  const result = validateEchoTrace({
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: 'door_breathing_low',
    motifsTouched: ['door', 'breath', 'threshold'],
    gestureTags: ['spoke_before_touching', 'speak'],
    tempo: 'hesitant_then_committed',
    pressureAccepted: 0.42,
    returnAnchorUsed: false,
    boundarySignals: ['long_pause'],
    dreamflowDeltas: {}
  });

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('session bundle validation checks optional covenant and Passage context', () => {
  const result = validateSessionBundle({
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    coherence: 0.5,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal'],
    recentActions: ['open_portal'],
    roomConfigSnapshot: { awakened: true },
    archetypeVector: { Seeker: 1 },
    sessionCovenant: {
      ...createSessionCovenant(),
      intensityCeiling: 3
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    'sessionCovenant.intensityCeiling must be between 0 and 1'
  ]);
});
```

- [ ] **Step 2: Run contract tests and verify failure**

Run:

```powershell
node --test --test-concurrency=1 tests/dataContracts.test.js
```

Expected: FAIL because the validators do not exist yet.

- [ ] **Step 3: Add JSON schemas**

Create `data/schemas/session_covenant.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://jungial.local/schemas/session_covenant.schema.json",
  "title": "SessionCovenantV1",
  "type": "object",
  "required": ["schema", "schemaVersion", "mode", "toneTags", "intensityCeiling", "hardBoundaryTags", "softBoundaryTags", "allowedPressureTags", "returnAnchor", "groundingPreference", "memoryScope"],
  "properties": {
    "schema": { "const": "SessionCovenantV1" },
    "schemaVersion": { "const": 1 },
    "mode": { "enum": ["first_listening", "tonight_shape"] },
    "toneTags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "intensityCeiling": { "type": "number", "minimum": 0, "maximum": 1 },
    "hardBoundaryTags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "softBoundaryTags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "allowedPressureTags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "returnAnchor": {
      "type": "object",
      "required": ["kind", "value"],
      "properties": {
        "kind": { "type": "string", "minLength": 1 },
        "value": { "type": "string", "minLength": 1 }
      },
      "additionalProperties": false
    },
    "groundingPreference": { "type": "string", "minLength": 1 },
    "memoryScope": { "enum": ["session_only", "profile_aggregate"] }
  },
  "additionalProperties": false
}
```

Create `data/schemas/passage.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://jungial.local/schemas/passage.schema.json",
  "title": "PassageV1",
  "type": "object",
  "required": ["schema", "schemaVersion", "id", "motifs", "pressureTags", "formTags", "intensityBand", "allowedResponseKinds", "returnAnchorTags", "variationFamily", "baseWeight"],
  "properties": {
    "schema": { "const": "PassageV1" },
    "schemaVersion": { "const": 1 },
    "id": { "type": "string", "minLength": 1 },
    "motifs": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "pressureTags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "formTags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "intensityBand": { "enum": ["gentle", "strange", "dark", "horrific", "abyssal"] },
    "allowedResponseKinds": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "returnAnchorTags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "variationFamily": { "type": "string", "minLength": 1 },
    "baseWeight": { "type": "number", "exclusiveMinimum": 0 }
  },
  "additionalProperties": false
}
```

Create `data/schemas/echo_trace.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://jungial.local/schemas/echo_trace.schema.json",
  "title": "EchoTraceV1",
  "type": "object",
  "required": ["schema", "schemaVersion", "passageId", "motifsTouched", "gestureTags", "tempo", "pressureAccepted", "returnAnchorUsed", "boundarySignals", "dreamflowDeltas"],
  "properties": {
    "schema": { "const": "EchoTraceV1" },
    "schemaVersion": { "const": 1 },
    "passageId": { "type": "string", "minLength": 1 },
    "motifsTouched": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "gestureTags": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "tempo": { "type": "string", "minLength": 1 },
    "pressureAccepted": { "type": "number", "minimum": 0, "maximum": 1 },
    "returnAnchorUsed": { "type": "boolean" },
    "boundarySignals": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "dreamflowDeltas": { "type": "object", "additionalProperties": { "type": "number" } }
  },
  "additionalProperties": false
}
```

- [ ] **Step 4: Implement validators**

Modify `src/contracts.js` by adding exports:

```js
export function validateSessionCovenant(covenant) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'mode',
    'toneTags',
    'intensityCeiling',
    'hardBoundaryTags',
    'softBoundaryTags',
    'allowedPressureTags',
    'returnAnchor',
    'groundingPreference',
    'memoryScope'
  ];

  if (covenant?.schema !== 'SessionCovenantV1') {
    errors.push('schema must be SessionCovenantV1');
  }
  if (covenant?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(covenant, allowedKeys, 'covenant'));
  if (!['first_listening', 'tonight_shape'].includes(covenant?.mode)) {
    errors.push('mode must be first_listening or tonight_shape');
  }
  for (const key of ['toneTags', 'hardBoundaryTags', 'softBoundaryTags', 'allowedPressureTags']) {
    errors.push(...validateStringList(covenant?.[key], key));
  }
  if (!Number.isFinite(covenant?.intensityCeiling) || covenant.intensityCeiling < 0 || covenant.intensityCeiling > 1) {
    errors.push('intensityCeiling must be between 0 and 1');
  }
  if (!isObject(covenant?.returnAnchor)) {
    errors.push('returnAnchor must be an object');
  } else {
    if (!isNonEmptyString(covenant.returnAnchor.kind)) {
      errors.push('returnAnchor.kind is required');
    }
    if (!isNonEmptyString(covenant.returnAnchor.value)) {
      errors.push('returnAnchor.value is required');
    }
  }
  if (!isNonEmptyString(covenant?.groundingPreference)) {
    errors.push('groundingPreference is required');
  }
  if (!['session_only', 'profile_aggregate'].includes(covenant?.memoryScope)) {
    errors.push('memoryScope must be session_only or profile_aggregate');
  }

  return { valid: errors.length === 0, errors };
}

export function validatePassage(passage) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'id',
    'motifs',
    'pressureTags',
    'formTags',
    'intensityBand',
    'allowedResponseKinds',
    'returnAnchorTags',
    'variationFamily',
    'baseWeight'
  ];

  if (passage?.schema !== 'PassageV1') {
    errors.push('schema must be PassageV1');
  }
  if (passage?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(passage, allowedKeys, 'passage'));
  if (!isNonEmptyString(passage?.id)) {
    errors.push('id is required');
  }
  for (const key of ['motifs', 'pressureTags', 'formTags', 'allowedResponseKinds', 'returnAnchorTags']) {
    errors.push(...validateStringList(passage?.[key], key));
  }
  if (!['gentle', 'strange', 'dark', 'horrific', 'abyssal'].includes(passage?.intensityBand)) {
    errors.push('intensityBand is unsupported');
  }
  if (!isNonEmptyString(passage?.variationFamily)) {
    errors.push('variationFamily is required');
  }
  if (!Number.isFinite(passage?.baseWeight) || passage.baseWeight <= 0) {
    errors.push('baseWeight must be positive');
  }

  return { valid: errors.length === 0, errors };
}

export function validateEchoTrace(trace) {
  const errors = [];
  const allowedKeys = [
    'schema',
    'schemaVersion',
    'passageId',
    'motifsTouched',
    'gestureTags',
    'tempo',
    'pressureAccepted',
    'returnAnchorUsed',
    'boundarySignals',
    'dreamflowDeltas'
  ];

  if (trace?.schema !== 'EchoTraceV1') {
    errors.push('schema must be EchoTraceV1');
  }
  if (trace?.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1');
  }
  errors.push(...validateKnownKeys(trace, allowedKeys, 'echoTrace'));
  if (!isNonEmptyString(trace?.passageId)) {
    errors.push('passageId is required');
  }
  for (const key of ['motifsTouched', 'gestureTags', 'boundarySignals']) {
    errors.push(...validateStringList(trace?.[key], key));
  }
  if (!isNonEmptyString(trace?.tempo)) {
    errors.push('tempo is required');
  }
  if (!Number.isFinite(trace?.pressureAccepted) || trace.pressureAccepted < 0 || trace.pressureAccepted > 1) {
    errors.push('pressureAccepted must be between 0 and 1');
  }
  if (typeof trace?.returnAnchorUsed !== 'boolean') {
    errors.push('returnAnchorUsed must be a boolean');
  }
  errors.push(...validateOptionalNumberMap(trace?.dreamflowDeltas, 'dreamflowDeltas', {
    min: -1,
    max: 1
  }));

  return { valid: errors.length === 0, errors };
}
```

Modify `validateSessionBundle()`:

```js
if (bundle?.sessionCovenant !== undefined) {
  const covenantValidation = validateSessionCovenant(bundle.sessionCovenant);
  if (!covenantValidation.valid) {
    errors.push(...covenantValidation.errors.map((error) => `sessionCovenant.${error}`));
  }
}
if (bundle?.passageContext !== undefined) {
  if (!isObject(bundle.passageContext)) {
    errors.push('passageContext must be an object');
  } else {
    if (!Array.isArray(bundle.passageContext.recentMotifs)) {
      errors.push('passageContext.recentMotifs must be an array');
    }
    if (!Array.isArray(bundle.passageContext.recentGestureTags)) {
      errors.push('passageContext.recentGestureTags must be an array');
    }
  }
}
```

Modify `validateSaveGame()`:

```js
errors.push(...validateOptionalNestedContract(
  saveGame.payload.sessionCovenant,
  'payload.sessionCovenant',
  validateSessionCovenant
));
if (saveGame.payload.echoTrace !== undefined) {
  errors.push(...validateOptionalNestedContract(
    saveGame.payload.echoTrace,
    'payload.echoTrace',
    validateEchoTrace
  ));
}
```

- [ ] **Step 5: Route contract validator**

Modify `src/contractValidator.js` imports and switch:

```js
validateEchoTrace,
validatePassage,
validateSessionCovenant,
```

```js
case 'SessionCovenantV1':
  return validateSessionCovenant(document);
case 'PassageV1':
  return validatePassage(document);
case 'EchoTraceV1':
  return validateEchoTrace(document);
```

- [ ] **Step 6: Update session/save schemas**

In `data/schemas/session_bundle.schema.json`, add properties:

```json
"sessionCovenant": { "$ref": "session_covenant.schema.json" },
"passageContext": {
  "type": "object",
  "properties": {
    "recentMotifs": { "type": "array", "items": { "type": "string" } },
    "recentGestureTags": { "type": "array", "items": { "type": "string" } },
    "activePassageId": { "type": ["string", "null"] },
    "echoThreadIds": { "type": "array", "items": { "type": "string" } }
  },
  "additionalProperties": false
}
```

In `data/schemas/save_game.schema.json`, add optional payload properties:

```json
"sessionCovenant": { "$ref": "session_covenant.schema.json" },
"echoTrace": { "$ref": "echo_trace.schema.json" }
```

- [ ] **Step 7: Run contract tests**

Run:

```powershell
node --test --test-concurrency=1 tests/dataContracts.test.js tests/contractValidator.test.js
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add data/schemas/session_covenant.schema.json data/schemas/passage.schema.json data/schemas/echo_trace.schema.json data/schemas/session_bundle.schema.json data/schemas/save_game.schema.json src/contracts.js src/contractValidator.js tests/dataContracts.test.js tests/contractValidator.test.js
git commit -m "feat: validate covenant Passage and echo contracts"
```

---

### Task 4: Variation Lattice And EchoTrace

**Files:**
- Create: `src/passageLattice.js`
- Test: `tests/passageLattice.test.js`

- [ ] **Step 1: Write failing lattice tests**

Create `tests/passageLattice.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

import { createSessionCovenant } from '../src/sessionCovenant.js';
import {
  createEchoTrace,
  fibonacciSchedule,
  selectPassage,
  toGniPassageContext
} from '../src/passageLattice.js';

const passages = [
  {
    schema: 'PassageV1',
    schemaVersion: 1,
    id: 'door_breathing_low',
    motifs: ['door', 'breath', 'threshold'],
    pressureTags: ['unknown', 'invitation'],
    formTags: ['locked_door'],
    intensityBand: 'strange',
    allowedResponseKinds: ['approach', 'speak'],
    returnAnchorTags: ['lamp'],
    variationFamily: 'threshold_doors',
    baseWeight: 1
  },
  {
    schema: 'PassageV1',
    schemaVersion: 1,
    id: 'black_star_silence',
    motifs: ['star', 'void', 'silence'],
    pressureTags: ['annihilation', 'cosmic_mystery'],
    formTags: ['black_star'],
    intensityBand: 'horrific',
    allowedResponseKinds: ['approach', 'withdraw'],
    returnAnchorTags: ['lamp'],
    variationFamily: 'cosmic_thresholds',
    baseWeight: 1
  }
];

test('fibonacci schedule returns recurrence intervals for EchoThreads', () => {
  assert.deepEqual(fibonacciSchedule(7), [1, 2, 3, 5, 8, 13, 21]);
});

test('selection excludes hard boundaries and respects intensity ceiling', () => {
  const covenant = createSessionCovenant({
    toneTags: ['strange'],
    intensityCeiling: 0.45,
    hardBoundaryTags: ['annihilation']
  });
  const result = selectPassage({
    passages,
    covenant,
    seed: 5,
    recentEchoTraces: []
  });

  assert.equal(result.passage.id, 'door_breathing_low');
  assert.ok(result.candidates.every((candidate) => candidate.id !== 'black_star_silence'));
});

test('selection suppresses recent exact Passage repeats', () => {
  const covenant = createSessionCovenant({
    toneTags: ['horrific'],
    intensityCeiling: 1
  });
  const result = selectPassage({
    passages,
    covenant,
    seed: 5,
    recentEchoTraces: [
      { passageId: 'door_breathing_low', motifsTouched: ['door'], gestureTags: [], boundarySignals: [] }
    ]
  });

  assert.equal(result.passage.id, 'black_star_silence');
});

test('EchoTrace captures symbolic response without raw speech', () => {
  const trace = createEchoTrace({
    passage: passages[0],
    response: {
      kind: 'speak',
      rawSpeech: 'please do not store this',
      gestureTags: ['spoke_before_touching'],
      tempo: 'hesitant_then_committed',
      pressureAccepted: 0.42,
      returnAnchorUsed: false,
      boundarySignals: ['long_pause']
    }
  });

  assert.deepEqual(trace, {
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: 'door_breathing_low',
    motifsTouched: ['door', 'breath', 'threshold'],
    gestureTags: ['spoke_before_touching', 'speak'],
    tempo: 'hesitant_then_committed',
    pressureAccepted: 0.42,
    returnAnchorUsed: false,
    boundarySignals: ['long_pause'],
    dreamflowDeltas: {}
  });
});

test('GNI Passage context is compact and redacted', () => {
  const trace = createEchoTrace({
    passage: passages[0],
    response: { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.5 }
  });

  assert.deepEqual(toGniPassageContext({
    activePassage: passages[0],
    recentEchoTraces: [trace]
  }), {
    schema: 'PassageContextV1',
    schemaVersion: 1,
    activePassageId: 'door_breathing_low',
    recentMotifs: ['door', 'breath', 'threshold'],
    recentGestureTags: ['approached', 'approach'],
    echoThreadIds: []
  });
});
```

- [ ] **Step 2: Run lattice tests and verify failure**

Run:

```powershell
node --test --test-concurrency=1 tests/passageLattice.test.js
```

Expected: FAIL with module not found for `../src/passageLattice.js`.

- [ ] **Step 3: Implement the lattice module**

Create `src/passageLattice.js`:

```js
import { SeededRandom } from './random.js';

const BAND_CEILINGS = Object.freeze({
  gentle: 0.25,
  strange: 0.45,
  dark: 0.62,
  horrific: 0.78,
  abyssal: 0.92
});

export function fibonacciSchedule(length = 6) {
  const schedule = [];
  let previous = 1;
  let current = 2;
  while (schedule.length < length) {
    schedule.push(previous);
    [previous, current] = [current, previous + current];
  }
  return schedule;
}

export function selectPassage({
  passages,
  covenant,
  seed,
  recentEchoTraces = [],
  dreamerMemoryContext = null,
  architectState = null
} = {}) {
  const normalizedPassages = passages.map(normalizePassageForSelection);
  const recentIds = new Set(recentEchoTraces.slice(-4).map((trace) => trace.passageId));
  const recentForms = new Set(recentEchoTraces.slice(-4).flatMap((trace) => trace.formTags ?? []));
  const hardBoundaries = new Set(covenant?.hardBoundaryTags ?? []);
  const softBoundaries = new Set(covenant?.softBoundaryTags ?? []);
  const ceiling = covenant?.intensityCeiling ?? 0.35;
  const rng = new SeededRandom(seed);

  let candidates = normalizedPassages
    .filter((passage) => !recentIds.has(passage.id))
    .filter((passage) => passageAllowedByCeiling(passage, ceiling))
    .filter((passage) => !passage.pressureTags.some((tag) => hardBoundaries.has(tag)))
    .map((passage) => ({
      ...passage,
      selectionWeight: scorePassage(passage, { covenant, softBoundaries, recentForms, dreamerMemoryContext, architectState })
    }))
    .filter((passage) => passage.selectionWeight > 0);

  if (candidates.length === 0) {
    candidates = normalizedPassages
      .filter((passage) => passageAllowedByCeiling(passage, ceiling))
      .filter((passage) => !passage.pressureTags.some((tag) => hardBoundaries.has(tag)))
      .map((passage) => ({ ...passage, selectionWeight: Math.max(0.05, passage.baseWeight) }));
  }

  const picked = rng.pickWeighted(candidates, (passage) => passage.selectionWeight).item ?? normalizedPassages[0];
  return {
    passage: stripSelectionWeight(picked),
    candidates: candidates.map(stripSelectionWeight)
  };
}

export function createEchoTrace({ passage, response = {}, dreamflowDeltas = {} } = {}) {
  const gestureTags = normalizeTags([...(response.gestureTags ?? []), response.kind]);
  return {
    schema: 'EchoTraceV1',
    schemaVersion: 1,
    passageId: passage.id,
    motifsTouched: normalizeTags(response.motifsTouched?.length ? response.motifsTouched : passage.motifs),
    gestureTags,
    tempo: normalizeToken(response.tempo) || 'unhurried',
    pressureAccepted: clamp01(response.pressureAccepted ?? inferPressureAccepted(response.kind)),
    returnAnchorUsed: Boolean(response.returnAnchorUsed),
    boundarySignals: normalizeTags(response.boundarySignals),
    dreamflowDeltas: normalizeNumberMap(dreamflowDeltas)
  };
}

export function toGniPassageContext({ activePassage = null, recentEchoTraces = [], echoThreadIds = [] } = {}) {
  return {
    schema: 'PassageContextV1',
    schemaVersion: 1,
    activePassageId: activePassage?.id ?? null,
    recentMotifs: unique(recentEchoTraces.flatMap((trace) => trace.motifsTouched ?? [])).slice(0, 12),
    recentGestureTags: unique(recentEchoTraces.flatMap((trace) => trace.gestureTags ?? [])).slice(0, 12),
    echoThreadIds: unique(echoThreadIds).slice(0, 8)
  };
}

function scorePassage(passage, { covenant, softBoundaries, recentForms, dreamerMemoryContext, architectState }) {
  let weight = passage.baseWeight;
  if (passage.pressureTags.some((tag) => softBoundaries.has(tag))) {
    weight *= 0.35;
  }
  if (passage.formTags.some((tag) => recentForms.has(tag))) {
    weight *= 0.4;
  }
  for (const tone of covenant?.toneTags ?? []) {
    if (passage.pressureTags.includes(tone) || passage.motifs.includes(tone)) {
      weight += 0.25;
    }
  }
  for (const motif of dreamerMemoryContext?.strongSymbols ?? []) {
    if (passage.motifs.includes(motif)) {
      weight += 0.1;
    }
  }
  for (const [key, value] of Object.entries(architectState?.futureDreamModuleWeights ?? {})) {
    const symbol = key.startsWith('symbol:') ? key.slice('symbol:'.length) : key;
    if (passage.motifs.includes(symbol) && Number.isFinite(value)) {
      weight += Math.min(0.3, value * 0.05);
    }
  }
  return Number(Math.max(0, weight).toFixed(3));
}

function passageAllowedByCeiling(passage, ceiling) {
  return (BAND_CEILINGS[passage.intensityBand] ?? 0.45) <= ceiling + 0.001;
}

function normalizePassageForSelection(passage) {
  return {
    schema: passage.schema ?? 'PassageV1',
    schemaVersion: passage.schemaVersion ?? 1,
    id: passage.id,
    motifs: [...(passage.motifs ?? [])],
    pressureTags: [...(passage.pressureTags ?? [])],
    formTags: [...(passage.formTags ?? [])],
    intensityBand: passage.intensityBand ?? 'strange',
    allowedResponseKinds: [...(passage.allowedResponseKinds ?? [])],
    returnAnchorTags: [...(passage.returnAnchorTags ?? [])],
    variationFamily: passage.variationFamily,
    baseWeight: passage.baseWeight ?? 1
  };
}

function stripSelectionWeight(passage) {
  const { selectionWeight, ...rest } = passage;
  return rest;
}

function inferPressureAccepted(kind) {
  if (kind === 'withdraw' || kind === 'return_anchor') {
    return 0.15;
  }
  if (kind === 'wait') {
    return 0.3;
  }
  return 0.5;
}

function normalizeNumberMap(input = {}) {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => Number.isFinite(value))
      .map(([key, value]) => [key, Number(Math.max(-1, Math.min(1, value)).toFixed(3))])
  );
}

function normalizeTags(tags = []) {
  return unique((Array.isArray(tags) ? tags : [])
    .map(normalizeToken)
    .filter(Boolean));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeToken(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    : '';
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(Number(value).toFixed(3))));
}
```

- [ ] **Step 4: Run lattice and contract tests**

Run:

```powershell
node --test --test-concurrency=1 tests/passageLattice.test.js tests/dataContracts.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/passageLattice.js tests/passageLattice.test.js
git commit -m "feat: add Passage variation lattice"
```

---

### Task 5: Dreamer Profile Echo Aggregates

**Files:**
- Modify: `src/dreamerProfile.js`
- Modify: `data/schemas/dreamer_profile.schema.json`
- Modify: `data/schemas/dreamer_memory_context.schema.json`
- Modify: `src/contracts.js`
- Test: `tests/dreamerProfile.test.js`
- Test: `tests/dataContracts.test.js`

- [ ] **Step 1: Write failing DreamerProfile tests**

Append to `tests/dreamerProfile.test.js`:

```js
test('Dreamer profile records Passage motifs and gestures as aggregates only', () => {
  const profile = new DreamerProfile({
    profileId: 'dreamer-one',
    rootSeed: 'root-one'
  });

  const snapshot = profile.recordSession({
    sessionBundle: validSessionBundle(),
    echoTrace: {
      schema: 'EchoTraceV1',
      schemaVersion: 1,
      passageId: 'door_breathing_low',
      motifsTouched: ['door', 'threshold'],
      gestureTags: ['approach', 'speak'],
      tempo: 'hesitant_then_committed',
      pressureAccepted: 0.42,
      returnAnchorUsed: false,
      boundarySignals: ['long_pause'],
      dreamflowDeltas: {}
    }
  });

  assert.equal(snapshot.memory.passages.door_breathing_low.count, 1);
  assert.equal(snapshot.memory.motifs.door.count, 1);
  assert.equal(snapshot.memory.gestures.speak.count, 1);
  assert.equal(JSON.stringify(snapshot).includes('rawSpeech'), false);
  assert.deepEqual(profile.toGniMemoryContext({ slotId: 'slot-a' }).familiarMotifs, ['door', 'threshold']);
});
```

If `validSessionBundle()` does not already exist in the file, add:

```js
function validSessionBundle() {
  return {
    schema: 'SessionBundleV1',
    schemaVersion: 1,
    sessionId: 'session-one',
    dominantArchetype: 'Seeker',
    coherence: 0.6,
    vibeState: 'calm_hopeful_boundless_bright_warm',
    recentSymbols: ['portal'],
    recentActions: ['open_portal'],
    roomConfigSnapshot: { portalOpen: true },
    selectedDream: { id: 'garden', symbolicTags: ['growth'] },
    archetypeVector: { Seeker: 1 }
  };
}
```

- [ ] **Step 2: Run DreamerProfile tests and verify failure**

Run:

```powershell
node --test --test-concurrency=1 tests/dreamerProfile.test.js
```

Expected: FAIL because `memory.passages`, `memory.motifs`, and `memory.gestures` are undefined.

- [ ] **Step 3: Extend DreamerProfile memory**

Modify `src/dreamerProfile.js` constructor memory object:

```js
passages: cloneMap(snapshot.memory?.passages),
motifs: cloneMap(snapshot.memory?.motifs),
gestures: cloneMap(snapshot.memory?.gestures),
echoThreads: cloneMap(snapshot.memory?.echoThreads),
```

Modify `recordSession()` signature:

```js
recordSession({ sessionBundle, dreamJourney = null, mask = null, echoTrace = null } = {}) {
```

Inside `recordSession()` after vibe state recording:

```js
if (echoTrace?.passageId) {
  incrementMemory(this.memory.passages, echoTrace.passageId, { at });
}
for (const motif of echoTrace?.motifsTouched ?? []) {
  incrementMemory(this.memory.motifs, motif, { at });
}
for (const gesture of echoTrace?.gestureTags ?? []) {
  incrementMemory(this.memory.gestures, gesture, { at });
}
```

Add to `lastSessionDigest`:

```js
echoTrace: echoTrace
  ? {
      passageId: echoTrace.passageId,
      motifsTouched: echoTrace.motifsTouched,
      gestureTags: echoTrace.gestureTags,
      boundarySignals: echoTrace.boundarySignals
    }
  : null
```

Add to `toGniMemoryContext()`:

```js
familiarPassages: topKeys(this.memory.passages, limit),
familiarMotifs: topKeys(this.memory.motifs, limit),
familiarGestures: topKeys(this.memory.gestures, limit),
echoThreadIds: topKeys(this.memory.echoThreads, limit),
```

Add to `snapshot().memory`:

```js
passages: cloneMap(this.memory.passages),
motifs: cloneMap(this.memory.motifs),
gestures: cloneMap(this.memory.gestures),
echoThreads: cloneMap(this.memory.echoThreads),
```

- [ ] **Step 4: Update validators and schemas**

In `src/contracts.js`, add the new memory keys to `validateDreamerProfile()`:

```js
'passages',
'motifs',
'gestures',
'echoThreads',
```

And validate them:

```js
errors.push(...validateMemoryMap(profile.memory.passages, 'memory.passages'));
errors.push(...validateMemoryMap(profile.memory.motifs, 'memory.motifs'));
errors.push(...validateMemoryMap(profile.memory.gestures, 'memory.gestures'));
errors.push(...validateMemoryMap(profile.memory.echoThreads, 'memory.echoThreads'));
```

In `validateDreamerMemoryContext()`, include required lists:

```js
'familiarPassages',
'familiarMotifs',
'familiarGestures',
'echoThreadIds'
```

Update `data/schemas/dreamer_profile.schema.json` required memory list and properties:

```json
"passages": { "$ref": "#/$defs/memoryMap" },
"motifs": { "$ref": "#/$defs/memoryMap" },
"gestures": { "$ref": "#/$defs/memoryMap" },
"echoThreads": { "$ref": "#/$defs/memoryMap" }
```

Update `data/schemas/dreamer_memory_context.schema.json` properties:

```json
"familiarPassages": { "type": "array", "items": { "type": "string" } },
"familiarMotifs": { "type": "array", "items": { "type": "string" } },
"familiarGestures": { "type": "array", "items": { "type": "string" } },
"echoThreadIds": { "type": "array", "items": { "type": "string" } }
```

- [ ] **Step 5: Run profile and contract tests**

Run:

```powershell
node --test --test-concurrency=1 tests/dreamerProfile.test.js tests/dataContracts.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/dreamerProfile.js src/contracts.js data/schemas/dreamer_profile.schema.json data/schemas/dreamer_memory_context.schema.json tests/dreamerProfile.test.js tests/dataContracts.test.js
git commit -m "feat: remember Passage echoes as aggregates"
```

---

### Task 6: Simulation And GNI Integration

**Files:**
- Modify: `src/ai.js`
- Modify: `src/simulation.js`
- Modify: `tests/simulationHarness.test.js`

- [ ] **Step 1: Write failing simulation integration test**

Append to `tests/simulationHarness.test.js`:

```js
test('simulation saves covenant EchoTrace and sends redacted Passage context to GNI', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'jungial-passage-sim-'));
  const savePath = join(dir, 'session.json');
  const requests = [];

  try {
    const result = await runSimulation({
      seed: 777,
      savePath,
      sessionCovenant: {
        toneTags: ['strange', 'dark'],
        intensityCeiling: 0.62,
        softBoundaryTags: ['teeth']
      },
      passageResponse: {
        kind: 'speak',
        rawSpeech: 'this should not be sent',
        gestureTags: ['spoke_before_touching'],
        pressureAccepted: 0.42
      },
      gniProvider: {
        async processRequest(request) {
          requests.push(request);
          return null;
        }
      }
    });
    const saved = await loadGameState(savePath);

    assert.equal(result.sessionCovenant.schema, 'SessionCovenantV1');
    assert.equal(result.echoTrace.schema, 'EchoTraceV1');
    assert.equal(saved.sessionCovenant.schema, 'SessionCovenantV1');
    assert.equal(saved.echoTrace.schema, 'EchoTraceV1');
    assert.equal(requests[0].payload.sessionCovenant.schema, 'SessionCovenantV1');
    assert.equal(requests[0].payload.passageContext.schema, 'PassageContextV1');
    assert.equal(JSON.stringify(requests[0]).includes('this should not be sent'), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run simulation tests and verify failure**

Run:

```powershell
node --test --test-concurrency=1 tests/simulationHarness.test.js
```

Expected: FAIL because `sessionCovenant`, `passageResponse`, and `echoTrace` are not wired yet.

- [ ] **Step 3: Copy covenant and Passage context through GNI request**

Modify `src/ai.js` inside `GniAdapter.createProcessingRequest()` payload:

```js
...(sessionBundle.sessionCovenant
  ? { sessionCovenant: structuredClone(sessionBundle.sessionCovenant) }
  : {}),
...(sessionBundle.passageContext
  ? { passageContext: structuredClone(sessionBundle.passageContext) }
  : {}),
```

- [ ] **Step 4: Run one Passage in simulation**

Modify `src/simulation.js` imports:

```js
import { createSessionCovenant } from './sessionCovenant.js';
import { createEchoTrace, selectPassage, toGniPassageContext } from './passageLattice.js';
```

Modify `runSimulation()` parameters:

```js
sessionCovenant = null,
passageResponse = null,
recentEchoTraces = []
```

Modify the `createJungialRuntime()` service destructuring in `src/simulation.js` so it captures the normalized content catalog:

```js
const {
  catalog: contentCatalog,
  archetypes,
  feeling,
  chamber,
  witness,
  architect,
  dreamflow,
  journal,
  masks,
  gni,
  gniQueue
} = createJungialRuntime({ seed, catalog, clock });
```

After runtime creation and before dream journey selection:

```js
const activeSessionCovenant = createSessionCovenant(sessionCovenant ?? {});
const passageSelection = selectPassage({
  passages: contentCatalog.passages,
  covenant: activeSessionCovenant,
  seed,
  recentEchoTraces,
  dreamerMemoryContext: dreamer?.toGniMemoryContext({ slotId: saveSlotId, mode: saveMode }) ?? null,
  architectState: architect.snapshot()
});
const activePassage = passageSelection.passage;
const echoTrace = createEchoTrace({
  passage: activePassage,
  response: passageResponse ?? { kind: 'approach', gestureTags: ['approached'], pressureAccepted: 0.4 }
});
transcript.push(`A Passage gathers: ${activePassage.id}.`);
traceRecorder.record('passage.gathered', {
  passageId: activePassage.id,
  motifs: activePassage.motifs,
  intensityBand: activePassage.intensityBand
});
traceRecorder.record('echo.trace.created', echoTrace);
```

Before GNI bridge processing, attach to bundle:

```js
bundle.sessionCovenant = activeSessionCovenant;
bundle.passageContext = toGniPassageContext({
  activePassage,
  recentEchoTraces: [...recentEchoTraces, echoTrace]
});
```

When recording DreamerProfile:

```js
const dreamerProfileSnapshot = dreamer
  ? dreamer.recordSession({ sessionBundle: bundle, dreamJourney, mask, echoTrace })
  : null;
```

When saving:

```js
sessionCovenant: activeSessionCovenant,
echoTrace,
activePassage,
```

When returning:

```js
sessionCovenant: activeSessionCovenant,
activePassage,
echoTrace,
```

- [ ] **Step 5: Run integration tests**

Run:

```powershell
node --test --test-concurrency=1 tests/simulationHarness.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/ai.js src/simulation.js tests/simulationHarness.test.js
git commit -m "feat: route Passage context through simulation"
```

---

### Task 7: Fixtures, Contracts Script, Docs, And Baselines

**Files:**
- Modify: `src/fixtureExporter.js`
- Modify: `tests/fixtureExporter.test.js`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `data/scenarios/smoke_baseline.json`

- [ ] **Step 1: Write failing fixture expectations**

Modify `tests/fixtureExporter.test.js` expected file list to include:

```js
'session_covenant_v1.json',
'passage_v1.json',
'echo_trace_v1.json',
```

Add assertions after fixture export:

```js
const covenant = JSON.parse(await readFile(join(outDir, 'session_covenant_v1.json'), 'utf8'));
const passage = JSON.parse(await readFile(join(outDir, 'passage_v1.json'), 'utf8'));
const echoTrace = JSON.parse(await readFile(join(outDir, 'echo_trace_v1.json'), 'utf8'));

assert.equal(covenant.schema, 'SessionCovenantV1');
assert.equal(passage.schema, 'PassageV1');
assert.equal(echoTrace.schema, 'EchoTraceV1');
```

- [ ] **Step 2: Run fixture tests and verify failure**

Run:

```powershell
node --test --test-concurrency=1 tests/fixtureExporter.test.js
```

Expected: FAIL because fixture exporter does not emit new fixtures.

- [ ] **Step 3: Export new fixtures**

Modify `src/fixtureExporter.js` `FIXTURE_FILES`:

```js
'session_covenant_v1.json',
'passage_v1.json',
'echo_trace_v1.json',
```

In `exportContractFixtures()`, after `const sessionBundle = run.gniRequest.payload;` add:

```js
const sessionCovenant = run.sessionCovenant;
const passage = run.activePassage;
const echoTrace = run.echoTrace;
```

Add payloads:

```js
'session_covenant_v1.json': sessionCovenant,
'passage_v1.json': passage,
'echo_trace_v1.json': echoTrace,
```

- [ ] **Step 4: Update package contract command**

Modify `package.json` `contracts` script to include:

```json
"fixtures/session_covenant_v1.json fixtures/passage_v1.json fixtures/echo_trace_v1.json"
```

Keep the existing fixture order stable and place the new fixtures after `fixtures/session_bundle_v1.json`.

- [ ] **Step 5: Update README**

In `README.md`, add the new schemas to the contract schema list:

```markdown
- `session_covenant.schema.json`
- `passage.schema.json`
- `echo_trace.schema.json`
```

Add a short section:

```markdown
## Session Covenant And Passages

`SessionCovenantV1` captures the current session's tone, intensity ceiling, boundaries, and return anchor. `PassageV1` is the dream-native adaptive fragment format, and `EchoTraceV1` records symbolic response patterns without raw speech.

The system can become strange, dark, or horrific when the covenant allows it, while exact Passage repeats and boundary violations are filtered before GNI or Dreamflow can use them.
```

- [ ] **Step 6: Run fixtures/contracts**

Run:

```powershell
npm run contracts
```

Expected: PASS and generated fixtures include the three new files.

- [ ] **Step 7: Refresh scenario baseline only if changed**

Run:

```powershell
npm run scenario:check
```

If it fails because the new Passage trace events changed deterministic hashes, inspect `saves/scenarios/scenario-report.json`. If the change is expected and only reflects the new Passage/EchoTrace events, run:

```powershell
npm run scenario:baseline
```

Expected: baseline is updated intentionally.

- [ ] **Step 8: Run full readiness**

Run:

```powershell
npm run ready
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/fixtureExporter.js tests/fixtureExporter.test.js package.json README.md data/scenarios/smoke_baseline.json
git commit -m "chore: export Passage contract fixtures"
```

---

### Task 8: Naming Guardrail

**Files:**
- Create: `tests/namingGuardrail.test.js`

- [ ] **Step 1: Add a guardrail test for forbidden runtime names**

Create `tests/namingGuardrail.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const forbidden = [
  /traumaTrial/i,
  /psychAssessment/i,
  /therapyEngine/i,
  /playerDiagnosis/i,
  /behaviorScore/i,
  /mirrorSession/i
];

const runtimeFiles = [
  'src/sessionCovenant.js',
  'src/passageLattice.js',
  'src/simulation.js',
  'src/ai.js',
  'src/dreamerProfile.js'
];

test('runtime naming stays dream-native for adaptive Passage systems', async () => {
  for (const file of runtimeFiles) {
    const text = await readFile(join(process.cwd(), file), 'utf8');
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${file} contains ${pattern}`);
    }
  }
});
```

- [ ] **Step 2: Run the guardrail test**

Run:

```powershell
node --test --test-concurrency=1 tests/namingGuardrail.test.js
```

Expected: PASS.

- [ ] **Step 3: Commit**

```powershell
git add tests/namingGuardrail.test.js
git commit -m "test: guard dream-native Passage naming"
```

---

## Final Verification

- [ ] Run all tests:

```powershell
npm test
```

Expected: all tests pass.

- [ ] Run content validation:

```powershell
npm run validate
```

Expected: catalog validation passes.

- [ ] Run contracts:

```powershell
npm run contracts
```

Expected: all fixture and contract files validate.

- [ ] Run scenario check:

```powershell
npm run scenario:check
```

Expected: scenario hashes match the committed baseline.

- [ ] Run full ready gate:

```powershell
npm run ready
```

Expected: test, validate, contracts, scenario check, and simulation all pass.

## Implementation Notes

- Keep raw speech out of long-term profile memory.
- Keep hard boundary filtering before weighted Passage selection.
- Keep GNI directives constrained by existing `JungialDirectiveV1`; do not add executable behavior.
- Keep exact Passage repeat suppression deterministic and covered by tests.
- Keep horror available through intensity and covenant settings, not hidden surprise escalation.
- If a step requires broad rewrites outside the listed files, stop and split the change into a new plan.
