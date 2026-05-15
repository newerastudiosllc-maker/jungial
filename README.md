# Jungial Prototype Foundation

Jungial begins in a silent Threshold Chamber. A note reads `the word`. When input arrives, the Heartlight wakes, tool-sigils appear, a portal opens, Dreamflow selects a symbolic module, the player returns, and the Journal of Mirrors records what the room remembered.

This is not the full game. It is a portable foundation for the architecture, data contracts, and first simulated loop.

## Why Node.js

UE5 was not available on PATH in this workspace, and no local C++ compiler was available. The runnable prototype is dependency-free Node.js so it can be tested immediately. `UE5Port/` contains C++/Blueprint-style pseudocode shapes for later porting.

## Run

```powershell
npm test
npm run simulate
npm run dream:checkpoint
npm run validate
npm run readiness
npm run ready
npm run campaign
npm run scenarios
npm run scenario:check
npm run fixtures
npm run contracts
npm run gni:contract -- --endpoint=http://127.0.0.1:8787/gni
npm run gni:smoke:async
```

`npm run simulate` writes `saves/latest-session.json`. That folder is ignored by git.

To exercise a longer dream that pauses in the middle and resumes through return:

```powershell
npm run dream:checkpoint
npm run dream:checkpoint -- --checkpoint-save=saves/dream-session-checkpoint.json --final-save=saves/dream-session-resumed.json
npm run dream:checkpoint -- --seed=808 --clock-start=2090-01-01T00:00:00.000Z --json
npm run dream:checkpoint -- --trace=saves/dream-session-trace.json
npm run dream:checkpoint -- --first-listening --trace=saves/dream-session-trace.json
npm run dream:checkpoint -- --emulate-gni
npm run dream:checkpoint -- --gni-response=data/mock_gni_directive.json
npm run dream:checkpoint -- --gni-endpoint=https://example.local/gni --gni-token-env=GNI_API_KEY
```

This writes a checkpoint SaveGame containing `DreamSessionCheckpointV1`, then reloads it and writes a final resumed SaveGame with one Journal of Mirrors entry, an ArchitectState update, and a `GniProcessingRequestV1` handoff. If a directive is ready, it is applied through the GNI Firebreak before Architect mutation; if not, the request is saved in `GniDirectiveQueueV1` for later processing. Player response objects may contain raw speech while the session is active, but this flow only persists redacted EchoTrace/session context.

Use `--trace=saves/dream-session-trace.json` to write a standalone developer trace for the combined checkpoint and resumed dream. Inspect it with:

```powershell
npm run trace -- saves/dream-session-trace.json
```

To test the GNI handoff before the real provider exists:

```powershell
node src/simulation.js --seed=777 --gni-response=data/mock_gni_directive.json
node src/simulation.js --seed=777 --gni-response=data/mock_gni_directive.json --json
node src/simulation.js --seed=777 --emulate-gni
node src/simulation.js --seed=777 --emulate-gni --clock-start=2040-01-02T03:04:05.000Z
node src/simulation.js --seed=777 --emulate-gni --trace=saves/latest-trace.json
node src/simulation.js --seed=777 --first-listening --trace=saves/first-listening-trace.json
node src/simulation.js --seed=777 --session-shape=dark_mirror
node src/simulation.js --gni-endpoint=https://example.local/gni --gni-token-env=GNI_API_KEY
```

The mock directive is normalized before the Architect receives it. Unsafe fields are ignored, numeric pressure is clamped, and dream weights cannot be driven below a small positive floor.

To process a saved pending GNI queue later:

```powershell
npm run gni:process -- --save=saves/latest-session.json --gni-endpoint=https://example.local/gni --gni-token-env=GNI_API_KEY
npm run gni:process -- --save=saves/latest-session.json --out=saves/processed-session.json --gni-endpoint=https://example.local/gni --json
npm run gni:process -- --save=saves/latest-session.json --out=saves/mock-processed-session.json --gni-response=data/mock_gni_directive.json --clock-start=2040-01-02T03:04:05.000Z
```

To run a local mock GNI HTTP target while the real provider is being built:

```powershell
npm run mock:gni -- --port=8787 --mode=directive --directive=data/mock_gni_directive.json
node src/simulation.js --gni-endpoint=http://127.0.0.1:8787/gni
npm run gni:contract -- --endpoint=http://127.0.0.1:8787/gni
```

