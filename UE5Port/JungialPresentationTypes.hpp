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

struct FSessionFrameComfortV1
{
    float IntensityCeiling = 0.35f;
    bool bReturnAvailable = true;
    String ReturnAnchorKind;
    bool bSuddenFlashAllowed = false;
    bool bPursuitAllowed = false;
    bool bHapticsEnabled = true;
    float LocomotionIntensity = 0.0f;
};

struct FSessionFrameRendererHintsV1
{
    String NextMove;
    String SuggestedRole;
    float PressureTarget = 0.0f;
    float ReturnReadiness = 1.0f;
    String AtmosphereMood;
    String WeatherPressure;
    float LightingIntensityScale = 1.0f;
    float FogDensity = 0.0f;
    float AudioTension = 0.0f;
    float HapticAmplitude = 0.0f;
    float MovementDrag = 0.0f;
};

struct FSessionFrameV1
{
    String FrameId;
    int FrameIndex = 0;
    String FrameKind;
    FThresholdPresentationV1 Presentation;
    FExperienceDirectiveV1 ExperienceDirective;
    FSessionFrameComfortV1 Comfort;
    FSessionFrameRendererHintsV1 RendererHints;
    JsonObject Debug;
    String PlayerFacingText; // PlayerFacingText must stay empty. The frame is a hidden renderer handoff, not narration.
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

    FSessionFrameV1 BuildSessionFrame(const FThresholdPresentationV1& Presentation, const FExperienceDirectiveV1& Directive)
    {
        // Copy presentation and hidden director guidance into one bounded render/audio/haptics packet.
        // No raw speech, private memory, or diagnostic explanation crosses into the renderer.
        // VR comfort systems should consume Comfort and RendererHints instead of reading hidden session state.
        return FSessionFrameV1();
    }
};
