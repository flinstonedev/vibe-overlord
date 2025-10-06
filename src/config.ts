import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import JSON5 from 'json5';

/**
 * Configuration schema for Vibe Overlord
 */
export const VibeOverlordConfigSchema = z.object({
    /** Glob patterns to scan for components */
    componentGlobs: z.array(z.string()).default([
        'src/components/**/*.{tsx,jsx}',
        'app/components/**/*.{tsx,jsx}',
        'components/**/*.{tsx,jsx}'
    ]),

    /** Glob patterns to scan for utilities */
    utilityGlobs: z.array(z.string()).default([
        'src/utils/**/*.{ts,tsx,js,jsx}',
        'app/utils/**/*.{ts,tsx,js,jsx}',
        'utils/**/*.{ts,tsx,js,jsx}',
        'lib/**/*.{ts,tsx,js,jsx}'
    ]),

    /** Patterns to exclude from scanning */
    excludeGlobs: z.array(z.string()).default([
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/*.stories.{ts,tsx,js,jsx}',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**'
    ]),

    /** Path aliases from tsconfig.json */
    aliases: z.record(z.string(), z.string()).optional(),

    /** Whether to automatically detect aliases from tsconfig.json */
    autoDetectAliases: z.boolean().default(true),

    /** Maximum number of components/utilities to inject into context */
    maxContextItems: z.number().default(10),

    /** Whether to use embeddings for retrieval (requires additional setup) */
    useEmbeddings: z.boolean().default(false),

    /** OpenAI API key for embeddings (if useEmbeddings is true) */
    embeddingsApiKey: z.string().optional(),

    /** Model to use for embeddings */
    embeddingsModel: z.string().default('text-embedding-3-small'),

    /** Whether to enable TypeScript output */
    allowTypescript: z.boolean().default(false),

    /** Whether to enable two-phase generation (plan → implement) */
    useTwoPhaseGeneration: z.boolean().default(false),

    /** Whether to enable self-healing (retry on compilation errors) */
    enableSelfHealing: z.boolean().default(true),

    /** Maximum number of self-healing retry attempts */
    maxRetries: z.number().default(1),

    /** Whether to enable AST-based validation */
    useAstValidation: z.boolean().default(true),

    /** Allowed import sources (in addition to project-relative imports) */
    allowedImports: z.array(z.string()).default([
        'react',
        'react-dom',
        'react/jsx-runtime'
    ]),

    /** Design system configuration */
    designSystem: z.object({
        /** Path to design tokens file (JSON/JS) */
        tokensPath: z.string().optional(),
        /** Path to component guidelines (MD) */
        guidelinesPath: z.string().optional(),
        /** Tailwind config path */
        tailwindConfigPath: z.string().optional()
    }).optional(),

    /** Template library configuration */
    templates: z.object({
        /** Enable template library */
        enabled: z.boolean().default(true),
        /** Custom templates directory */
        customTemplatesDir: z.string().optional()
    }).optional()
});

export type VibeOverlordConfig = z.infer<typeof VibeOverlordConfigSchema>;

/**
 * Default configuration
 */
export const defaultConfig: VibeOverlordConfig = {
    componentGlobs: [
        'src/components/**/*.{tsx,jsx}',
        'app/components/**/*.{tsx,jsx}',
        'components/**/*.{tsx,jsx}'
    ],
    utilityGlobs: [
        'src/utils/**/*.{ts,tsx,js,jsx}',
        'app/utils/**/*.{ts,tsx,js,jsx}',
        'utils/**/*.{ts,tsx,js,jsx}',
        'lib/**/*.{ts,tsx,js,jsx}'
    ],
    excludeGlobs: [
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/*.stories.{ts,tsx,js,jsx}',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**'
    ],
    autoDetectAliases: true,
    maxContextItems: 10,
    useEmbeddings: false,
    embeddingsModel: 'text-embedding-3-small',
    allowTypescript: false,
    useTwoPhaseGeneration: false,
    enableSelfHealing: true,
    maxRetries: 1,
    useAstValidation: true,
    allowedImports: [
        'react',
        'react-dom',
        'react/jsx-runtime'
    ],
    templates: {
        enabled: true
    }
};

/**
 * Load configuration from project root
 *
 * IMPORTANT: This function only loads JSON config files and detects tsconfig aliases.
 * For .ts/.js config files, import them directly in your application and pass to generateComponent.
 *
 * Example:
 * ```typescript
 * import config from './vibe-overlord.config';
 * await generateComponent({ config, ... });
 * ```
 */
export async function loadConfig(projectPath: string): Promise<VibeOverlordConfig> {
    // Try loading JSON config file (if it exists)
    const jsonConfigPath = join(projectPath, 'vibe-overlord.config.json');
    let config = { ...defaultConfig };

    if (existsSync(jsonConfigPath)) {
        try {
            const configData = JSON5.parse(readFileSync(jsonConfigPath, 'utf-8'));
            config = VibeOverlordConfigSchema.parse({
                ...defaultConfig,
                ...configData
            });
        } catch (error) {
            console.warn(`Failed to load config from ${jsonConfigPath}:`, error);
        }
    }

    // Auto-detect tsconfig aliases if enabled
    if (config.autoDetectAliases) {
        const aliases = await detectTsConfigAliases(projectPath);
        if (aliases) {
            config.aliases = aliases;
        }
    }

    return config;
}

/**
 * Detect path aliases from tsconfig.json
 */
async function detectTsConfigAliases(projectPath: string): Promise<Record<string, string> | undefined> {
    const tsconfigPath = join(projectPath, 'tsconfig.json');

    if (!existsSync(tsconfigPath)) {
        return undefined;
    }

    try {
        const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
        // Use JSON5 to properly parse tsconfig.json with comments and trailing commas
        const tsconfig = JSON5.parse(tsconfigContent);

        const paths = tsconfig?.compilerOptions?.paths;
        if (!paths) {
            return undefined;
        }

        const aliases: Record<string, string> = {};
        const baseUrl = tsconfig?.compilerOptions?.baseUrl || '.';

        for (const [alias, targets] of Object.entries(paths)) {
            if (Array.isArray(targets) && targets.length > 0) {
                // Remove /* suffix if present
                const cleanAlias = alias.replace(/\/\*$/, '');
                const cleanTarget = (targets[0] as string).replace(/\/\*$/, '');
                aliases[cleanAlias] = join(baseUrl, cleanTarget);
            }
        }

        return Object.keys(aliases).length > 0 ? aliases : undefined;
    } catch (error) {
        // Silently fail and continue without aliases
        // This is expected if tsconfig has complex syntax or doesn't exist
        return undefined;
    }
}

/**
 * Generate a default config file
 */
export function generateDefaultConfigFile(): string {
    return `import { VibeOverlordConfig } from 'vibe-overlord';

const config: VibeOverlordConfig = {
  // Glob patterns to scan for components
  componentGlobs: [
    'src/components/**/*.{tsx,jsx}',
    'app/components/**/*.{tsx,jsx}',
    'components/**/*.{tsx,jsx}'
  ],
  
  // Glob patterns to scan for utilities
  utilityGlobs: [
    'src/utils/**/*.{ts,tsx,js,jsx}',
    'app/utils/**/*.{ts,tsx,js,jsx}',
    'utils/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}'
  ],
  
  // Patterns to exclude from scanning
  excludeGlobs: [
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    '**/*.stories.{ts,tsx,js,jsx}',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.next/**'
  ],
  
  // Auto-detect path aliases from tsconfig.json
  autoDetectAliases: true,
  
  // Maximum number of components/utilities to inject into context
  maxContextItems: 10,
  
  // Enable embeddings for better context retrieval (requires OpenAI API key)
  useEmbeddings: false,
  
  // Enable TypeScript output
  allowTypescript: false,
  
  // Use two-phase generation (plan → implement)
  useTwoPhaseGeneration: false,
  
  // Enable self-healing (retry on compilation errors)
  enableSelfHealing: true,
  maxRetries: 1,
  
  // Use AST-based validation
  useAstValidation: true,
  
  // Allowed import sources
  allowedImports: [
    'react',
    'react-dom',
    'react/jsx-runtime'
  ],
  
  // Design system configuration
  // designSystem: {
  //   tokensPath: './src/design/tokens.json',
  //   guidelinesPath: './DESIGN_SYSTEM.md',
  //   tailwindConfigPath: './tailwind.config.js'
  // },
  
  // Template library
  templates: {
    enabled: true,
    // customTemplatesDir: './src/templates'
  }
};

export default config;
`;
}

