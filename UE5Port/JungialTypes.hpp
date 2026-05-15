// PSEUDOCODE ONLY: mirror these shapes into UE5 USTRUCT/UENUM/DataAsset types.

#pragma once

enum class EJungialArchetype
{
    Hero,
    Shadow,
    Anima,
    Animus,
    Sage,
    Trickster,
    Creator,
    Destroyer,
    Child,
    Mother,
    Father,
    Lover,
    Seeker
};

struct FFeelingAxes
{
    float CalmTense = 0.0f;
    float HopefulMelancholic = 0.0f;
    float ExpansiveConfined = 0.0f;
    float BrightDark = 0.0f;
    float WarmCold = 0.0f;
};

struct FArchetypeResonanceSnapshot
{
    // In UE5 this should become TMap<EJungialArchetype, float>.
    Map<EJungialArchetype, float> ArchetypeVector;
    float Coherence = 0.0f;
    String VibeState;
    Map<String, int> SymbolHits;
    Array<String> SpeechEvents;
    Array<String> ActionEvents;
    JsonObject RoomConfigSnapshot;
};

struct FSessionBundleV1
{
    String SessionId;
    EJungialArchetype DominantArchetype;
    float Coherence = 0.0f;
    String VibeState;
    Array<String> RecentSymbols;
    Array<String> RecentActions;
    JsonObject RoomConfigSnapshot;
    JsonObject SelectedDream;
    Map<EJungialArchetype, float> ArchetypeVector;
};

enum class ESaveSlotMode
{
    Fresh,
    Continue,
    NewIncarnation
};

struct FSaveSlotPlanV1
{
    String SlotId;
    ESaveSlotMode Mode = ESaveSlotMode::Continue;
    int32 IncarnationIndex = 0;
    int32 RunSeed = 0;
    bool bCrossSaveEchoes = false;
    String SourceProfileId;
    JsonObject DreamerProfile;
    JsonObject DreamerMemoryContext;
};

enum class EJungialSessionShapeId
{
    quiet_lantern,
    strange_threshold,
    dark_mirror,
    nightmare_veil
};

struct FSessionShapeSelectionV1
{
    EJungialSessionShapeId ShapeId = EJungialSessionShapeId::quiet_lantern;
    String Source; // preset or fallback
    String IntensityBand;
    Array<String> ShapeTags;
    JsonObject Covenant; // SessionCovenantV1 built from the selected shape plus safe overrides.
    String PlayerFacingText; // Must stay empty. The player sees atmosphere and options, not hidden mechanics.
};

struct FSessionContentGateCheckedV1
{
    String PassageId;
    String DreamWeatherId;
    String DreamJourneySummary;
    String MaskId;
};

struct FSessionContentGateReplacementHintsV1
{
    Array<String> PreferredToneTags;
    Array<String> AllowedPressureTags;
    String PassageIntensityBand;
    String WeatherPressure;
    String ReturnAnchorKind;
    String GroundingPreference;
};

struct FSessionContentGateV1
{
    String GateId;
    bool bAllowed = true;
    String SessionShapeId;
    float IntensityCeiling = 0.35f;
    FSessionContentGateCheckedV1 Checked;
    Array<String> SuppressedTags;
    Array<String> Warnings;
    Array<String> BlockedReasons;
    FSessionContentGateReplacementHintsV1 ReplacementHints;
    String PlayerFacingText; // Must stay empty. Internal audit only.
};

// UJungialContentGateSubsystem should run after Passage, DreamWeather, Journey, and Mask selection.
// It reports boundary and intensity drift before save, renderer handoff, or GNI context packaging.
// The subsystem may request replacement content, but should never describe the hidden rule path in-world.

enum class EJungialContentReplacementStatus
{
    NotNeeded,
    ReplacementRequired
};

struct FSessionContentReplacementRouteV1
{
    String Target; // passage, dreamWeather, or mask.
    String Action; // replace or suppress.
    String SelectedId;
    String Reason;
};

struct FSessionContentReplacementPlanV1
{
    String PlanId;
    String SourceGateId;
    EJungialContentReplacementStatus Status = EJungialContentReplacementStatus::NotNeeded;
    Array<String> AvoidTags;
    Array<String> BlockedReasons;
    FSessionContentGateReplacementHintsV1 ReplacementHints;
    JsonObject Replacement; // PassageV1, DreamWeatherV1, and optional Mask id.
    Array<FSessionContentReplacementRouteV1> Routes;
    String PlayerFacingText; // Must stay empty. The player sees the changed world, not the route.
};

