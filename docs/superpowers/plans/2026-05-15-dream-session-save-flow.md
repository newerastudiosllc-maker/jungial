# Dream Session Save Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a callable SaveGame flow for pausing and resuming long continuous dream sessions.

**Architecture:** Create `src/dreamSessionSaveFlow.js` as an orchestration layer over existing deterministic dream-session helpers. It will prepare a runtime, save `DreamSessionCheckpointV1`, reload from SaveGame, resume the session, then write return-only side effects once the dream completes.

**Tech Stack:** Node.js ES modules, built-in `node:test`, existing `persistence`, `runtime`, `dreamSession`, `library`, `presentation`, `passageLattice`, `dreamWeather`, and `symbolGrammar` modules.

---

### Task 1: Save And Resume Contract Tests

**Files:**
- Create: `tests/dreamSessionSaveFlow.test.js`
- Create: `src/dreamSessionSaveFlow.js`

- [x] **Step 1: Write failing tests**

Add tests that call:

```js
await startDreamSessionCheckpointRun({
  seed: 606,
  savePath,
  maxBeats: 5,
  checkpointAfterBeats: 2,
  responses,
  clock
});

await resumeDreamSessionCheckpointRun({
  savePath,
  outputPath,
  responses: returnResponses,
  clock
});
```

Assert the checkpoint save contains `DreamSessionCheckpointV1`, no raw response text, zero journal entries before return, one journal entry after return, updated ArchitectState, and `lastSessionBundle.schema === 'SessionBundleV1'`.

- [x] **Step 2: Verify red**

Run: `node --test --test-concurrency=1 tests/dreamSessionSaveFlow.test.js`

Expected: FAIL with module/function missing.

- [x] **Step 3: Implement minimal orchestration**

Create `startDreamSessionCheckpointRun()` and `resumeDreamSessionCheckpointRun()` in `src/dreamSessionSaveFlow.js`. Use `saveGameState()` and `loadGameState()` for persistence and `createJungialRuntimeFromSave()` for hydration.

- [x] **Step 4: Verify green**

Run: `node --test --test-concurrency=1 tests/dreamSessionSaveFlow.test.js`

Expected: PASS.

### Task 2: CLI And Documentation

**Files:**
- Modify: `src/dreamSessionSaveFlow.js`
- Modify: `package.json`
- Modify: `README.md`

- [x] **Step 1: Add script coverage test**

Extend the test to call `runDreamSessionCheckpointDemo()` directly and assert it returns checkpoint and final save paths plus a transcript.

- [x] **Step 2: Add CLI entrypoint**

Add argument parsing for:

```text
--seed=
--checkpoint-save=
--final-save=
--clock-start=
--clock-step-ms=
--json
```

Add `dream:checkpoint` to `package.json`.

- [x] **Step 3: Document the loop**

Add README instructions for `npm run dream:checkpoint`, what files it writes, and why raw player speech is not saved.

- [x] **Step 4: Run readiness**

Run: `npm run ready`

Expected: PASS.
