export declare function confirm(message: string): Promise<boolean>;
export declare function input(message: string, defaultValue?: string): Promise<string>;
export declare function password(message: string): Promise<string>;
export declare function select<T extends string>(message: string, choices: readonly T[], defaultIndex?: number): Promise<T>;
export declare function checkbox<T extends string>(message: string, choices: readonly T[]): Promise<T[]>;
export declare function providerSelection(): Promise<"zai" | "minimax">;
export declare function modelSelection(models: readonly string[]): Promise<string>;
