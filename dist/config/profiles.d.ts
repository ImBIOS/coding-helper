export interface ProfileConfig {
    name: string;
    provider: "zai" | "minimax";
    apiKey: string;
    baseUrl: string;
    defaultModel: string;
    createdAt: string;
    updatedAt: string;
}
export interface ImBIOSConfig {
    activeProfile: string;
    profiles: Record<string, ProfileConfig>;
    settings: {
        defaultProvider: "zai" | "minimax";
        autoSwitch: boolean;
        logLevel: "info" | "debug" | "silent";
    };
}
export declare function getProfilesPath(): string;
export declare function loadProfiles(): ImBIOSConfig;
export declare function saveProfiles(config: ImBIOSConfig): void;
export declare function createProfile(name: string, provider: "zai" | "minimax", apiKey: string, baseUrl: string, defaultModel: string): ProfileConfig;
export declare function switchProfile(name: string): boolean;
export declare function deleteProfile(name: string): boolean;
export declare function getActiveProfile(): ProfileConfig | null;
export declare function listProfiles(): ProfileConfig[];
export declare function updateProfileSettings(settings: Partial<ImBIOSConfig["settings"]>): void;
export declare function exportProfile(name: string): string | null;
