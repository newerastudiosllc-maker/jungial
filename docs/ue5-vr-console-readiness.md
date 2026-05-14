# UE5 VR/Console Readiness Notes

## Current Direction

Jungial now has a clean runtime composition boundary: `createJungialRuntime()` loads and validates content once, then injects normalized data into gameplay systems. In UE5, this maps to a subsystem or bootstrap actor that owns cooked DataAsset references and passes them into components.

## Proposed UE5 Mapping

- `UJungialRuntimeSubsystem`: validates DataAssets and wires services.
- `UArchetypeResonanceComponent`: tracks local archetype vector and event history.
- `UFeelingEngineComponent`: maps feeling axes to lighting, fog, post-process, audio, and movement parameters.
- `AThresholdChamberActor`: owns chamber objects, Heartlight, note, portal, and tool-sigil actors.
- `UDreamflowComponent`: selects dream modules and four-beat `DreamJourneyV1` paths.
- `UJungialSymbolGrammar`: tracks recurrence, contradiction, tension, and symbol echoes.
- `UJungialWitnessComponent`: builds `SessionBundleV1`.
- `UJungialArchitectSubsystem`: applies safe `JungialDirectiveV1` data and persists long-range state.
- `IJungialAiProvider`: implemented first by an emulator, then by GNI.

## Determinism Requirements

- All procedural choices must accept a seed or UE `FRandomStream`.
- Runtime timestamps and session IDs must come from an injected clock/session service during replays and QA captures.
- Replay scripts should produce stable dream journey, journal text shape, and ArchitectState.
- QA and GNI debugging should use `JungialTraceV1` audit output rather than adding exposition to the world.
- GNI/GNI-emulator outputs must be normalized before touching gameplay state.
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
