# Dream Session Checkpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic checkpoint/resume support for long continuous dream sessions.

**Architecture:** Extend `DreamSessionV1` with a compact Dreamflow runtime state and a `checkpoint` end reason. Add `DreamSessionCheckpointV1` as the SaveGame-ready pause packet, plus resume helpers that restore the dreamflow random state and append beats from `nextBeatIndex`.

**Tech Stack:** Node.js ES modules, built-in `node:test`, JSON schemas, existing Dream Session, Session Arc, Passage Lattice, Dream Weather, SaveGame, and fixture exporter.

---

### Task 1: Checkpoint Resume Behavior

**Files:**
- Modify: `src/dreamSession.js`
- Test: `tests/dreamSession.test.js`

- [x] **Step 1: Write failing resume parity test**

Add a test that runs five beats uninterrupted, runs two beats with `beatsToRun: 2`, creates a checkpoint, resumes the remaining three beats from a fresh runtime, and asserts the resumed session equals the uninterrupted session.

- [x] **Step 2: Run test to verify it fails**

Run: `node --test --test-concurrency=1 tests/dreamSession.test.js`

Expected: FAIL because checkpoint/resume helpers do not exist.

- [x] **Step 3: Implement minimal resume support**

Add `beatsToRun`, `existingBeats`, `startBeatIndex`, `dreamflowState`, `createDreamSessionCheckpoint()`, and `resumeDreamSessionFromRuntime()`. Restore `dreamflow.random.state` before continuing.

- [x] **Step 4: Run test to verify it passes**

Run: `node --test --test-concurrency=1 tests/dreamSession.test.js`

Expected: PASS.

### Task 2: Contracts And SaveGame

**Files:**
- Modify: `src/contracts.js`
- Modify: `src/contractValidator.js`
- Create: `data/schemas/dream_session_checkpoint.schema.json`
- Modify: `data/schemas/dream_session.schema.json`
- Modify: `data/schemas/save_game.schema.json`
- Test: `tests/dataContracts.test.js`
- Test: `tests/contractValidator.test.js`

- [x] **Step 1: Write failing contract tests**

Validate `DreamSessionCheckpointV1` directly and through an optional SaveGame payload field.

- [x] **Step 2: Run tests to verify failure**

Run: `node --test --test-concurrency=1 tests/dataContracts.test.js tests/contractValidator.test.js`

Expected: FAIL because the validator and schema route do not exist.

- [x] **Step 3: Implement validators and schemas**

Add `validateDreamflowRuntimeState()`, `validateDreamSessionCheckpoint()`, contract routing, schema files, and SaveGame optional field validation.

- [x] **Step 4: Run tests to verify pass**

Run: `node --test --test-concurrency=1 tests/dataContracts.test.js tests/contractValidator.test.js`

Expected: PASS.

### Task 3: Fixtures And UE5 Notes

**Files:**
- Modify: `src/fixtureExporter.js`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/ue5-vr-console-readiness.md`
- Modify: `UE5Port/JungialTypes.hpp`
- Test: `tests/fixtureExporter.test.js`
- Test: `tests/ue5PortDocs.test.js`

- [x] **Step 1: Export checkpoint fixture**

Add `dream_session_checkpoint_v1.json` beside `dream_session_v1.json`.

- [x] **Step 2: Document the UE5 port shape**

Add `FDreamflowRuntimeStateV1` and `FDreamSessionCheckpointV1` pseudocode, plus README notes.

- [x] **Step 3: Run full readiness**

Run: `npm run ready`

Expected: PASS across tests, content validation, contracts, scenario check, and simulation.
