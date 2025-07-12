export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warnings?: string[];
}
export declare function validateProjectStructure(projectRoot: string): Promise<ValidationResult>;
export declare function validateApiKey(apiKey: string): ValidationResult;
export declare function validateProjectPath(path: string): ValidationResult;
//# sourceMappingURL=validators.d.ts.map