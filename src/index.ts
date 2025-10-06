import { bundleMDX } from 'mdx-bundler';
import { generateText } from 'ai';
import {
  PromptSchema,
  ProjectPathSchema,
  AIProviderSchema,
  validateGeneratedCode,
  sanitizePrompt,
  securePath,
  createSecureLogger
} from './security.js';
import { loadConfig, VibeOverlordConfig, defaultConfig } from './config.js';
import { scanProject, ScannedCatalog, retrieveRelevantItems } from './scanner.js';
import { planComponent, specToImplementationPrompt, ComponentSpec } from './planner.js';
import { validateCodeWithAst } from './ast-validator.js';
import { getProviderModel } from './providers.js';
import {
  loadBuiltInTemplates,
  loadCustomTemplates,
  findRelevantTemplates,
  buildFewShotExamples
} from './template-loader.js';
import { fixTypeScriptForMDX } from './mdx-typescript-fixer.js';

export type AIProvider = 'openai' | 'anthropic' | 'google';

export interface AIProviderConfig {
  provider: AIProvider;
  model?: string;
}

export interface AvailableUtility {
  name: string;
  description: string;
  signature: string;
  returnType?: string;
  example?: string;
  importPath?: string;
}

export interface AvailableComponent {
  name: string;
  description: string;
  props?: string;
  category?: string;
  example?: string;
  importPath?: string;
}

/**
 * Strip markdown code blocks from LLM output
 * Sometimes LLMs wrap output in ```mdx ... ``` despite instructions
 */
const stripCodeBlocks = (text: string): string => {
  // Remove opening code fence (```mdx, ```jsx, ```typescript, etc.)
  let cleaned = text.replace(/^```[a-z]*\n/gm, '');
  // Remove closing code fence
  cleaned = cleaned.replace(/\n```$/gm, '');
  // Also handle inline code fences that might be at start/end
  cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
  return cleaned.trim();
};

