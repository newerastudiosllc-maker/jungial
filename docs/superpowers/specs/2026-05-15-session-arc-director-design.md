# Session Arc Director Design

## Goal

Make long Jungial sessions feel continuous, responsive, and immersive without exposing pacing machinery to the player.

## Design

`SessionArcV1` is a compact hidden state for the current run. It tracks the current phase, beat count, pressure, return readiness, continuation seed, recent beat roles, boundary signal count, and last decision.

`ArcDirector` consumes the current covenant, dream weather, echo traces, dreamer memory context, and optional previous arc snapshot. It returns the next arc state plus a small directive:

- `deepen`: increase pressure and invite stranger material.
- `distort`: bend the atmosphere when accepted pressure is rising.
- `mirror`: repeat symbols in altered form.
- `soften`: lower pressure after boundary signals or hesitation.
- `return`: open the way back when pressure or duration is high.

The director never writes player-facing exposition. It only adjusts selection weights, suggested journey role, return readiness, and trace-safe metadata.

## Safety And Immersion

The covenant ceiling is a hard cap. Boundary signals, return-anchor use, and explicit withdrawal lower pressure. As a session lengthens, return readiness increases so intense runs can continue without trapping the player.

The system should feel like the room is breathing with the player: lights, fog, passages, and dream modules react through existing presentation and selection layers rather than a visible “session state” UI.

## Runtime Flow

Simulation creates or hydrates an arc before passage and journey selection. The arc directive contributes dream weight overrides and is saved as `sessionArc`. Developer traces may record `session.arc.advanced` with phase, pressure, return readiness, and decision. GNI may later receive this through a redacted context, but this first slice keeps it local.
