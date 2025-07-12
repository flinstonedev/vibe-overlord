import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type Framework = 'nextjs' | 'react' | 'vite' | 'manual';

export interface FrameworkDetectionResult {
    framework: Framework | null;
    version?: string;
    confidence: number;
    details: string;
}

export async function detectFramework(projectRoot: string): Promise<FrameworkDetectionResult> {
    try {
        const packageJsonPath = join(projectRoot, 'package.json');

        if (!existsSync(packageJsonPath)) {
            return {
                framework: null,
                confidence: 0,
                details: 'No package.json found'
            };
        }

        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        // Check for Next.js
        if (deps.next) {
            const nextConfig = existsSync(join(projectRoot, 'next.config.js')) ||
                existsSync(join(projectRoot, 'next.config.mjs')) ||
                existsSync(join(projectRoot, 'next.config.ts'));

            const appDir = existsSync(join(projectRoot, 'app'));
            const pagesDir = existsSync(join(projectRoot, 'pages'));
            const srcAppDir = existsSync(join(projectRoot, 'src', 'app'));
            const srcPagesDir = existsSync(join(projectRoot, 'src', 'pages'));

            const hasNextStructure = appDir || pagesDir || srcAppDir || srcPagesDir;

            return {
                framework: 'nextjs',
                version: deps.next,
                confidence: nextConfig && hasNextStructure ? 0.95 : 0.8,
                details: `Next.js ${deps.next} detected. ${nextConfig ? 'Config found. ' : ''}${hasNextStructure ? 'Directory structure confirmed.' : ''}`
            };
        }

        // Check for Vite
        if (deps.vite || deps['@vitejs/plugin-react']) {
            const viteConfig = existsSync(join(projectRoot, 'vite.config.js')) ||
                existsSync(join(projectRoot, 'vite.config.ts')) ||
                existsSync(join(projectRoot, 'vite.config.mjs'));

            return {
                framework: 'vite',
                version: deps.vite || deps['@vitejs/plugin-react'],
                confidence: viteConfig ? 0.9 : 0.7,
                details: `Vite project detected. ${viteConfig ? 'Config found.' : ''}`
            };
        }

        // Check for React (generic)
        if (deps.react) {
            return {
                framework: 'react',
                version: deps.react,
                confidence: 0.6,
                details: `React ${deps.react} detected. No specific framework identified.`
            };
        }

        return {
            framework: null,
            confidence: 0,
            details: 'No supported framework detected'
        };

    } catch (error) {
        return {
            framework: null,
            confidence: 0,
            details: `Error detecting framework: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

export function getSupportedFrameworks(): Framework[] {
    return ['nextjs', 'react', 'vite', 'manual'];
}

export function getFrameworkDisplayName(framework: Framework): string {
    switch (framework) {
        case 'nextjs':
            return 'Next.js';
        case 'react':
            return 'React';
        case 'vite':
            return 'Vite + React';
        case 'manual':
            return 'Manual Setup';
        default:
            return 'Unknown';
    }
} 