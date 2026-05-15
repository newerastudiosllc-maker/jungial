# Dream Session Checkpoint Design

## Goal

Let a long dream pause and resume without losing the hidden arc, recent symbolic responses, or procedural randomness that made the path feel singular.

## Design

`DreamSessionCheckpointV1` is a hidden SaveGame-ready packet created from `DreamSessionV1`. It keeps the completed beats, final `SessionArcV1`, recent `EchoTraceV1` list, final weather/dream packets, and a compact `DreamflowRuntimeStateV1`.

The checkpoint does not store raw player speech. It stores only the already-redacted response traces and deterministic runtime state needed to continue the dream later.

## Resume Rule

Resume must match uninterrupted play when given:

- the same runtime seed and content catalog
- the same covenant and memory context
- the same response trace split across pause/resume
- the saved Dreamflow random state

The resumed session keeps the original session id and appends new beats after `nextBeatIndex`.

## Stop Reasons

`DreamSessionV1.endedBecause` gains `checkpoint` for an intentional pause before max beats or return. Player-facing language should never reveal that term.
