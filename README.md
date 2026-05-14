# Jungial Prototype Foundation

Jungial begins in a silent Threshold Chamber. A note reads `the word`. When input arrives, the Heartlight wakes, tool-sigils appear, a portal opens, Dreamflow selects a symbolic module, the player returns, and the Journal of Mirrors records what the room remembered.

This is not the full game. It is a portable foundation for the architecture, data contracts, and first simulated loop.

## Why Node.js

UE5 was not available on PATH in this workspace, and no local C++ compiler was available. The runnable prototype is dependency-free Node.js so it can be tested immediately. `UE5Port/` contains C++/Blueprint-style pseudocode shapes for later porting.

## Run

```powershell
npm test
npm run simulate
```

`npm run simulate` writes `saves/latest-session.json`. That folder is ignored by git.

To test the GNI handoff before the real provider exists:

```powershell
node src/simulation.js --seed=777 --gni-response=data/mock_gni_directive.json
node src/simulation.js --seed=777 --gni-response=data/mock_gni_directive.json --json
```

The mock directive is normalized before the Architect receives it. Unsafe fields are ignored, numeric pressure is clamped, and dream weights cannot be driven below a small positive floor.

## Folder Structure

- `src/`: runnable engine-agnostic modules.
- `tests/`: Node built-in test runner coverage for the core loop.
- `data/`: JSON catalogs and schemas.
- `UE5Port/`: C++/Blueprint-style pseudocode interfaces.
- `docs/superpowers/`: design and implementation notes.

## Content Catalog

Dream modules, masks, and tool-sigils are loaded through `src/contentCatalog.js` from `data/*.json`. Runtime systems consume the normalized catalog shape instead of maintaining separate hard-coded copies.

That matters for the UE5 path: these JSON files can become DataAssets later, while the same validation rules can keep GNI-authored or designer-authored content inside known archetype and feeling-axis keys.

## GNI Integration Boundary

GNI is represented by `GniAdapter` in `src/ai.js`.

The game sends `SessionBundleV1`:

- dominant archetype
- coherence
- vibe state
- recent symbols
- recent actions
- room snapshot
- selected dream
- archetype vector

GNI should return `JungialDirectiveV1`:

- dream weight deltas
- symbol echoes
- mask pressure
- pacing deltas

Game systems do not call GNI directly. They pass through the adapter so the AI can process structured state without owning mutable runtime state.

`src/contracts.js` is the guardrail layer. It validates `SessionBundleV1` shape and normalizes `JungialDirectiveV1` before the Architect applies anything.

## Current Playable Loop

1. Threshold Chamber starts dim and confined.
2. Player speaks `the word`.
3. Heartlight wakes.
4. Tool-sigils appear.
5. Key of Portals opens a transition.
6. Dreamflow selects Cabin, Garden, Boundless White Void, Space / Black Hole, or Mirror Hall.
7. A mask may emerge.
8. Journal of Mirrors writes a placeholder poetic entry.
9. ArchitectState updates long-range weights.
10. Save JSON is written.

## UE5 Port Map

- `ArchetypeState` -> `UArchetypeResonanceComponent`
- `FeelingState` -> `UFeelingEngineComponent` controlling lights, fog, post-process, audio, and movement parameters
- `ThresholdChamber` -> `AThresholdChamberActor`
- `DreamflowGenerator` -> `UDreamflowComponent` plus Dream Module DataAssets
- `WitnessState` -> local/session observer component
- `ArchitectState` -> SaveGame-backed director service
- `GniAdapter` -> `IJungialAiProvider` implementation
- `JournalOfMirrors` -> SaveGame-backed library model
- `MaskRegistry` -> emergent presence spawner

## Design Tone

The Witness observes. The Architect does not speak. The world changes as if it recognizes pressure, repetition, and symbol.