Use `--mode=async` to make the mock server return HTTP `202` with a `jobId`, `statusUrl`, and `pollAfterMs` instead of an immediate directive. Add `--ready-after-polls=2` or higher to rehearse jobs that stay pending before they resolve.

To exercise the whole async GNI save/resume path in one command:

```powershell
npm run gni:smoke:async
npm run gni:smoke:async -- --save=saves/async-gni-smoke-session.json --json
npm run gni:smoke:async -- --ready-after-polls=2 --max-queue-process-attempts=2
```

This starts the local mock server in async mode, runs the Threshold-to-dream simulation against it, saves the pending queue, polls the mock job status URL, applies the returned directive, and writes the resolved queue back into the same save. The delayed-poll options rehearse jobs that stay pending across multiple background queue passes.

To check a real or mock GNI endpoint without running gameplay:

```powershell
npm run gni:contract -- --endpoint=https://example.local/gni --token-env=GNI_API_KEY --max-polls=2
npm run gni:contract -- --endpoint=https://example.local/gni --request=fixtures/gni_request_v1.json --json
```

The contract check posts a `GniProcessingRequestV1`, accepts an immediate `JungialDirectiveV1` or an async provider job, optionally polls that job, and reports whether the request, directive, or job status matched Jungial's current integration contract.

To run a deterministic replay script:

```powershell
node src/replay.js data/replay_scripts/threshold_word.json saves/replay-threshold-word.json
```

To run a multi-cycle campaign with Architect feedback:

```powershell
npm run campaign
```

The campaign keeps one Architect across cycles, applies optional GNI/emulated-GNI directives after each return, queues pending provider work in `GniDirectiveQueueV1`, and feeds Architect dream weights back into later Dreamflow selection.

Programmatic callers can resume from a saved payload by passing `initialState` to `runCampaign()`, or from disk by setting `resumePath` in a campaign config. Resumed runs hydrate the room, archetype state, feeling state, journal, GNI queue, and Architect memory before the next cycle starts.

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

`src/runtime.js` is the composition boundary. It is the only gameplay bootstrap path that loads the bundled catalog by default, validates it, and injects content into Threshold Chamber, Dreamflow, Masks, and the SaveGame-backed GNI queue. Those systems now require explicit content/state, matching how UE5 components should receive cooked DataAssets and hydrated SaveGame snapshots instead of loading files from inside constructors.

`npm run validate` checks duplicate IDs, missing symbolic tags, positive dream weights, known symbols, known archetypes, and known feeling-axis keys.

## GNI Integration Boundary

GNI is represented by `GniAdapter` in `src/ai.js` and routed through `GniBridge` in `src/gniBridge.js`.

`GniBridge` is the provider boundary for the real GNI side. It validates `SessionBundleV1`, builds a `GniProcessingRequestV1`, accepts one of three directive sources, then passes the result through the GNI Firebreak before the Architect can apply it:

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

`GniHttpProvider` in `src/gniHttpProvider.js` is a generic POST adapter for early integration work. It sends `GniProcessingRequestV1` as JSON to `--gni-endpoint`, reads an optional bearer token from `--gni-token-env` (default: `GNI_API_KEY`), treats HTTP `202`/`204` as pending work, and lets the bridge capture provider errors without mutating gameplay state. A `202` response may include async job metadata:

```json
{
  "jobId": "gni-job-001",
  "statusUrl": "https://gni.local/jobs/gni-job-001",
  "pollAfterMs": 2500
}
```

That metadata is normalized into `providerJob` and saved in `GniBridgeResultV1` plus the pending `GniDirectiveQueueV1` entry.

`src/gniFirebreak.js` is the final response gate for immediate, emulated, fixture, and queued GNI output. It strips private/raw fields, suppresses hard-boundary symbols, clamps directive pressure to the current session covenant, and emits `GniFirebreakTraceV1` counts for developer traces without preserving raw suppressed content.

`GniDirectiveQueue` in `src/gniQueue.js` records pending GNI requests when the provider is empty, offline, or still processing. The simulation saves a `GniDirectiveQueueV1` snapshot beside the bridge result so later UE5, VR, or console builds can resume async AI work without blocking the chamber or dream return loop.

