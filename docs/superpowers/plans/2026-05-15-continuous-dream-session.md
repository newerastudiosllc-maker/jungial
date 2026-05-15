# Continuous Dream Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic multi-beat dream session runner that chains passages, arc pacing, dream journeys, and weather without storing raw player response text.

**Architecture:** Create `src/dreamSession.js` as a pure orchestration module. It consumes existing systems and returns `DreamSessionV1`. Add a schema/validator, focused tests, fixture export, README, and UE5 pseudocode notes.

**Tech Stack:** Dependency-free Node.js ES modules, Node built-in test runner, current content catalog, Session Arc, Passage Lattice, Dreamflow, Dream Weather, and JSON contract validator.

---

### Task 1: Multi-Beat Runner

**Files:**
- Create: `src/dreamSession.js`
- Create: `tests/dreamSession.test.js`

- [x] **Step 1: Write failing tests**

```js
import { runDreamSession } from '../src/dreamSession.js';

test('continuous dream session advances multiple hidden beats', () => {
  const result = runDreamSession({ maxBeats: 4, responses: [{ kind: 'approach' }] });
  assert.equal(result.schema, 'DreamSessionV1');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test --test-concurrency=1 tests/dreamSession.test.js`

Expected: FAIL with missing `src/dreamSession.js`.

- [x] **Step 3: Implement runner**

Use `selectPassage()`, `createEchoTrace()`, `advanceSessionArc()`, `selectDreamJourney()`, `createDreamWeather()`, and `createWeatherTrace()` for each beat.

- [x] **Step 4: Run targeted tests**

Run: `node --test --test-concurrency=1 tests/dreamSession.test.js`

Expected: PASS.

### Task 2: Contracts And Fixtures

**Files:**
- Modify: `src/contracts.js`
- Modify: `src/contractValidator.js`
- Create: `data/schemas/dream_session.schema.json`
- Modify: `src/fixtureExporter.js`
- Modify: `package.json`
- Test: `tests/dataContracts.test.js`
- Test: `tests/fixtureExporter.test.js`

- [x] **Step 1: Add `DreamSessionV1` validator**

Validate end reason, beats, selected dreams, arc snapshots, EchoTrace references, and no malformed arrays/maps.

- [x] **Step 2: Export fixture**

Add `dream_session_v1.json` to fixture generation and contract validation.

- [x] **Step 3: Run targeted tests**

Run: `node --test --test-concurrency=1 tests/dreamSession.test.js tests/dataContracts.test.js tests/fixtureExporter.test.js tests/contractValidator.test.js`

Expected: PASS.

### Task 3: Docs And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/ue5-vr-console-readiness.md`
- Modify: `UE5Port/JungialTypes.hpp`
- Test: `tests/ue5PortDocs.test.js`

- [x] **Step 1: Document continuous session runner**

Explain that it is hidden runtime structure, not in-world exposition.

- [x] **Step 2: Run full readiness**

Run: `npm run ready`

Expected: 0 failures across tests, validation, contracts, scenario check, and simulation.
