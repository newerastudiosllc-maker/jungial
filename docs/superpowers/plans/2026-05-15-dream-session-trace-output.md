# Dream Session Trace Output Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add developer trace output for the long dream session save/resume loop.

**Architecture:** Reuse `TraceRecorder`, `writeTrace()`, and existing `JungialTraceV1` events instead of inventing a second audit format. The checkpoint save stores the first half of the trace; resume hydrates that trace, appends return/GNI events, saves it into the final SaveGame, and optionally writes a standalone trace JSON file.

**Tech Stack:** Node.js ES modules, built-in `node:test`, existing trace recorder/inspector, dream session save-flow, and SaveGame persistence.

---

### Task 1: Trace Contract For Checkpoint And Resume

**Files:**
- Modify: `tests/dreamSessionSaveFlow.test.js`
- Modify: `src/dreamSessionSaveFlow.js`

- [x] **Step 1: Write failing trace test**

Add a test that runs `startDreamSessionCheckpointRun()` with raw response text, then `resumeDreamSessionCheckpointRun()` with `tracePath` and pending GNI. Assert the checkpoint save has `trace.schema === 'JungialTraceV1'`, final save trace includes checkpoint/resume/beat/journal/witness/GNI events, the standalone trace file equals the saved trace, and no raw text is present.

- [x] **Step 2: Verify red**

Run: `node --test --test-concurrency=1 tests/dreamSessionSaveFlow.test.js`

Expected: FAIL because the save-flow does not persist trace snapshots or parse `--trace=`.

- [x] **Step 3: Implement trace recording**

Import `TraceRecorder` and `writeTrace`. Record threshold events, per-beat events, checkpoint save, resume, completion, dream journey, journal, witness bundle, GNI bridge, queued requests, applied directives, and final save.

- [x] **Step 4: Verify green**

Run: `node --test --test-concurrency=1 tests/dreamSessionSaveFlow.test.js`

Expected: PASS.

### Task 2: README And Readiness

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-05-15-dream-session-trace-output.md`

- [x] **Step 1: Document trace usage**

Add `npm run dream:checkpoint -- --trace=saves/dream-session-trace.json` and point users at `npm run trace -- saves/dream-session-trace.json`.

- [x] **Step 2: Run readiness**

Run: `npm run ready`

Expected: PASS.
