# Jungial Prototype Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Jungial vertical-slice foundation with a GNI-ready AI provider boundary.

**Architecture:** Use dependency-free Node.js modules for the playable simulation and tests, JSON for data/persistence, and C++/Blueprint-style pseudocode headers for UE5 portability. Keep GNI behind an adapter that accepts `SessionBundle` data and returns constrained directives.

**Tech Stack:** Node.js built-in test runner, ES modules, JSON data files, Markdown docs, C++-style pseudocode headers.

---

## File Structure

- `package.json`: scripts for simulation and tests.
- `README.md`: run/test guide and UE5/GNI expansion notes.
- `src/constants.js`: archetype and feeling-axis constants.
- `src/random.js`: deterministic seeded random helpers.
- `src/archetype.js`: archetype vector, events, coherence, and bundle snapshot support.
- `src/feeling.js`: feeling-axis state and presentation parameter mapping.
- `src/thresholdChamber.js`: room state, note, Heartlight, and tool-sigil reveal/open behavior.
- `src/dreamflow.js`: data-driven weighted module selection.
- `src/ai.js`: WitnessState, ArchitectState, SessionBundle, AiProvider, and GniAdapter placeholder.
- `src/library.js`: journal, lexicon, notes, books, and poetic entry generation.
- `src/masks.js`: mask definitions and spawn selection.
- `src/persistence.js`: JSON save/load helpers.
- `src/simulation.js`: playable command-line loop.
- `data/*.json`: module, mask, tool, schema, and seed save-state data.
- `tests/*.test.js`: behavior tests written before implementation.
- `UE5Port/*.hpp`: pseudocode interfaces for later UE5 porting.

## Tasks

### Task 1: Project Skeleton and Tests

- [ ] Create `package.json`.
- [ ] Write failing tests for archetype/feeling behavior in `tests/archetypeFeeling.test.js`.
- [ ] Run `node --test tests/archetypeFeeling.test.js` and verify module-not-found failure.
- [ ] Implement constants, archetype state, and feeling engine.
- [ ] Run the test and verify pass.

### Task 2: Chamber, Dreamflow, Library, Masks

- [ ] Write failing tests for the playable loop pieces in `tests/dreamLoop.test.js`.
- [ ] Run the test and verify missing modules fail.
- [ ] Implement Threshold Chamber, Dreamflow Generator, Library, and Masks.
- [ ] Run the test and verify pass.

### Task 3: AI Boundary and Persistence

- [ ] Write failing tests for Witness to Architect handoff, GNI request packaging, and save/load in `tests/aiPersistence.test.js`.
- [ ] Run the test and verify missing modules fail.
- [ ] Implement AI boundary and JSON persistence.
- [ ] Run the test and verify pass.

### Task 4: Data, Simulation, UE5 Port Notes, README

- [ ] Add JSON data and schemas.
- [ ] Add `src/simulation.js`.
- [ ] Add `UE5Port` pseudocode headers.
- [ ] Add README run/test instructions.
- [ ] Run `npm test`.
- [ ] Run `npm run simulate`.

## Self-Review

Coverage maps to the requested systems: archetypal resonance, feeling engine, Threshold Chamber, Dreamflow, dual AI layer, journal, masks, persistence, JSON schemas, simulated loop, and README. The GNI requirement is covered by `GniAdapter` and constrained session bundle packaging. The scope remains a foundation, not a full game.
