import { VibeOverlordConfig } from 'vibe-overlord';

const config: VibeOverlordConfig = {
    // Component scanning patterns
    componentGlobs: [
        'src/components/**/*.{tsx,jsx}'
    ],

    // Utility scanning patterns
    utilityGlobs: [
        'src/utils/**/*.{ts,tsx}'
    ],

    // Patterns to exclude
    excludeGlobs: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.stories.{ts,tsx}',
        '**/node_modules/**',
        '**/.next/**'
    ],

    // Auto-detect path aliases from tsconfig.json
    autoDetectAliases: true,

    // Maximum number of components/utilities to inject into context
    maxContextItems: 10,

    // Enable embeddings for better context retrieval (requires OpenAI API key)
    useEmbeddings: false,

    // Allow TypeScript output
    allowTypescript: true,

    // Use two-phase generation (plan → implement)
    useTwoPhaseGeneration: true,

    // Enable self-healing (retry on compilation errors)
    enableSelfHealing: true,
    maxRetries: 1,

    // Use AST-based validation
    useAstValidation: true,

    // Allowed import sources
    allowedImports: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'next',
        'next/image',
        'next/link'
    ],

    // Template library
    templates: {
        enabled: true
    }
};

export default config;

