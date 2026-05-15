# Continuous Dream Session Design

## Goal

Let a Jungial dream stay alive across many beats so the player can keep going, changing direction, softening, deepening, or returning without the world exposing its machinery.

## Design

`DreamSessionV1` is a hidden runtime result for a continuous dream loop. Each beat gathers a Passage, records a redacted EchoTrace, advances `SessionArcV1`, selects a DreamJourney with arc weight hints, and creates DreamWeather.

The loop stops only when the player uses a return anchor, when a caller asks to stop once return is available, or when the configured beat limit is reached. That keeps the player in control: the system can offer a way back without forcing the dream to end.

## Data Flow

Inputs:

- runtime systems or explicit `dreamflow`, `passages`, archetype, feeling, and room state
- `SessionCovenantV1`
- optional `DreamerMemoryContextV1`
- previous `SessionArcV1`
- recent `EchoTraceV1` entries
- player responses for each beat

Outputs:

- ordered dream beats
- final `SessionArcV1`
- recent `EchoTraceV1` list
- end reason: `max_beats`, `return_anchor`, or `return_available`

## Safety And Immersion

Raw player response text is never kept in the session result. Boundary signals and return-anchor use are represented symbolically through `EchoTraceV1` and arc state.

The in-world experience should remain diegetic. `DreamSessionV1` exists for runtime, QA, save, and future UE5/GNI integration.
