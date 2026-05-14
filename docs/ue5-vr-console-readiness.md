# UE5 VR/Console Readiness Notes

## Current Direction

Jungial now has a clean runtime composition boundary: `createJungialRuntime()` loads and validates content once, then injects normalized data into gameplay systems. In UE5, this maps to a subsystem or bootstrap actor that owns cooked DataAsset references and passes them into components.

## Proposed UE5 Mapping

- `UJungialRuntimeSubsystem`: validates DataAssets and wires services.
- `UArchetypeResonanceComponent`: tracks local archetype vector and event history.
- `UFeelingEngineComponent`: maps feeling axes to lighting, fog, post-process, audio, and movement parameters.
- `AThresholdChamberActor`: owns chamber objects, Heartlight, note, portal, and tool-sigil actors.
- `UDreamflowComponent`: selects dream modules and four-beat `DreamJourneyV1` paths.
- `UJungialCampaignRunner`: executes repeated Threshold-to-dream cycles while preserving Architect state.
- `UJungialSymbolGrammar`: tracks recurrence, contradiction, tension, and symbol echoes.
- `UJungialWitnessComponent`: builds `SessionBundleV1`.
- `UJungialArchitectSubsystem`: applies safe `JungialDirectiveV1` data and persists long-range state.
- `UGniBridgeSubsystem`: validates bundles, creates `GniProcessingRequestV1`, selects provider/emulator/fixture source, and returns normalized directives.
- `IJungialAiProvider`: implemented first by an emulator, then by GNI.

## Determinism Requirements

- All procedural choices must accept a seed or UE `FRandomStream`.
- Runtime timestamps and session IDs must come from an injected clock/session service during replays and QA captures.
- Runtime services must hydrate from SaveGame snapshots so campaign memory can survive process restarts.
- Replay scripts should produce stable dream journey, journal text shape, and ArchitectState.
- QA and GNI debugging should use `JungialTraceV1` audit output rather than adding exposition to the world.
- Scenario matrices should gate changes to procedural logic with stable hashes for selected dream, journey, trace summary, and journal shape.
- Multi-cycle campaign tests should prove Architect state affects later Dreamflow selection through explicit director multipliers.
- Baseline updates should be intentional and reviewed because they represent accepted changes to Jungial's procedural behavior.
- GNI provider calls should stay behind the bridge so failed/empty responses cannot mutate gameplay state.
- GNI/GNI-emulator outputs must be normalized before touching gameplay state.
- GNI contract fixtures should pass strict validation before provider changes are accepted.
- Content validation must run before packaged builds and before accepting AI-authored content.

## VR/Console Constraints

- No filesystem content loading inside gameplay constructors.
- No runtime code execution from AI directives.
- Save migrations must be explicit and testable.
- Trace output should be available in development builds and easy to disable or sample in shipping builds.
- Atmosphere changes should be parameter curves, not one-off hard-coded scene edits.
- Speech events should be captured as intent/symbol events so platforms without microphone permission still work.

## Next UE5 Spike

Create a tiny UE5 project with only:

1. `AThresholdChamberActor`
2. `UFeelingEngineComponent`
3. `UDreamflowComponent`
4. DataAssets for the five dream modules
5. A SaveGame object containing `JungialSaveGame` version metadata

The goal is not visual polish. The goal is proving the current boundaries port cleanly.
