# Session Arc Director Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hidden Session Arc Director that shapes long dream sessions through pressure, return readiness, and deterministic next-beat directives.

**Architecture:** Create `src/sessionArc.js` for pure arc logic and `SessionArcV1` snapshots. Add contract validation and a JSON schema, then wire simulation to save the arc and record a developer trace event. Keep player-facing transcript unchanged except existing dream outputs.

**Tech Stack:** Dependency-free Node.js ES modules, Node built-in test runner, current deterministic clock/seed utilities, existing JSON contract validators.

---

### Task 1: Arc State And Decisions

**Files:**
- Create: `src/sessionArc.js`
- Create: `tests/sessionArc.test.js`

- [ ] **Step 1: Write failing tests**

```js
import { advanceSessionArc } from '../src/sessionArc.js';

test('session arc deepens while accepted pressure stays within the covenant ceiling', () => {
  const result = advanceSessionArc({
    covenant: { intensityCeiling: 0.62 },
    echoTrace: { pressureAccepted: 0.55, boundarySignals: [] },
    dreamWeather: { dreadBudget: { watching: 0.4 } },
    seed: 12
  });
  assert.equal(result.arc.schema, 'SessionArcV1');
  assert.equal(result.directive.decision, 'deepen');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --test-concurrency=1 tests/sessionArc.test.js`

Expected: FAIL with missing `src/sessionArc.js`.

- [ ] **Step 3: Implement minimal arc logic**

Create `advanceSessionArc()` with deterministic phase/decision selection, pressure clamping, return readiness, and weight overrides.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --test-concurrency=1 tests/sessionArc.test.js`

Expected: PASS.

### Task 2: Contracts And Simulation Hook

**Files:**
- Modify: `src/contracts.js`
- Modify: `src/contractValidator.js`
- Create: `data/schemas/session_arc.schema.json`
- Modify: `data/schemas/save_game.schema.json`
- Modify: `src/simulation.js`
- Test: `tests/dataContracts.test.js`
- Test: `tests/simulationHarness.test.js`

- [ ] **Step 1: Add `SessionArcV1` validation**

Validate schema, phase, decision, pressure, return readiness, beat count, continuation seed, and weight overrides.

- [ ] **Step 2: Save arc state**

`runSimulation()` should call `advanceSessionArc()` after `echoTrace` and before `selectDreamJourney()`, pass arc weight overrides into dream journey selection, save `sessionArc`, and record `session.arc.advanced`.

- [ ] **Step 3: Run targeted tests**

Run: `node --test --test-concurrency=1 tests/sessionArc.test.js tests/dataContracts.test.js tests/simulationHarness.test.js`

Expected: PASS.

### Task 3: Docs And UE5 Notes

**Files:**
- Modify: `README.md`
- Modify: `docs/ue5-vr-console-readiness.md`
- Modify: `UE5Port/JungialTypes.hpp`
- Test: `tests/ue5PortDocs.test.js`

- [ ] **Step 1: Document arc director**

Add a brief explanation of hidden arc pacing and UE5 subsystem mapping.

- [ ] **Step 2: Verify all**

Run: `npm run ready`

Expected: 0 failures across tests, validation, contracts, scenario check, and simulation.