`processPendingGniQueue()` and `processSavedGniQueue()` in `src/gniQueueProcessor.js` are the later-response path. They first poll an existing `providerJob.statusUrl` when a queued entry already has async job metadata, then fall back to the same GNI provider shapes used by the bridge when no provider job exists. Any returned directive passes through the GNI Firebreak, is applied through `ArchitectState`, and is persisted with the updated queue/Architect state when working from a save file.

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

`src/contracts.js` is the guardrail layer. It validates `SessionBundleV1`, status-checks `GniBridgeResultV1`, and normalizes `JungialDirectiveV1` before the Architect applies anything.

For an async provider, the safe flow is: save `GniDirectiveQueueV1`, let a background/service task resolve it, then write back the normalized queue and Architect snapshot. The in-world Witness still only observes; it does not wait for or narrate provider status.

The current contract schemas live in `data/schemas/`:

- `input_intent.schema.json`
- `threshold_presentation.schema.json`
- `session_frame.schema.json`
- `runtime_readiness.schema.json`
- `session_bundle.schema.json`
- `session_covenant.schema.json`
- `session_shape_selection.schema.json`
- `session_content_gate.schema.json`
- `passage.schema.json`
- `echo_trace.schema.json`
- `first_listening.schema.json`
- `experience_directive.schema.json`
- `dread_budget.schema.json`
- `dream_weather.schema.json`
- `weather_trace.schema.json`
- `dreamer_profile.schema.json`
- `dreamer_memory_context.schema.json`
- `save_slot_plan.schema.json`
- `session_arc.schema.json`
- `dream_session.schema.json`
- `dream_session_checkpoint.schema.json`
- `gni_processing_request.schema.json`
- `gni_directive.schema.json`
- `gni_firebreak_trace.schema.json`
- `gni_bridge_result.schema.json`
- `gni_contract_check_report.schema.json`
- `gni_directive_queue.schema.json`
- `gni_queue_process_result.schema.json`

## Runtime Readiness

`src/runtimeReadiness.js` builds `RuntimeReadinessV1`, an internal preflight report for the prototype and future UE5/VR/console boot path. It marks required blockers, optional degradations, known platform targets, active contracts, and core capabilities before a session starts. Missing GNI degrades the report but does not block the chamber; invalid content blocks startup. The current capability list includes the hidden content gate so production builds know boundary audits are wired before play.

Run it with:

```powershell
npm run readiness
npm run readiness -- --json --gni-endpoint=https://example.local/gni --targets=node_prototype,ue5,vr,console
```

This report is not player-facing narration. It is for build gates, QA, tooling, and production startup checks.

## Versioning And Replay

Save files are wrapped as `JungialSaveGame` with version metadata. Legacy unversioned saves migrate into the current envelope when loaded; unsupported versioned envelopes are rejected so future saves are not silently rewrapped into the wrong payload shape.

Dreamflow can now produce a four-beat `DreamJourneyV1`: entry, pressure, mirror, return. Replay scripts exercise deterministic inputs, GNI directives, dream outcomes, journal text shape, and ArchitectState.

For QA-style reproducibility, pass `--clock-start=<ISO time>` and optional `--clock-step-ms=<milliseconds>` to simulation runs. Programmatic callers can inject `createDeterministicClock()`.

## Input Intents

`src/input.js` normalizes speech, keyboard, controller, VR, and system input into `JungialInputIntentV1`. The chamber can awaken from a platform intent such as `speak_word` or `awaken_threshold`, so console/VR builds do not need microphone permission to trigger the same symbolic event.

Replay, simulation, and campaign runs all pass through this router.

## Presentation Packets

`src/presentation.js` builds `ThresholdPresentationV1` from chamber, feeling state, session covenant, and Dream Weather. This is the renderer-facing packet for lights, fog, bloom, audio mood, haptics, movement feel, comfort limits, note material, Heartlight state, portal state, visible tool-sigils, and spawned forms. Simulation saves include this packet so UE5, VR, console UI, or a browser prototype can render from a stable shape without mutating gameplay state.

The nested `DreamAtmospherePresentationV1` is deliberately presentation-only. It carries bounded lighting, fog, audio, haptic, movement, and comfort cues derived from Dream Weather without exposing the hidden pressure machinery or sending raw player input to a renderer.

