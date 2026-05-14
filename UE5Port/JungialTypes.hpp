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
