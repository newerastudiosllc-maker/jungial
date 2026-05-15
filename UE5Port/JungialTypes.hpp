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
