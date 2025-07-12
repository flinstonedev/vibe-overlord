import { bundleMDX } from 'mdx-bundler';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import {
  PromptSchema,
  ProjectPathSchema,
  AIProviderSchema,
  validateGeneratedCode,
  sanitizePrompt,
  securePath,
  createSecureLogger
} from './security.js';

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

const getDefaultModel = (provider: AIProvider): string => {
  switch (provider) {
    case 'openai':
      return 'gpt-4o';
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
    case 'google':
      return 'gemini-2.5-pro-latest';
    default:
      return 'gpt-4o';
  }
};

const getProviderModel = (config: AIProviderConfig) => {
  const model = config.model || getDefaultModel(config.provider);

  switch (config.provider) {
    case 'openai':
      return openai(model);
    case 'anthropic':
      return anthropic(model);
    case 'google':
      return google(model);
    default:
      return openai(model);
  }
};

const getMdxFromLlm = async (prompt: string, providerConfig: AIProviderConfig = { provider: 'openai' }, availableUtilities: AvailableUtility[] = [], availableComponents: AvailableComponent[] = []) => {
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
      - localStorage/sessionStorage ← NEVER USE
      
      ✅ PREFERRED PATTERNS:
      - onClick={handleClick} (React event handlers)
      - onChange={handleChange} (React event handlers)
      - onSubmit={handleSubmit} (React event handlers)
      - Provided utilities for API calls
      - Standard React hooks (useState, useEffect)
      - Inline styles or CSS classes
      
      💡 BEST PRACTICE: Use React event handlers (onClick={}) for better React integration,
      but HTML event handlers are also acceptable in MDX contexts.
      
      You are an expert React component developer.
      Generate a React component in MDX format that will be compiled and rendered.
      
      CRITICAL: 
      - Do NOT wrap the output in code blocks or markdown. Output raw MDX content only.
      - You are writing JSX/React code. Prefer React patterns for better integration!
      - onClick={} is preferred over onclick="" for React compatibility.
      
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
      - version: Component version (default "1.0.0")${utilitiesDoc}${componentsDoc}
      
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
            onClick={handleClick} // ✅ PREFERRED: React event handler
            // onclick="alert('test')" // ⚠️ ACCEPTABLE: HTML event handler (but React is preferred)
          >
            Click Me
          </button>
        );
      };
      
      <Button />
      
      💡 TIP: Prefer React event handlers (onClick={}) for better React integration!
    `.trim(),
    prompt,
  });

  return text;
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
}

export async function generateComponent({ prompt, projectPath, provider = { provider: 'openai' }, availableUtilities = [], availableComponents = [] }: GenerateComponentOptions) {
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

    logger.info('Generating component', {
      promptLength: sanitizedPrompt.length,
      provider: validatedProvider.provider,
      model: validatedProvider.model || 'default'
    });

    const mdxSource = await getMdxFromLlm(sanitizedPrompt, validatedProvider, availableUtilities, availableComponents);

    // Validate the generated code for security issues (source code validation)
    const codeValidation = validateGeneratedCode(mdxSource);
    if (!codeValidation.isValid) {
      logger.warn('Generated code failed security validation', { errors: codeValidation.errors });
      throw new Error(`Generated code contains security violations: ${codeValidation.errors.join(', ')}`);
    }

    // Ensure frontmatter exists - if not, add default frontmatter
    let processedMdxSource = mdxSource;
    if (!mdxSource.trim().startsWith('---')) {
      // Extract a reasonable title from the prompt (sanitized)
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

    // `mdx-bundler` will use the `cwd` to resolve imports safely
    const { code, frontmatter } = await bundleMDX({
      source: processedMdxSource,
      cwd: secureProjectPath,
    });

    // NOTE: We only validate the source MDX/JSX code, NOT the compiled JavaScript.
    // The compiled code naturally contains patterns that look like HTML event handlers
    // but are actually the result of compiling React JSX into executable JavaScript.
    // Validating compiled code would cause false positives for legitimate React patterns.

    logger.info('Component generated successfully');
    return { code, frontmatter };

  } catch (error) {
    logger.error('Component generation failed', error);
    throw error;
  }
}

// Export security utilities for use in API routes
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