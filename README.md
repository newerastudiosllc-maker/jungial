# Jungial Prototype Foundation

Jungial begins in a silent Threshold Chamber. A note reads `the word`. When input arrives, the Heartlight wakes, tool-sigils appear, a portal opens, Dreamflow selects a symbolic module, the player returns, and the Journal of Mirrors records what the room remembered.

This is not the full game. It is a portable foundation for the architecture, data contracts, and first simulated loop.

## Why Node.js

UE5 was not available on PATH in this workspace, and no local C++ compiler was available. The runnable prototype is dependency-free Node.js so it can be tested immediately. `UE5Port/` contains C++/Blueprint-style pseudocode shapes for later porting.

## Run

```powershell
npm test
npm run simulate
npm run validate
npm run campaign
npm run scenarios
npm run scenario:check
npm run fixtures
npm run contracts
```

`npm run simulate` writes `saves/latest-session.json`. That folder is ignored by git.

To test the GNI handoff before the real provider exists:

```powershell
node src/simulation.js --seed=777 --gni-response=data/mock_gni_directive.json
node src/simulation.js --seed=777 --gni-response=data/mock_gni_directive.json --json
node src/simulation.js --seed=777 --emulate-gni
node src/simulation.js --seed=777 --emulate-gni --clock-start=2040-01-02T03:04:05.000Z
node src/simulation.js --seed=777 --emulate-gni --trace=saves/latest-trace.json
node src/simulation.js --gni-endpoint=https://example.local/gni --gni-token-env=GNI_API_KEY
```

The mock directive is normalized before the Architect receives it. Unsafe fields are ignored, numeric pressure is clamped, and dream weights cannot be driven below a small positive floor.

To process a saved pending GNI queue later:

```powershell
npm run gni:process -- --save=saves/latest-session.json --gni-endpoint=https://example.local/gni --gni-token-env=GNI_API_KEY
npm run gni:process -- --save=saves/latest-session.json --out=saves/processed-session.json --gni-endpoint=https://example.local/gni --json
npm run gni:process -- --save=saves/latest-session.json --out=saves/mock-processed-session.json --gni-response=data/mock_gni_directive.json --clock-start=2040-01-02T03:04:05.000Z
```

To run a deterministic replay script:

```powershell
node src/replay.js data/replay_scripts/threshold_word.json saves/replay-threshold-word.json
```

To run a multi-cycle campaign with Architect feedback:

```powershell
npm run campaign
```

The campaign keeps one Architect across cycles, applies optional GNI/emulated-GNI directives after each return, queues pending provider work in `GniDirectiveQueueV1`, and feeds Architect dream weights back into later Dreamflow selection.

Programmatic callers can resume from a saved payload by passing `initialState` to `runCampaign()`, or from disk by setting `resumePath` in a campaign config. Resumed runs hydrate the room, archetype state, feeling state, journal, and Architect memory before the next cycle starts.

To run the smoke scenario matrix:

```powershell
npm run scenarios
```

This writes `saves/scenarios/scenario-report.json` with stable hashes for each scenario.
The matrix includes emulated-GNI, pending-GNI, replay, campaign, and controller-input paths.

To compare the smoke matrix against the committed baseline:

```powershell
npm run scenario:check
```

When intentional procedural changes happen, refresh the baseline with:

```powershell
npm run scenario:baseline
```

## Folder Structure

- `src/`: runnable engine-agnostic modules.
- `tests/`: Node built-in test runner coverage for the core loop.
- `data/`: JSON catalogs and schemas.
- `UE5Port/`: C++/Blueprint-style pseudocode interfaces.
- `docs/superpowers/`: design and implementation notes.

## Content Catalog

Dream modules, masks, tool-sigils, and the symbol lexicon are loaded through `src/contentCatalog.js` from `data/*.json`. Runtime systems consume the normalized catalog shape instead of maintaining separate hard-coded copies.

That matters for the UE5 path: these JSON files can become DataAssets later, while the same validation rules can keep GNI-authored or designer-authored content inside known archetype and feeling-axis keys.

`src/runtime.js` is the composition boundary. It is the only gameplay bootstrap path that loads the bundled catalog by default, validates it, and injects content into Threshold Chamber, Dreamflow, and Masks. Those systems now require explicit content, matching how UE5 components should receive cooked DataAssets instead of loading files from inside constructors.

`npm run validate` checks duplicate IDs, missing symbolic tags, positive dream weights, known symbols, known archetypes, and known feeling-axis keys.

## GNI Integration Boundary

GNI is represented by `GniAdapter` in `src/ai.js` and routed through `GniBridge` in `src/gniBridge.js`.

`GniBridge` is the provider boundary for the real GNI side. It validates `SessionBundleV1`, builds a `GniProcessingRequestV1`, accepts one of three directive sources, then normalizes the result before the Architect can apply it:

- `provided`: a fixture/mock directive, such as `--gni-response=data/mock_gni_directive.json`
- `provider`: an injected object/function that receives the processing request
- `emulator`: the deterministic local `GniEmulator`

A future GNI provider can expose any one of these shapes:

