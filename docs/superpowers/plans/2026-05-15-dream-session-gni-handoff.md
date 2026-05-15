# Dream Session GNI Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route completed long dream sessions through the same GNI bridge and pending queue used by one-shot simulations.

**Architecture:** Keep `dreamSession.js` pure. Extend `src/dreamSessionSaveFlow.js` so final return effects can optionally call `GniBridge`, apply ready directives through `ArchitectState`, or enqueue pending provider work in `GniDirectiveQueueV1` before saving.

**Tech Stack:** Node.js ES modules, built-in `node:test`, existing `GniBridge`, `GniHttpProvider`, `GniDirectiveQueue`, SaveGame persistence, and Dream Session save-flow tests.

---

### Task 1: Programmatic GNI Bridge On Final Return

**Files:**
- Modify: `tests/dreamSessionSaveFlow.test.js`
- Modify: `src/dreamSessionSaveFlow.js`

- [x] **Step 1: Write failing pending-provider test**

Add a test that starts a checkpoint, resumes with a provider returning `null`, and asserts the final save contains `pendingGniRequest`, `gniBridgeResult.status === 'provider_empty'`, and one pending queue item.

- [x] **Step 2: Verify red**

Run: `node --test --test-concurrency=1 tests/dreamSessionSaveFlow.test.js`

Expected: FAIL because `resumeDreamSessionCheckpointRun()` ignores `gniProvider`.

- [x] **Step 3: Implement GNI handoff**

Import `GniBridge`; call it after the return session bundle is built; enqueue pending results; apply ready directives; persist `pendingGniRequest`, `gniBridgeResult`, `appliedGniDirective`, and `directiveUpdate`.

- [x] **Step 4: Verify green**

Run: `node --test --test-concurrency=1 tests/dreamSessionSaveFlow.test.js`

Expected: PASS.

### Task 2: Directive And CLI Support

**Files:**
- Modify: `tests/dreamSessionSaveFlow.test.js`
- Modify: `src/dreamSessionSaveFlow.js`
- Modify: `README.md`

- [x] **Step 1: Write failing directive test**

Resume with a fixture directive and assert `appliedGniDirective.schema === 'JungialDirectiveV1'`, `directiveUpdate` exists, and the save's ArchitectState includes the directive mutation.

- [x] **Step 2: Add CLI options**

Add parsing for `--gni-response=`, `--emulate-gni`, `--gni-endpoint=`, `--gni-token-env=`, and `--gni-timeout-ms=`.

- [x] **Step 3: Document usage**

Add README examples for `npm run dream:checkpoint -- --emulate-gni` and a provider endpoint.

- [x] **Step 4: Run readiness**

Run: `npm run ready`

Expected: PASS.