const getMdxFromLlm = async (
  prompt: string,
  providerConfig: AIProviderConfig = { provider: 'openai' },
  availableUtilities: AvailableUtility[] = [],
  availableComponents: AvailableComponent[] = [],
  config: VibeOverlordConfig = defaultConfig,
  fewShotExamples: string = ''
) => {
  const model = getProviderModel(providerConfig);

  // Build utilities documentation
  const utilitiesDoc = availableUtilities.length > 0 ? `
    
    AVAILABLE UTILITIES:
    You have access to these pre-built functions that you can use in your components:
    
    ${availableUtilities.map(util => `
    • ${util.name}: ${util.description}
      Signature: ${util.signature}${util.returnType ? `
      Returns: ${util.returnType}` : ''}${util.importPath ? `
      Import: import { ${util.name} } from '${util.importPath}';` : ''}${util.example ? `
      Example: ${util.example}` : ''}
    `).join('')}
    
    When using these utilities, use React hooks like useState and useEffect for async operations.
    Always handle loading states and errors gracefully.
    IMPORTANT: Always use the exact import paths specified above for each utility.
    
    🔒 SECURITY NOTE: These utilities are the ONLY way to make API calls or fetch data.
    NEVER use fetch(), XMLHttpRequest, or any other direct network calls.
    ` : '';

  // Build components documentation
  const componentsDoc = availableComponents.length > 0 ? `
    
    AVAILABLE COMPONENTS:
    You have access to these pre-built React components that you can use in your generated components:
    
    ${availableComponents.map(comp => `
    • ${comp.name}: ${comp.description}${comp.props ? `
      Props: ${comp.props}` : ''}${comp.category ? `
      Category: ${comp.category}` : ''}${comp.importPath ? `
      Import: import { ${comp.name} } from '${comp.importPath}';` : ''}${comp.example ? `
      Example: ${comp.example}` : ''}
    `).join('')}
    
    When using these components, import them as specified and use them like regular React components.
    You can combine these components with your own custom components.
    IMPORTANT: Always use the exact import paths specified above for each component.
    ` : '';

  const typeScriptNote = config.allowTypescript
    ? `
    TypeScript interfaces are ALLOWED for props definitions.
    HOWEVER, due to MDX limitations, you MUST follow these rules:

    ✅ CORRECT - Non-destructured parameters:
    interface Props { name: string; email: string; }
    export const Component = (props: Props) => {
      const { name, email } = props;
      return <div>{name}</div>;
    };

    ❌ WRONG - Destructured parameters with types:
    export const Component = ({ name, email }: Props) => { ... }  // CAUSES PARSE ERROR!

    ❌ WRONG - Type annotations on exports:
    export const Component: React.FC<Props> = ...  // CAUSES PARSE ERROR!

    CRITICAL: NEVER use type annotations in function parameter destructuring. ALWAYS use non-destructured parameters with types.
    `
    : `
    ONLY use JavaScript syntax. Do NOT use TypeScript type annotations, interfaces, or type definitions.
    All code must be valid JavaScript without any TypeScript-specific syntax.
    `;

  const { text } = await generateText({
    model,
    system: `
      🚨 SECURITY REQUIREMENTS 🚨
      
      Your generated code will be AUTOMATICALLY VALIDATED for security violations.
      Follow these rules to avoid failures:
      
      ❌ FORBIDDEN - THESE WILL CAUSE FAILURES:
      - fetch() calls ← USE provided utilities INSTEAD
      - eval() function ← NEVER USE
      - <script> tags ← NEVER USE
      - javascript: URLs ← NEVER USE
      - innerHTML/outerHTML ← NEVER USE
      - require() statements ← NEVER USE
      - process.* access ← NEVER USE
      - window.location manipulation ← NEVER USE
      - localStorage/sessionStorage ← USE WITH CAUTION (only if really needed)
      
      ✅ PREFERRED PATTERNS:
      - onClick={handleClick} (React event handlers)
      - onChange={handleChange} (React event handlers)
      - onSubmit={handleSubmit} (React event handlers)
      - Provided utilities for API calls
      - Standard React hooks (useState, useEffect)
      - Inline styles or CSS classes
      
      ♿ ACCESSIBILITY REQUIREMENTS:
      - Add aria-label to interactive elements without text
      - Use semantic HTML elements where appropriate
      - Ensure keyboard navigation is possible (onKeyDown handlers)
      - Add alt text to images
      - Use proper form labels (htmlFor/id or aria-label)
      - Support focus management
      
      💡 BEST PRACTICE: Use React event handlers (onClick={}) for better React integration.
      
      You are an expert React component developer.
      Generate a React component in MDX format that will be compiled and rendered.

      CRITICAL:
      - Do NOT wrap the output in code blocks or markdown. Output raw MDX content only.
      - You are writing JSX/React code. Prefer React patterns for better integration!
      - onClick={} is preferred over onclick="" for React compatibility.
      ${typeScriptNote}
      
      IMPORT REQUIREMENTS:
      - ALWAYS use named imports for utilities and components (e.g., import { UtilityName } from 'path')
      - NEVER use default imports for utilities or components (except for Demo component)
      - Use the exact import paths specified in the documentation
      
      Format:
      1. Start with YAML frontmatter containing component metadata
      2. Add React imports (import React from 'react')
      3. Add utility/component imports using NAMED IMPORTS (import { Name } from 'path')
      4. Define the component with inline styles
      5. End with JSX that renders the component instance
      
      Frontmatter should include useful metadata like:
      - title: Component name
      - description: Brief description
      - category: Component category (ui, form, layout, etc.)
      - tags: Array of relevant tags
      - version: Component version (default "1.0.0")${utilitiesDoc}${componentsDoc}${fewShotExamples}
      
      Example output format:

      ---
      title: "Blue Button"
      description: "A styled button component with blue background and white text"
      category: "ui"
      tags: ["button", "interactive", "ui"]
      version: "1.0.0"
      ---

      import React from 'react';
      // Example of named imports for utilities/components:
      // import { UtilityName } from '@/utils/api';
      // import { ComponentName } from '@/components/ComponentName';

      export const Button = () => {
        const handleClick = () => {
          console.log('Button clicked - React event handler used correctly!');
        };

        return (
          <button
            style={{backgroundColor: 'blue', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px'}}
            onClick={handleClick}
            aria-label="Click me button"
          >
            Click Me
          </button>
        );
      };

      <Button />
      
      💡 TIP: Always consider accessibility and use proper ARIA attributes!
    `.trim(),
    prompt,
  });

  // Strip any markdown code blocks the LLM might have added
  return stripCodeBlocks(text);
};

