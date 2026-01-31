export declare function getEnvPath(): string;
export declare function exportEnvVars(apiKey: string, baseUrl: string, model: string): string;
export declare function writeEnvVars(apiKey: string, baseUrl: string, model: string): void;
export declare function loadEnvVars(): Record<string, string>;
