export interface ShellType {
    name: string;
    completions: string;
}
export declare const SHELLS: ShellType[];
export declare function getShellCompletion(shell: string): string;
export declare function getAllCompletions(): Record<string, string>;
export declare function installCompletion(shell: string, dryRun?: boolean): {
    success: boolean;
    message: string;
};
