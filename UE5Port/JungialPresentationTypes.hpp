// PSEUDOCODE ONLY: renderer-facing packets equivalent to src/presentation.js.

#pragma once

#include "JungialTypes.hpp"

struct FThresholdPresentationV1
{
    bool bAwakened = false;
    String BoundaryState;
    String AtmosphereState;
    String NoteText;
    bool bHeartlightAwake = false;
    float HeartlightIntensity = 0.0f;
    String HeartlightColor;
    bool bPortalOpen = false;
    Array<JsonObject> VisibleToolSigils;
    Array<JsonObject> SpawnedForms;
    JsonObject AtmosphereParameters;
};

class UJungialPresentationMapper
{
public:
    FThresholdPresentationV1 BuildThresholdPresentation()
    {
        // Read chamber snapshot and FeelingEngine presentation params.
        // Do not mutate gameplay state.
        // UI, renderer, audio, and haptics consume this packet.
        return FThresholdPresentationV1();
    }
};