`src/sessionFrame.js` builds `SessionFrameV1`, the complete renderer handoff packet for one moment of play. It wraps `ThresholdPresentationV1`, hidden `ExperienceDirectiveV1`, comfort bounds, haptic/audio/movement hints, and small debug counters while keeping player-facing text empty and raw speech out of the renderer path.

## Trace/Audit Output

`TraceRecorder` writes `JungialTraceV1` developer traces. These are not in-world exposition; they are black-box records for QA and GNI debugging. A trace captures First Listening beats when enabled, threshold input, room awakening, portal opening, dream journey selection, content-gate audit summaries, mask selection, journal grounding, Witness bundle creation, hidden Experience Director directives, GNI requests/directives, Firebreak suppression counts, queue processing summaries, and save output.

Use `--trace=<path>` on simulation runs to write a standalone trace JSON file. Save files also include the trace snapshot, and `processSavedGniQueue()` appends a `gni.queue.processed` event when background AI work is resolved later.

## Dreamer Memory And Safety

`DreamerProfileV1` is the hidden long-term memory layer for gradual personalization across sessions. It stores redacted symbolic aggregates, not raw speech or private transcripts, and can provide `DreamerMemoryContextV1` to GNI without exposing the mechanics to the player.

`SaveSlotPlanV1` is the internal handoff for `fresh`, `continue`, and `new_incarnation` starts. It derives the effective run seed, chooses the active profile, and only allows cross-save echoes through the redacted memory context when the profile consent allows it.

See `docs/dreamer-memory-and-safety.md` for the product/architecture guardrails: mystery in-world, transparent profile controls out-of-world, save/incarnation modes, and safety boundaries around therapeutic positioning.

## Session Covenant And Passages

`FirstListeningRunV1` is the optional pre-portal listening layer. It is presented as a quiet chamber ritual, not intake or assessment, and stores only redacted symbolic object ids, response kinds, motifs, gestures, pressure acceptance, boundary signals, derived tone tags, intensity hint, return anchor hint, and a redacted summary.

`ExperienceDirectiveV1` is the hidden "what next" packet. It composes First Listening, Session Arc, Dream Weather, Dreamer memory, Architect weights, and any applied GNI directive into bounded next-move guidance: pressure target, return readiness, weather tag bias, dream weight overrides, pacing bias, mask pressure, return anchor, and redacted reason codes. It is not player-facing narration.

`SessionCovenantV1` captures the current session's tone, intensity ceiling, boundaries, and return anchor. `PassageV1` is the dream-native adaptive fragment format, and `EchoTraceV1` records symbolic response patterns without raw speech.

`SessionShapeSelectionV1` is the internal preset handoff for broad session tone. Current shapes are `quiet_lantern`, `strange_threshold`, `dark_mirror`, and `nightmare_veil`; each resolves to a bounded `SessionCovenantV1`. Overrides can lower intensity or add boundaries, but they do not store raw speech or player-facing rationale.

`SessionContentGateV1` is the final internal audit over the selected Passage, Dream Weather, DreamJourney, and Mask. It records whether the current content stays inside the covenant, which tags were suppressed, and replacement hints for future UE5/GNI routing. It stays out of in-world narration and never stores raw player speech.

The system can become strange, dark, or horrific when the covenant allows it, while exact Passage repeats and boundary violations are filtered before GNI or Dreamflow can use them.

`SessionArcV1` is the hidden pacing layer for immersive long sessions. It tracks pressure, return readiness, recent beat roles, and the current arc decision so Dreamflow can deepen, distort, mirror, soften, or return without showing the machinery to the player.

`DreamSessionV1` is the continuous dream runner result. Each hidden beat gathers a Passage, records a redacted EchoTrace, advances Session Arc, selects a DreamJourney, and resolves Dream Weather. It can keep moving until a return anchor is used, return becomes available, the beat limit is reached, or a checkpoint is requested. Raw player wording is not stored in the session.

`DreamSessionCheckpointV1` is the pause/resume packet for long sessions. It stores completed hidden beats, the final arc, recent redacted EchoTraces, and `DreamflowRuntimeStateV1` so a suspended dream can resume onto the same procedural path as uninterrupted play.

`src/dreamSessionSaveFlow.js` turns that checkpoint packet into a playable save/resume loop: Threshold Chamber, hidden dream beats, checkpoint save, runtime hydration from SaveGame, final return, journal entry, Architect handoff, and GNI bridge/queue handoff. It is the current foundation for very long dream sessions where the player can stop and continue without exposing the hidden pacing machinery.

