# Save Slot Incarnation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a save slot orchestrator for fresh, continue, and new incarnation modes.

**Architecture:** Add `src/saveSlotManager.js` as the one place that prepares `SaveSlotPlanV1`, active `DreamerProfileV1`, redacted GNI memory context, and deterministic run seed. Wire `runSimulation()` to use the plan only when slot/profile options are supplied, preserving existing default fixture behavior.

**Tech Stack:** Dependency-free Node.js ES modules, Node built-in test runner, existing JSON contract validators, existing deterministic clock and stable hash utilities.

---

### Task 1: Save Slot Manager

**Files:**
- Create: `src/saveSlotManager.js`
- Test: `tests/saveSlotManager.test.js`

- [x] **Step 1: Write the failing test**

```js
import { prepareSaveSlot } from '../src/saveSlotManager.js';

test('fresh save slot creates a new empty profile and divergent run seed', () => {
  const fresh = prepareSaveSlot({ mode: 'fresh', slotId: 'slot-a' });
  assert.equal(fresh.schema, 'SaveSlotPlanV1');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test --test-concurrency=1 tests/saveSlotManager.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/saveSlotManager.js`.

- [ ] **Step 3: Write minimal implementation**

Create `prepareSaveSlot()` with mode validation, profile creation, optional cross-save echo context, and seed derivation.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --test-concurrency=1 tests/saveSlotManager.test.js`

Expected: PASS.

### Task 2: Simulation Integration

**Files:**
- Modify: `src/simulation.js`
- Modify: `data/schemas/save_game.schema.json`
- Modify: `src/contracts.js`
- Test: `tests/saveSlotManager.test.js`
- Test: `tests/dataContracts.test.js`

- [ ] **Step 1: Use the save slot plan in simulation**

`runSimulation()` should prepare a plan when a dreamer profile, custom slot id, non-default save mode, or incarnation index is supplied.

- [ ] **Step 2: Save the plan**

Persist `saveSlot` in the save payload and return it from `runSimulation()`.

- [ ] **Step 3: Validate the plan**

Add `validateSaveSlotPlan()` and allow optional `payload.saveSlot` in `JungialSaveGame`.

- [ ] **Step 4: Run targeted tests**

Run: `node --test --test-concurrency=1 tests/saveSlotManager.test.js tests/dataContracts.test.js`

Expected: PASS.

### Task 3: Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/dreamer-memory-and-safety.md`
- Modify: `UE5Port/JungialTypes.hpp`

- [ ] **Step 1: Document slot modes**

Add a short note explaining `SaveSlotPlanV1`, `fresh`, `continue`, and `new_incarnation`.

- [ ] **Step 2: Run full readiness**

Run: `npm run ready`

Expected: 0 failures across tests, validation, contracts, scenario check, and simulation.
