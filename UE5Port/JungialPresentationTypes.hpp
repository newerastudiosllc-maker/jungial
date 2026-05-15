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
    JsonObject DreamAtmosphereParameters; // DreamAtmospherePresentationV1: bounded lighting, fog, audio, haptics, movement, and comfort cues.
};

class UJungialPresentationMapper
{
public:
    FThresholdPresentationV1 BuildThresholdPresentation(const JsonObject& DreamWeather, const JsonObject& SessionCovenant)
    {
        // Read chamber snapshot, FeelingEngine params, DreamWeatherV1, and SessionCovenantV1.
        // Do not mutate gameplay state.
        // UI, renderer, audio, and haptics consume this packet.
        // Keep haptics, flashes, and locomotion cues bounded by the covenant before VR systems see them.
        return FThresholdPresentationV1();
    }
};
