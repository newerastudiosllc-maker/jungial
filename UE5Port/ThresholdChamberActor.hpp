// PSEUDOCODE ONLY: likely UE5 mapping for the first vertical slice.

#pragma once

#include "JungialTypes.hpp"
#include "JungialAiProvider.hpp"

class AThresholdChamberActor : public AActor
{
public:
    String NoteText = "the word";
    bool bAwakened = false;
    bool bPortalOpen = false;

    UPROPERTY()
    UHeartlightComponent* Heartlight;

    UPROPERTY()
    UArchetypeResonanceComponent* Archetypes;

    UPROPERTY()
    UFeelingEngineComponent* Feeling;

    UPROPERTY()
    UDreamflowComponent* Dreamflow;

    void ReceiveSpeechOrInput(const String& PlayerText)
    {
        if (PlayerText.Contains(NoteText))
        {
            bAwakened = true;
            Heartlight->Bloom();
            Archetypes->RecordSpeech(PlayerText, {"threshold", "silence", "light"});
            Archetypes->RecordAction("awaken_heartlight", {Creator, Seeker}, {"awakening", "light"});
            Feeling->Nudge({-0.2f, 0.25f, 0.7f, 0.55f, -0.25f});
            RevealToolSigils();
        }
    }

    void UseKeyOfPortals()
    {
        if (bAwakened)
        {
            bPortalOpen = true;
            Dreamflow->SelectAndLoadNextDream();
        }
    }

private:
    void RevealToolSigils()
    {
        // Spawn or reveal Key, Quill, Mirror Lens, and Lamp placeholder actors.
    }
};