// UJungialContentReplacementRouter should consume SessionContentGateV1 and emit this plan.
// ReplacementRequired means selectors should use the replacement packet before save, renderer handoff, or GNI context.

enum class EJungialRuntimeReadinessStatus
{
    Ready,
    Degraded,
    Blocked
};

struct FRuntimeReadinessCheckV1
{
    String Id; // Examples: content.catalog, gni.provider, renderer.handoff.
    EJungialRuntimeReadinessStatus Status = EJungialRuntimeReadinessStatus::Ready;
    String Severity; // required or optional
    String Summary;
    JsonObject Details;
    Array<String> Errors;
};

struct FRuntimeReadinessV1
{
    EJungialRuntimeReadinessStatus Status = EJungialRuntimeReadinessStatus::Ready;
    bool bCanStartSession = true;
    int32 BlockedCount = 0;
    int32 DegradedCount = 0;
    Array<String> PlatformTargets;
    Map<String, bool> Capabilities;
    Array<String> Contracts;
    Array<FRuntimeReadinessCheckV1> Checks;
    String PlayerFacingText; // Must stay empty. This is an internal preflight report.
};

enum class EJungialSessionArcPhase
{
    Opening,
    Deepening,
    Distorting,
    Mirroring,
    Softening,
    Returning
};

enum class EJungialSessionArcDecision
{
    Deepen,
    Distort,
    Mirror,
    Soften,
    Return
};

struct FExperienceDirectiveV1
{
    String DirectiveId;
    int32 Seed = 0;
    EJungialSessionArcDecision NextMove = EJungialSessionArcDecision::Deepen;
    String SuggestedRole;
    float PressureTarget = 0.0f;
    float ReturnReadiness = 0.0f;
    Array<String> ToneTags;
    Array<String> WeatherTagBias;
    Map<String, float> DreamWeightOverrides;
    Map<String, float> PacingBias;
    Map<String, float> MaskPressure;
    String ReturnAnchorKind;
    String ReturnAnchorValue;
    Array<String> ReasonCodes;
};

struct FSessionArcV1
{
    EJungialSessionArcPhase Phase = EJungialSessionArcPhase::Opening;
    int32 BeatCount = 0;
    float Pressure = 0.0f;
    float ReturnReadiness = 0.0f;
    int32 ContinuationSeed = 0;
    Array<String> RecentBeatRoles;
    int32 BoundarySignalCount = 0;
    EJungialSessionArcDecision LastDecision = EJungialSessionArcDecision::Deepen;
    Map<String, float> WeightOverrides;
};

enum class EDreamSessionEndReason
{
    MaxBeats,
    Checkpoint,
    ReturnAnchor,
    ReturnAvailable
};

struct FDreamflowRuntimeStateV1
{
    // Maps to FRandomStream state or an equivalent deterministic RNG cursor.
    int64 RandomState = -1;
};

struct FDreamSessionBeatV1
{
    int32 Index = 0;
    JsonObject Passage;
    JsonObject EchoTrace;
    FSessionArcV1 SessionArc;
    JsonObject ArcDirective;
    JsonObject SelectedDream;
    JsonObject DreamJourney;
    JsonObject DreamWeather;
    JsonObject WeatherTrace;
    bool bReturnAvailable = false;
};

struct FDreamSessionV1
{
    String SessionId;
    String Seed;
    int32 MaxBeats = 0;
    int32 CompletedBeats = 0;
    EDreamSessionEndReason EndedBecause = EDreamSessionEndReason::MaxBeats;
    Array<FDreamSessionBeatV1> Beats;
    FSessionArcV1 FinalSessionArc;
    Array<JsonObject> RecentEchoTraces;
    FDreamflowRuntimeStateV1 DreamflowState;
    JsonObject FinalDreamWeather;
    JsonObject FinalSelectedDream;
};

struct FDreamSessionCheckpointV1
{
    String SessionId;
    String Seed;
    int32 MaxBeats = 0;
    int32 CompletedBeats = 0;
    int32 NextBeatIndex = 1;
    EDreamSessionEndReason EndedBecause = EDreamSessionEndReason::Checkpoint;
    bool bIsComplete = false;
    Array<FDreamSessionBeatV1> Beats;
    FSessionArcV1 FinalSessionArc;
    Array<JsonObject> RecentEchoTraces;
    FDreamflowRuntimeStateV1 DreamflowState;
    JsonObject FinalDreamWeather;
    JsonObject FinalSelectedDream;
};
