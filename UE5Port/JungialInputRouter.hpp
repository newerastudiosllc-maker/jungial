// PSEUDOCODE ONLY: platform-neutral input seam for VR/console/desktop.

#pragma once

#include "JungialTypes.hpp"

struct FJungialInputIntentV1
{
    String Source; // system, speech, microphone, keyboard, controller, vr
    String Intent; // awaken_threshold, open_portal, use_tool, observe
    String Text;
    String ActionName;
    String ToolId;
    Array<String> Archetypes;
    Array<String> Symbols;
    bool bRequiresMicrophone = false;
};

class UJungialInputRouter
{
public:
    FJungialInputIntentV1 NormalizeSpeech(const String& Text)
    {
        // Speech is just one source of symbolic intent.
        return FJungialInputIntentV1();
    }

    FJungialInputIntentV1 NormalizeAction(const String& Source, const String& ActionName)
    {
        // Controller, keyboard, and VR inputs map to the same symbolic intents.
        return FJungialInputIntentV1();
    }

    void ApplyIntent(const FJungialInputIntentV1& Intent)
    {
        // Route to Threshold, Witness, and tool systems without platform checks.
    }
};