```js
async function provider(request, sessionBundle) {}
provider.processRequest = async (request) => {}
provider.processSessionBundle = async (sessionBundle) => {}
provider.complete = async (request) => {}
```

`GniHttpProvider` in `src/gniHttpProvider.js` is a generic POST adapter for early integration work. It sends `GniProcessingRequestV1` as JSON to `--gni-endpoint`, reads an optional bearer token from `--gni-token-env` (default: `GNI_API_KEY`), and lets the bridge capture provider errors without mutating gameplay state.

`GniDirectiveQueue` in `src/gniQueue.js` records pending GNI requests when the provider is empty, offline, or still processing. The simulation saves a `GniDirectiveQueueV1` snapshot beside the bridge result so later UE5, VR, or console builds can resume async AI work without blocking the chamber or dream return loop.

`processPendingGniQueue()` and `processSavedGniQueue()` in `src/gniQueueProcessor.js` are the later-response path. They take pending queue entries, call the same GNI provider shapes used by the bridge, normalize any returned directive, apply it through `ArchitectState`, and persist the updated queue/Architect state when working from a save file.

`GniEmulator` in `src/gniEmulator.js` lets the prototype test AI-shaped behavior before real GNI is ready. Use `--emulate-gni` to have the simulation produce and apply a deterministic directive from the current `SessionBundleV1`.

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

Game systems do not call GNI directly. They pass through the bridge/adapter so the AI can process structured state without owning mutable runtime state.

`src/contracts.js` is the guardrail layer. It validates `SessionBundleV1` shape and normalizes `JungialDirectiveV1` before the Architect applies anything.

For an async provider, the safe flow is: save `GniDirectiveQueueV1`, let a background/service task resolve it, then write back the normalized queue and Architect snapshot. The in-world Witness still only observes; it does not wait for or narrate provider status.

The current contract schemas live in `data/schemas/`:

- `input_intent.schema.json`
- `threshold_presentation.schema.json`
- `session_bundle.schema.json`
- `gni_processing_request.schema.json`
- `gni_directive.schema.json`
- `gni_bridge_result.schema.json`
- `gni_directive_queue.schema.json`
- `gni_queue_process_result.schema.json`

## Versioning And Replay

Save files are wrapped as `JungialSaveGame` with version metadata. Legacy unversioned saves migrate into the current envelope when loaded.

Dreamflow can now produce a four-beat `DreamJourneyV1`: entry, pressure, mirror, return. Replay scripts exercise deterministic inputs, GNI directives, dream outcomes, journal text shape, and ArchitectState.

For QA-style reproducibility, pass `--clock-start=<ISO time>` and optional `--clock-step-ms=<milliseconds>` to simulation runs. Programmatic callers can inject `createDeterministicClock()`.

## Input Intents

`src/input.js` normalizes speech, keyboard, controller, VR, and system input into `JungialInputIntentV1`. The chamber can awaken from a platform intent such as `speak_word` or `awaken_threshold`, so console/VR builds do not need microphone permission to trigger the same symbolic event.

Replay, simulation, and campaign runs all pass through this router.

## Presentation Packets

`src/presentation.js` builds `ThresholdPresentationV1` from chamber and feeling state. This is the renderer-facing packet for lights, fog, bloom, audio mood, movement feel, note material, Heartlight state, portal state, visible tool-sigils, and spawned forms. Simulation saves include this packet so UE5, VR, console UI, or a browser prototype can render from a stable shape without mutating gameplay state.

## Trace/Audit Output

`TraceRecorder` writes `JungialTraceV1` developer traces. These are not in-world exposition; they are black-box records for QA and GNI debugging. A trace captures threshold input, room awakening, portal opening, dream journey selection, mask selection, journal grounding, Witness bundle creation, GNI requests/directives, and save output.

Use `--trace=<path>` on simulation runs to write a standalone trace JSON file. Save files also include the trace snapshot.

Inspect a trace summary:

```powershell
npm run trace -- saves/latest-trace.json
```

Export GNI contract fixtures:

```powershell
npm run fixtures
```

This writes `fixtures/session_bundle_v1.json`, `fixtures/gni_request_v1.json`, `fixtures/gni_directive_v1.json`, `fixtures/gni_directive_queue_v1.json`, `fixtures/gni_queue_process_result_v1.json`, `fixtures/trace_summary_v1.json`, and a manifest hash.

Validate generated fixtures and mock GNI directives against the strict contract gate:

```powershell
npm run contracts
```

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
- `normalizePlayerInput` / `applyPlayerInput` -> `UJungialInputRouter`
- `ThresholdChamber` -> `AThresholdChamberActor`
- `DreamflowGenerator` -> `UDreamflowComponent` plus Dream Module DataAssets
- `WitnessState` -> local/session observer component
- `ArchitectState` -> SaveGame-backed director service
- `GniAdapter` -> `IJungialAiProvider` implementation
- `GniDirectiveQueue` -> SaveGame-backed async GNI request queue
- `JournalOfMirrors` -> SaveGame-backed library model
- `MaskRegistry` -> emergent presence spawner

## Design Tone

The Witness observes. The Architect does not speak. The world changes as if it recognizes pressure, repetition, and symbol.
