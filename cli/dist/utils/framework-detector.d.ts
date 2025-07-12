export type Framework = 'nextjs' | 'react' | 'vite' | 'manual';
export interface FrameworkDetectionResult {
    framework: Framework | null;
    version?: string;
    confidence: number;
    details: string;
}
export declare function detectFramework(projectRoot: string): Promise<FrameworkDetectionResult>;
export declare function getSupportedFrameworks(): Framework[];
export declare function getFrameworkDisplayName(framework: Framework): string;
//# sourceMappingURL=framework-detector.d.ts.map