interface GenerateComponentOptions {
  prompt: string;
  /** The absolute path to the root of the consuming application. */
  projectPath: string;
  /** AI provider configuration. Defaults to OpenAI GPT-4. */
  provider?: AIProviderConfig;
  /** Available utilities/functions that can be used in generated components */
  availableUtilities?: AvailableUtility[];
  /** Available UI components that can be used in generated components */
  availableComponents?: AvailableComponent[];
  /** Optional configuration (will be auto-loaded if not provided) */
  config?: VibeOverlordConfig;
  /** Optional pre-scanned catalog (for performance) */
  catalog?: ScannedCatalog;
}

export async function generateComponent({
  prompt,
  projectPath,
  provider = { provider: 'openai' },
  availableUtilities = [],
  availableComponents = [],
  config,
  catalog
}: GenerateComponentOptions) {
  const logger = createSecureLogger();

  try {
    // Validate inputs
    const validatedPrompt = PromptSchema.parse(prompt);
    const validatedProjectPath = ProjectPathSchema.parse(projectPath);
    const validatedProvider = AIProviderSchema.parse(provider);

    // Sanitize the prompt
    const sanitizedPrompt = sanitizePrompt(validatedPrompt);

    // Secure the project path
    const secureProjectPath = securePath(process.cwd(), validatedProjectPath);

    // Load configuration
    const finalConfig = config || await loadConfig(secureProjectPath);

    logger.info('Generating component', {
      promptLength: sanitizedPrompt.length,
      provider: validatedProvider.provider,
      model: validatedProvider.model || 'default',
      useTwoPhase: finalConfig.useTwoPhaseGeneration,
      useAstValidation: finalConfig.useAstValidation
    });

    // Scan project if catalog not provided
    let finalCatalog = catalog;
    let retrievedUtilities = availableUtilities;
    let retrievedComponents = availableComponents;

    if (!finalCatalog && (finalConfig.componentGlobs.length > 0 || finalConfig.utilityGlobs.length > 0)) {
      logger.info('Scanning project for components and utilities...');
      finalCatalog = await scanProject(secureProjectPath, finalConfig);

      // Retrieve relevant items based on prompt
      const relevant = retrieveRelevantItems(sanitizedPrompt, finalCatalog, finalConfig.maxContextItems);
      retrievedUtilities = [...availableUtilities, ...relevant.utilities];
      retrievedComponents = [...availableComponents, ...relevant.components];

      logger.info('Found relevant items', {
        utilities: retrievedUtilities.length,
        components: retrievedComponents.length
      });
    }

    // Load templates
    let templates = finalConfig.templates?.enabled ? loadBuiltInTemplates() : [];
    if (finalConfig.templates?.customTemplatesDir) {
      const customTemplates = loadCustomTemplates(finalConfig.templates.customTemplatesDir);
      templates = [...templates, ...customTemplates];
    }

    const relevantTemplates = findRelevantTemplates(sanitizedPrompt, templates, 2);
    const fewShotExamples = buildFewShotExamples(relevantTemplates);

    let mdxSource: string;
    let spec: ComponentSpec | undefined;

    // Two-phase generation
    if (finalConfig.useTwoPhaseGeneration && finalCatalog) {
      logger.info('Using two-phase generation (plan → implement)');

      // Phase 1: Plan
      spec = await planComponent(sanitizedPrompt, finalCatalog, validatedProvider, finalConfig.maxContextItems);
      logger.info('Component spec created', { componentName: spec.name });

      // Phase 2: Implement from spec
      const implementationPrompt = specToImplementationPrompt(spec);
      mdxSource = await getMdxFromLlm(
        implementationPrompt,
        validatedProvider,
        retrievedUtilities,
        retrievedComponents,
        finalConfig,
        fewShotExamples
      );
    } else {
      // Single-phase generation
      mdxSource = await getMdxFromLlm(
        sanitizedPrompt,
        validatedProvider,
        retrievedUtilities,
        retrievedComponents,
        finalConfig,
        fewShotExamples
      );
    }

    // Validate the generated code
    let validationResult;

    if (finalConfig.useAstValidation) {
      // Use AST-based validation (more robust)
      validationResult = validateCodeWithAst(mdxSource, finalConfig);

      if (validationResult.warnings.length > 0) {
        logger.warn('Code validation warnings', { warnings: validationResult.warnings });
      }
    } else {
      // Fall back to regex-based validation
      validationResult = validateGeneratedCode(mdxSource);
    }

    if (!validationResult.isValid) {
      logger.warn('Generated code failed security validation', { errors: validationResult.errors });

      // Self-healing: retry once if enabled
      if (finalConfig.enableSelfHealing && finalConfig.maxRetries > 0) {
        logger.info('Attempting self-healing retry...');

        const errorContext = `
⚠️ PREVIOUS ATTEMPT FAILED WITH THESE ERRORS:
${validationResult.errors.join('\n')}

CRITICAL INSTRUCTIONS FOR RETRY:
- Fix the errors above
- Do NOT wrap output in code blocks (no \`\`\`mdx or \`\`\`typescript)
- Output ONLY raw MDX content
- Start with --- frontmatter, then imports, then component code
`;

        const retryPrompt = sanitizedPrompt + '\n\n' + errorContext;
        mdxSource = await getMdxFromLlm(
          retryPrompt,
          validatedProvider,
          retrievedUtilities,
          retrievedComponents,
          finalConfig,
          fewShotExamples
        );

        // Re-validate
        validationResult = finalConfig.useAstValidation
          ? validateCodeWithAst(mdxSource, finalConfig)
          : validateGeneratedCode(mdxSource);

        if (!validationResult.isValid) {
          throw new Error(`Generated code contains security violations after retry: ${validationResult.errors.join(', ')}`);
        }

        logger.info('Self-healing successful');
      } else {
        throw new Error(`Generated code contains security violations: ${validationResult.errors.join(', ')}`);
      }
    }

    // Ensure frontmatter exists
    let processedMdxSource = mdxSource;
    if (!mdxSource.trim().startsWith('---')) {
      const title = sanitizedPrompt.slice(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Generated Component';
      const defaultFrontmatter = `---
title: "${title}"
description: "AI-generated React component"
category: "ui"
tags: ["generated", "component"]
version: "1.0.0"
---

`;
      processedMdxSource = defaultFrontmatter + mdxSource;
    }

    // Transpile TypeScript to JavaScript for MDX compatibility
    if (finalConfig.allowTypescript) {
      processedMdxSource = fixTypeScriptForMDX(processedMdxSource);
      logger.info('Transpiled TypeScript to JavaScript for MDX compatibility');
    }

    // Compile with mdx-bundler
    let code: string;
    let frontmatter: any;

    try {
      const result = await bundleMDX({
        source: processedMdxSource,
        cwd: secureProjectPath,
        esbuildOptions: (options) => {
          // Mark all relative and alias imports as external
          // This prevents bundler from trying to resolve them
          // They'll be resolved at runtime by the consuming app
          options.plugins = [
            ...(options.plugins || []),
            {
              name: 'external-project-imports',
              setup(build) {
                // Mark relative imports as external (./utils, ../components, etc)
                build.onResolve({ filter: /^\.\.?\// }, args => ({
                  path: args.path,
                  external: true
                }));

                // Mark @/ alias imports as external
                build.onResolve({ filter: /^@\// }, args => ({
                  path: args.path,
                  external: true
                }));
              }
            }
          ];
          return options;
        }
      });
      code = result.code;
      frontmatter = result.frontmatter;
    } catch (bundleError) {
      logger.error('MDX bundling failed', {
        error: bundleError,
        generatedSource: processedMdxSource.substring(0, 1000) // Log first 1000 chars to see line 18
      });
      throw new Error(`Failed to compile generated component: ${bundleError instanceof Error ? bundleError.message : 'Unknown bundling error'}`);
    }

    logger.info('Component generated successfully');
    return {
      code,
      frontmatter,
      spec // Include spec if two-phase generation was used
    };

  } catch (error) {
    logger.error('Component generation failed', error);
    throw error;
  }
}

// Export all types and utilities
export {
  PromptSchema,
  ProjectPathSchema,
  AIProviderSchema,
  validateGeneratedCode,
  sanitizePrompt,
  RateLimiter,
  securePath,
  validateEnvironment,
  createSecureLogger
} from './security.js';

export {
  VibeOverlordConfig,
  defaultConfig,
  loadConfig,
  generateDefaultConfigFile
} from './config.js';

export {
  scanProject,
  ScannedCatalog,
  retrieveRelevantItems
} from './scanner.js';

export {
  ComponentSpec,
  planComponent,
  specToImplementationPrompt,
  validateComponentSpec
} from './planner.js';

export {
  validateCodeWithAst,
  extractImports
} from './ast-validator.js';

export type { VibeOverlordConfig as Config };
