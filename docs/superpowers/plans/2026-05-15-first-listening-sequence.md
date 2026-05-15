# First Listening Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first subtle pre-dream listening sequence that converts player reactions into a redacted session shape.

**Architecture:** Add a small `firstListening` module above input/archetype/feeling but below full dream session orchestration. It will run symbolic chamber beats, emit `ListeningBeatV1` records, derive a `SessionCovenantV1`, update only aggregate Dreamer Profile memory, and write developer trace events without exposing the mechanics in-world.

**Tech Stack:** Node.js ES modules, built-in `node:test`, existing input router, `SessionCovenantV1`, `DreamerProfileV1`, `TraceRecorder`, SaveGame persistence, and content validation patterns.

---

### Task 1: Data Model And Contract

**Files:**
- Create: `src/firstListening.js`
- Create: `tests/firstListening.test.js`
- Create: `data/schemas/first_listening.schema.json`
- Modify: `src/contracts.js`
- Modify: `src/contractValidator.js`
- Modify: `tests/dataContracts.test.js`
- Modify: `tests/contractValidator.test.js`

- [ ] **Step 1: Write failing tests for `ListeningBeatV1` and `FirstListeningRunV1`**

Create tests asserting:

- `ListeningBeatV1` stores beat id, symbolic object id, response kind, gesture tags, motif tags, pressure acceptance, and boundary signals.
- `FirstListeningRunV1` stores schema metadata, seed, beats, derived tone tags, intensity hint, return anchor hint, and redacted summary.
- Raw speech fields are rejected.

- [ ] **Step 2: Run contract tests and verify failure**

Run: `node --test --test-concurrency=1 tests/firstListening.test.js tests/dataContracts.test.js tests/contractValidator.test.js`

Expected: FAIL because the module and validators do not exist.

- [ ] **Step 3: Implement minimal model and validators**

Add constructors/helpers:

- `createListeningBeat(input)`
- `runFirstListeningSequence(input)`
- `deriveListeningSummary(run)`
- `validateFirstListeningRun(run)`

- [ ] **Step 4: Verify green**

Run the same targeted tests.

Expected: PASS.

### Task 2: Session Covenant Derivation

**Files:**
- Modify: `src/firstListening.js`
- Test: `tests/firstListening.test.js`

- [ ] **Step 1: Write failing derivation tests**

Assert that:

- approach/protect/open gestures nudge toward curious/deep tone tags.
- wait/withdraw/long pause lowers intensity ceiling.
- return-anchor gestures preserve a gentle return anchor.
- hard boundaries are inherited from explicit session settings, not inferred from raw speech.

- [ ] **Step 2: Implement `deriveSessionCovenantFromListening()`**

Return a valid `SessionCovenantV1` using existing `createSessionCovenant()`.

- [ ] **Step 3: Verify**

Run: `node --test --test-concurrency=1 tests/firstListening.test.js`

Expected: PASS.

### Task 3: Dreamer Profile Aggregate Update

**Files:**
- Modify: `src/firstListening.js`
- Test: `tests/firstListening.test.js`

- [ ] **Step 1: Write failing memory tests**

Assert that First Listening can update a `DreamerProfileV1` with symbols, motifs, gestures, and vibe echoes without storing raw response text.

- [ ] **Step 2: Implement aggregate update helper**

Add `recordFirstListeningToProfile({ profile, listeningRun, sessionBundleLike, clock })`.

- [ ] **Step 3: Verify**

Run: `node --test --test-concurrency=1 tests/firstListening.test.js`

Expected: PASS.

### Task 4: Simulation And Trace Integration

**Files:**
- Modify: `src/simulation.js`
- Modify: `src/dreamSessionSaveFlow.js`
- Test: `tests/simulationHarness.test.js`
- Test: `tests/dreamSessionSaveFlow.test.js`

- [ ] **Step 1: Write failing integration tests**

Assert that a simulation can optionally run First Listening before the portal opens and that trace output includes:

- `first.listening.started`
- `first.listening.beat.recorded`
- `first.listening.completed`

- [ ] **Step 2: Implement optional integration**

Add an option such as `firstListening: true` for programmatic calls and `--first-listening` for CLI paths.

- [ ] **Step 3: Verify**

Run targeted simulation and dream-session save-flow tests.

Expected: PASS.

### Task 5: Fixtures, README, And Readiness

**Files:**
- Modify: `src/fixtureExporter.js`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/dreamer-memory-and-safety.md`
- Test: `tests/fixtureExporter.test.js`

- [ ] **Step 1: Export First Listening fixture**

Add `first_listening_v1.json` to fixture export and contract validation.

- [ ] **Step 2: Document the feature**

Explain that First Listening is not presented as intake or assessment. It is a quiet chamber ritual that creates a redacted session shape.

- [ ] **Step 3: Run full readiness**

Run: `npm run ready`

Expected: PASS.

### Task 6: Commit

**Files:**
- All files changed above.

- [ ] **Step 1: Inspect diff**

Run: `git diff --check` and `git status --short`.

- [ ] **Step 2: Commit**

Run:

```powershell
git add .
git commit -m "feat: add first listening sequence"
```
