# Save Slot Incarnation Design

## Goal

Give Jungial one small orchestration layer for `fresh`, `continue`, and `new_incarnation` starts so each save can diverge without exposing the machinery to the player.

## Design

`SaveSlotPlanV1` is an internal/runtime contract. It records the slot id, save mode, incarnation index, effective run seed, active redacted `DreamerProfileV1`, and the `DreamerMemoryContextV1` that may be sent toward GNI.

`fresh` creates a new empty profile and does not inherit symbolic memory.

`continue` uses the existing profile and keeps evolving the same memory.

`new_incarnation` creates a new empty active profile but may send faint symbolic echoes from the source profile when `crossSaveEchoes` consent is enabled. Those echoes use the existing redacted memory context and never include raw speech or arbitrary private text.

## Runtime Flow

`runSimulation()` asks the slot manager for a plan when a dreamer profile or non-default slot mode is supplied. The plan provides the effective seed, active profile, and GNI memory context. The saved session stores the plan beside the active profile so QA, replay, and UE5 porting can see which mode shaped the run.

## Safety

The slot manager does not store raw player text. It only uses `DreamerProfile` snapshots and redacted `DreamerMemoryContextV1`. Cross-save echoes are off unless the profile consent allows them.
