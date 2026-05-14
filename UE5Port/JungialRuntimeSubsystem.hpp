// PSEUDOCODE ONLY: UE5 bootstrap equivalent for src/runtime.js.

#pragma once

#include "JungialTypes.hpp"
#include "JungialAiProvider.hpp"

class UJungialRuntimeSubsystem : public UGameInstanceSubsystem
{
public:
    UPROPERTY(EditDefaultsOnly)
    Array<UDreamModuleDataAsset*> DreamModules;

    UPROPERTY(EditDefaultsOnly)
    Array<UMaskDataAsset*> Masks;

    UPROPERTY(EditDefaultsOnly)
    Array<UToolSigilDataAsset*> ToolSigils;

    bool InitializeRuntime()
    {
        if (!ValidateContent())
        {
            return false;
        }

        Architect = NewObject<UJungialArchitectSubsystem>();
        AiProvider = MakeUnique<FGniProviderAdapter>();
        return true;
    }

    void InjectContent(AThresholdChamberActor* Chamber, UDreamflowComponent* Dreamflow, UMaskSpawnerComponent* MaskSpawner)
    {
        Chamber->SetToolSigils(ToolSigils);
        Dreamflow->SetDreamModules(DreamModules);
        MaskSpawner->SetMasks(Masks);
    }

private:
    UPROPERTY()
    UJungialArchitectSubsystem* Architect;

    UniquePtr<IJungialAiProvider> AiProvider;

    bool ValidateContent()
    {
        // Mirror src/contentValidator.js:
        // - no duplicate IDs
        // - known archetype keys
        // - known feeling-axis keys
        // - every dream module has symbolic tags and positive base weight
        return DreamModules.Num() > 0 && ToolSigils.Num() > 0;
    }
};