Dream Weather is the hidden atmospheric layer for each session. `DreamWeatherV1` carries weather tags, pressure, atmosphere, and the embedded `DreadBudgetV1`; `WeatherTraceV1` records how those tags resolved. When sent toward GNI, it is redacted into `DreamWeatherContextV1` so the provider sees structured pressure context without owning the underlying weather machinery.

Inspect a trace summary:

```powershell
npm run trace -- saves/latest-trace.json
```

Export GNI contract fixtures:

```powershell
npm run fixtures
```

This writes `fixtures/session_bundle_v1.json`, `fixtures/session_covenant_v1.json`, `fixtures/session_shape_selection_v1.json`, `fixtures/session_content_gate_v1.json`, `fixtures/passage_v1.json`, `fixtures/echo_trace_v1.json`, `fixtures/first_listening_v1.json`, `fixtures/experience_directive_v1.json`, `fixtures/dreamer_profile_v1.json`, `fixtures/dreamer_memory_context_v1.json`, `fixtures/session_arc_v1.json`, `fixtures/dream_session_v1.json`, `fixtures/dream_session_checkpoint_v1.json`, `fixtures/dream_weather_v1.json`, `fixtures/weather_trace_v1.json`, `fixtures/threshold_presentation_v1.json`, `fixtures/session_frame_v1.json`, `fixtures/runtime_readiness_v1.json`, `fixtures/gni_request_v1.json`, `fixtures/gni_directive_v1.json`, `fixtures/gni_firebreak_trace_v1.json`, `fixtures/gni_bridge_result_v1.json`, `fixtures/gni_contract_check_report_v1.json`, `fixtures/gni_directive_queue_v1.json`, `fixtures/gni_queue_process_result_v1.json`, `fixtures/fixture-run.save.json`, `fixtures/fixture-pending-run.save.json`, `fixtures/trace_summary_v1.json`, and a manifest hash.

The provider-safe fixture surface is `gni_request_v1.json` and its nested `SessionBundleV1`. Full SaveGame fixtures are internal examples for resume, migration, and QA flows; they may include local or session state that should not be treated as provider input.

Validate generated fixtures, SaveGame envelopes, and mock GNI directives against the strict contract gate:

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
7. The hidden content gate audits the Passage, atmosphere, journey, and mask against the active covenant.
8. A mask may emerge.
9. Journal of Mirrors writes a placeholder poetic entry.
10. ArchitectState updates long-range weights.
11. Save JSON is written.

For longer play, `src/dreamSession.js` can chain many hidden beats after the portal opens. That runner is the foundation for an intense, evolving dream that keeps responding until the player returns or the caller stops the loop.

## UE5 Port Map

- `ArchetypeState` -> `UArchetypeResonanceComponent`
- `FeelingState` -> `UFeelingEngineComponent` controlling lights, fog, post-process, audio, and movement parameters
- `normalizePlayerInput` / `applyPlayerInput` -> `UJungialInputRouter`
- `ThresholdChamber` -> `AThresholdChamberActor`
- `DreamflowGenerator` -> `UDreamflowComponent` plus Dream Module DataAssets
- `runDreamSession` -> `UJungialDreamSessionRunner` or an async gameplay task that owns multi-beat dream pacing
- `DreamSessionCheckpointV1` -> SaveGame-backed suspend/resume packet for long dreams
- `WitnessState` -> local/session observer component
- `ArchitectState` -> SaveGame-backed director service
- `GniAdapter` -> `IJungialAiProvider` implementation
- `GniDirectiveQueue` -> SaveGame-backed async GNI request queue
- `SessionShapeSelectionV1` -> preset-to-covenant handoff for gentle through horrific starts
- `SessionContentGateV1` -> `UJungialContentGateSubsystem` audit before save, renderer handoff, and future replacement routing
- `SessionFrameV1` -> renderer/audio/haptics handoff packet for UE5, VR, console, and browser prototypes
- `RuntimeReadinessV1` -> internal startup preflight for build gates, QA, and platform boot checks
- `JournalOfMirrors` -> SaveGame-backed library model
- `MaskRegistry` -> emergent presence spawner

## Design Tone

The Witness observes. The Architect does not speak. The world changes as if it recognizes pressure, repetition, and symbol.
