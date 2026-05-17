# UE5 VR/Console Readiness Notes

## Current Direction

Jungial now has a clean runtime composition boundary: `createJungialRuntime()` loads and validates content once, then injects normalized data and hydrated SaveGame snapshots into gameplay systems. In UE5, this maps to a subsystem or bootstrap actor that owns cooked DataAsset references and passes them into components.

## Proposed UE5 Mapping

- `UJungialRuntimeSubsystem`: validates DataAssets and wires services.
- `FRuntimeReadinessV1`: startup preflight report for required blockers, optional degradations, platform targets, and contract coverage.
- `UJungialSaveSlotSubsystem`: prepares `SaveSlotPlanV1` for fresh, continue, and new incarnation starts before runtime bootstrap.
- `FSessionShapeSelectionV1`: small preset-to-covenant packet for gentle, strange, dark, and horrific starts.
- `UJungialSessionArcDirector`: advances hidden pressure, return readiness, and beat-role pacing before Dreamflow selection.
- `UJungialDreamSessionRunner`: orchestrates multi-beat dream sessions from Passage, EchoTrace, SessionArc, DreamJourney, and DreamWeather packets.
- `FDreamSessionCheckpointV1`: SaveGame payload for suspended long dreams, including Dreamflow RNG state.
- `UJungialContentSurfaceResolver`: reusable boundary that runs content gate checks, applies replacement plans, and returns the final Passage/DreamWeather surface for beats.
- `UJungialContentGateSubsystem`: audits selected Passage, DreamWeather, DreamJourney, and Mask packets against the active `SessionCovenantV1`.
- `UJungialContentReplacementRouter`: consumes blocked gate reports and emits `SessionContentReplacementPlanV1` with safe substitute Passage/Weather packets.
- `UArchetypeResonanceComponent`: tracks local archetype vector and event history.
- `UFeelingEngineComponent`: maps feeling axes to lighting, fog, post-process, audio, and movement parameters.
- `AThresholdChamberActor`: owns chamber objects, Heartlight, note, portal, and tool-sigil actors.
- `UJungialInputRouter`: converts speech, keyboard, controller, and VR events into `JungialInputIntentV1`.
- `UJungialPresentationMapper`: builds renderer-facing packets without mutating gameplay state.
- `UDreamflowComponent`: selects dream modules and four-beat `DreamJourneyV1` paths.
- `FDreamJourneyPolicyV1`: hidden module-selection audit for covenant hard-boundary suppression, internal dream-module reroutes, and deterministic fallback use.
- `UJungialCampaignRunner`: executes repeated Threshold-to-dream cycles while preserving Architect state.
- `UJungialSymbolGrammar`: tracks recurrence, contradiction, tension, and symbol echoes.
- `UJungialSymbolLexicon`: central DataAsset/registry for valid symbolic tags.
- `UJungialWitnessComponent`: builds `SessionBundleV1`.
- `UJungialArchitectSubsystem`: applies safe `JungialDirectiveV1` data and persists long-range state.
- `UGniBridgeSubsystem`: validates bundles, creates `GniProcessingRequestV1`, selects provider/emulator/fixture source, runs the GNI Firebreak, and returns normalized directives.
- `FDreamJourneyContextV1`: compact GNI-facing DreamJourney reroute evidence with no player-facing explanation or raw player material.
- `UGniDirectiveQueueSubsystem`: persists pending GNI requests and resolved directives across level loads, suspend/resume, and offline provider windows.
- `IJungialAiProvider`: implemented first by an emulator, then by GNI.
- `FGniHttpProviderAdapter`: early network-backed provider that POSTs request envelopes while final GNI transport details settle.

## Determinism Requirements

