# Phase 2 Living Session Spine Design

## Goal

Phase 2 turns Jungial from a strong systems prototype into the first real playable experience spine: a player begins quietly, is subtly listened to, enters a long dream session, returns changed, and can continue or begin again without two lives collapsing into the same path.

The experience remains dreamlike and non-explanatory. The code and settings layer remain explicit about privacy, memory, and safety.

## Current Foundation

The project already has:

- Threshold Chamber, Heartlight, note, tool-sigils, and portal state.
- Archetype, Feeling, Dreamflow, Session Arc, Passage, Dream Weather, and Symbol Grammar systems.
- Long dream sessions with checkpoint, resume, return anchor, and developer trace output.
- Save slots for fresh, continue, and new incarnation starts.
- Redacted Dreamer Profile memory and GNI memory context.
- GNI bridge, emulator, HTTP provider, async directive queue, and Firebreak.
- Contract schemas, fixtures, replay, scenario baselines, content validation, and UE5 pseudocode mappings.

This is enough to stop adding isolated foundations and start building the first end-to-end experience spine.

## Missing Pillars

Phase 2 should fill these gaps:

- A First Listening Sequence that quietly gathers session shape without calling it intake, assessment, or therapy.
- A higher-level Experience Director that decides when to deepen, soften, echo, invite, return, or alter the chamber.
- Larger content libraries so emergence has enough symbolic material.
- A UE5 vertical slice proving the data contracts port into an actual scene.
- Player trust controls for memory, consent, intensity, reset, and exit.
- A production safety review path before any public therapeutic positioning.

## Product Principle

Jungial follows one rule:

**Mystery in the world. Transparency at the boundary.**

Inside the chamber and dreams:

- No visible archetype scores.
- No model status.
- No direct diagnosis.
- No "this means you..." explanations.
- No hidden-system language.

Outside the dream, in account/settings/save surfaces:

- Clear memory controls.
- Clear delete/reset/export controls.
- Clear intensity and session preference controls.
- Clear support language for crisis or distress.

## Phase 2 Lanes

### Lane 1: First Listening Sequence

The player encounters a series of subtle chamber interactions before the first long dream. Each interaction is a scene beat, not a questionnaire.

Examples:

- A covered mirror that reacts differently to approach, speech, waiting, or withdrawal.
- A lamp that brightens when protected, ignored, named, or moved.
- A threshold door that responds to distance and patience.
- The note changing only as atmosphere, not exposition.

Outputs:

- `FirstListeningRunV1`
- `ListeningBeatV1`
- `SessionCovenantV1`
- early `DreamerProfileV1` aggregate updates
- optional `DreamerMemoryContextV1` for GNI
- developer trace events

### Lane 2: Experience Director

The Experience Director sits above the current dream session runner. It decides the shape of an evening, not individual physics or rendering.

It should choose:

- when to enter First Listening
- when to open the portal
- how long the dream should be allowed to continue
- when to invite return
- when to reveal or withhold a mask
- when to echo a symbol back into the chamber
- when to save a checkpoint

It must not speak directly to the player. It produces directives for systems and presentation packets.

### Lane 3: Content Expansion Kit

The current content set is intentionally small. Phase 2 needs enough symbolic variety to support repeated sessions.

Targets for the next content pass:

- 20 to 30 Passage entries
- 12 to 15 dream modules
- 12 masks
- 75 to 120 symbols
- 20 chamber form objects
- 6 journal voice templates

Every item must pass content validation and use known symbols, archetypes, and pressure tags.

### Lane 4: UE5 Vertical Slice

The first UE5 slice should prove architecture, not polish.

Scope:

- `AThresholdChamberActor`
- `UFeelingEngineComponent`
- `UJungialInputRouter`
- `UDreamflowComponent`
- basic DataAssets for the five current dream modules
- SaveGame object with version metadata
- one portal transition placeholder
- one developer trace export path for QA builds

No full VR, no final art, no full dream world yet.

### Lane 5: Safety And Trust Layer

Minimum production gates:

- memory enabled or disabled
- cross-save echoes enabled or disabled
- reset current save memory
- delete profile
- export profile/save data
- intensity preference
- grounded return/exit path
- crisis/self-harm boundary policy
- language review before any therapy-adjacent public claims

This layer is not optional. It lets the world stay mysterious without becoming deceptive.

## Data Flow

1. Save slot plan chooses fresh, continue, or new incarnation.
2. Threshold Chamber begins silent.
3. First Listening Sequence records symbolic reactions.
4. Session Covenant is formed from redacted inputs.
5. Portal opens into a long Dream Session.
6. Dream Session records redacted EchoTraces and Dream Weather.
7. Checkpoint can save and resume.
8. Return writes Journal of Mirrors.
9. Witness builds `SessionBundleV1`.
10. GNI processes the bundle or queues async work.
11. Firebreak clamps/suppresses unsafe directives.
12. Architect updates future weights.
13. Dreamer Profile stores aggregates only.
14. Trace records developer evidence.

## Non-Goals

Phase 2 should not:

- build the full final game
- ship medical or therapeutic claims
- add raw speech persistence
- expose hidden scoring to players
- depend on GNI being live for the local loop to work
- build final VR interaction polish before the UE5 architecture spike

## Safety And Regulatory Posture

Until legal, clinical, and privacy review are complete, Jungial should be described as:

- dreamwork
- symbolic exploration
- emotional reflection
- personal mythology
- immersive journaling

Avoid public claims that it diagnoses, treats, mitigates, prevents, or cures any condition. If the project later intentionally enters that territory, it needs a separate clinical, regulatory, evidence, and risk-management plan.

## Phase 2 Success Criteria

Phase 2 is successful when:

- A player can complete First Listening, enter a long dream, return, save, resume, and continue.
- Two fresh saves from different seeds feel materially different.
- A new incarnation can feel faintly haunted by prior symbols when consent allows it.
- GNI can be live, emulated, pending, or offline without blocking play.
- Developer traces explain what happened without storing raw player speech.
- The UE5 slice proves the core runtime contracts can drive a real scene.
- Safety and memory controls are designed before external testing expands.

## Recommended Build Order

1. First Listening Sequence data model and simulator.
2. First Listening to Session Covenant converter.
3. First Listening to Dreamer Profile aggregate update.
4. Experience Director shell.
5. Content expansion pack 1.
6. UE5 vertical slice bootstrap.
7. Trust and memory controls prototype.
8. External playtest package.
