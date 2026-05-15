# Dream Session Save Flow Design

## Goal

Make long dream sessions resumable through the normal SaveGame path: begin in the Threshold Chamber, enter a multi-beat dream, save a hidden checkpoint, reload later, finish the return, then write one Journal of Mirrors entry and update ArchitectState.

## Design

`dreamSessionSaveFlow.js` sits above `dreamSession.js`. The lower-level dream session module remains pure and deterministic; the save-flow layer owns runtime hydration, threshold preparation, checkpoint SaveGame payloads, return-side journal writing, and Architect handoff.

The save keeps `DreamSessionCheckpointV1`, redacted `DreamSessionV1` beats, room state, atmosphere state, journal state, ArchitectState, active weather, presentation parameters, and the final `SessionBundleV1` only after the dream completes.

## Privacy Rule

Player response objects may include raw speech while the runtime is active, but save files may only contain redacted `EchoTraceV1` summaries and normal session bundle context. Raw response text is never persisted by this flow.

## Return Rule

An incomplete checkpoint resumes from `nextBeatIndex`. A completed checkpoint hydrates as read-only session state and does not write duplicate journal entries or duplicate Architect updates.