- All procedural choices must accept a seed or UE `FRandomStream`.
- Runtime timestamps and session IDs must come from an injected clock/session service during replays and QA captures.
- Runtime services must hydrate from SaveGame snapshots so campaign memory can survive process restarts.
- Save slot starts must derive deterministic run seeds from slot id, mode, incarnation index, profile root seed, and session count so new saves do not collapse into identical paths.
- Replay scripts should produce stable dream journey, journal text shape, and ArchitectState.
- QA and GNI debugging should use `JungialTraceV1` audit output rather than adding exposition to the world.
- Scenario matrices should gate changes to procedural logic with stable hashes for selected dream, journey, trace summary, and journal shape.
- Multi-cycle campaign tests should prove Architect state affects later Dreamflow selection through explicit director multipliers.
- Continuous dream sessions should remain deterministic from seed, response traces, prior arc state, and redacted memory context so QA can replay long sessions.
- Checkpoint/resume tests should prove split sessions match uninterrupted sessions byte-for-byte before console suspend/resume support is trusted.
- Baseline updates should be intentional and reviewed because they represent accepted changes to Jungial's procedural behavior.
- GNI provider calls should stay behind the bridge so failed/empty responses cannot mutate gameplay state.
- Empty or delayed GNI responses should be queued in SaveGame-backed state instead of blocking travel, VR comfort flow, or console suspend/resume.
- Queue processing should happen from a platform-safe async/service layer that writes back normalized directives and Architect snapshots, never from an actor tick that can hitch VR rendering.
- HTTP-backed GNI calls should be injectable and mockable so packaged builds can test without network access.
- HTTP `202`/`204` responses from GNI should be treated as pending async work and routed into the SaveGame-backed queue; `202` responses may carry provider job metadata for later polling.
- GNI/GNI-emulator outputs must pass through the Firebreak before touching gameplay state.
- GNI contract fixtures should pass strict validation before provider changes are accepted.
- GNI requests may include `DreamJourneyContextV1`, but only as compact symbolic evidence: symbol trail, suppressed module ids, reroute records, and fallback state.
- The local GNI emulator should keep rehearsing `DreamJourneyContextV1` semantics so real provider behavior can be compared against deterministic replacement boosts, blocked-module softening, safe echoes, and pacing nudges.
- Selected content should pass through the content surface resolver before save, renderer handoff, or GNI context.
- Dreamflow should route blocked weighted module picks into compatible allowed modules before finalizing a `DreamJourneyV1`; the content gate remains the final audit.
- `SessionContentReplacementPlanV1` should be deterministic from gate report, covenant, catalog, and seed so QA can replay reroutes.
- Content validation must run before packaged builds and before accepting AI-authored content.
- `RuntimeReadinessV1` should run before a playable session starts so missing GNI can degrade safely while broken content blocks startup.
- Session shape presets should be DataAssets or config rows that resolve into `SessionCovenantV1` before GNI, Dream Weather, or renderer systems see them.
- Dream modules should reference known lexicon symbols rather than ad hoc strings.

## VR/Console Constraints

- No filesystem content loading inside gameplay constructors.
- No runtime code execution from AI directives.
- Save migrations must be explicit and testable; unsupported future save versions should fail loudly instead of being coerced.
- Trace output should be available in development builds and easy to disable or sample in shipping builds.
- Atmosphere changes should be parameter curves, not one-off hard-coded scene edits.
- Renderer, audio, UI, and haptic layers should consume presentation packets rather than raw gameplay objects.
- `DreamAtmospherePresentationV1` should be the handoff for weather-shaped lighting, fog, audio, haptics, movement, and comfort cues; UE actors should not read `DreadBudgetV1` directly.
- `SessionArcV1` should remain a hidden director packet; renderer/audio/haptics should receive only presentation-safe consequences.
- `DreamSessionV1` should remain a hidden orchestration packet; individual beats carry `DreamJourneyPolicyV1`, `SessionContentGateV1`, and `SessionContentReplacementPlanV1` so level streaming, presentation, and GNI context all use the same resolved surface without exposing the runner to the player.
- `DreamflowRuntimeStateV1` should be stored only in SaveGame/developer traces, never surfaced as UI or player-facing language.
- `SessionContentGateV1` should stay internal to tooling, traces, and replacement routing; UE widgets and world actors should not expose blocked reasons to the player.
- `SessionContentReplacementPlanV1` should be applied before presentation mapping, so unsafe content never needs to be hidden by UI after it appears.
- Speech events should be captured as intent/symbol events so platforms without microphone permission still work.
- Console and VR builds should send the same symbolic intents as speech builds instead of branching chamber logic by platform.

## Next UE5 Spike

Create a tiny UE5 project with only:

1. `AThresholdChamberActor`
2. `UFeelingEngineComponent`
3. `UDreamflowComponent`
4. DataAssets for the five dream modules
5. A SaveGame object containing `JungialSaveGame` version metadata

The goal is not visual polish. The goal is proving the current boundaries port cleanly.
