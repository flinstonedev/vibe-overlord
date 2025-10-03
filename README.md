# Vibe Overlord

🎨 **AI-Powered React Component Generation**

Vibe Overlord is a TypeScript library that uses AI to generate React components from natural language prompts. It leverages LLMs to create production-ready components with automatic discovery of your existing components and utilities.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Advanced Features](#advanced-features)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Features

### Core Features
- 🤖 **AI-Powered Generation**: Uses multiple AI providers (OpenAI, Anthropic, Google)
- 📦 **MDX Compilation**: Compiles components using `mdx-bundler` for immediate rendering
- 🔧 **TypeScript Support**: Full TypeScript support with type definitions
- 🎯 **Framework Agnostic**: Works with Next.js, Vite, Remix, or any React framework
- 🔄 **Real-time Rendering**: Generate and render components instantly
- ⚙️ **Multi-Provider**: Switch between OpenAI, Anthropic (Claude), and Google (Gemini)

### Advanced Features
- 🔍 **Auto-Discovery**: Automatically scans and catalogs your components/utilities using AST parsing
- 🧠 **Two-Phase Generation**: Plan → Implement workflow for better component architecture
- 🛡️ **AST-Based Validation**: Robust security and quality checks using Abstract Syntax Trees
- 🔄 **Self-Healing**: Automatically retries and fixes validation errors
- 📚 **Template Library**: Few-shot learning from built-in patterns (forms, tables, modals)
- 🎨 **Design System Aware**: Automatically uses your existing components
- ♿ **Accessibility First**: Built-in accessibility guidance and validation

## Installation

```bash
npm install vibe-overlord mdx-bundler ai zod @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

**Required Dependencies:**
- `mdx-bundler` - Core MDX compilation engine
- `ai` - AI SDK framework for provider integration  
- `zod` - Runtime schema validation
- `@ai-sdk/openai` - OpenAI provider (GPT-4, etc.)
- `@ai-sdk/anthropic` - Anthropic provider (Claude)
- `@ai-sdk/google` - Google provider (Gemini)

## Quick Start

### 1. Set Up Environment

Create a `.env.local` file with at least one API key:

```bash
# OpenAI (default)
OPENAI_API_KEY=your_openai_key_here

# Or Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_key_here

# Or Google (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key_here
```

### 2. Basic Usage

```typescript
import { generateComponent } from 'vibe-overlord';
import path from 'path';

  const { code, frontmatter } = await generateComponent({
  prompt: "Create a blue button with rounded corners",
  projectPath: path.resolve(process.cwd())
});
```

### 3. Next.js Integration

**API Route** (`app/api/generate/route.ts`):
```typescript
import { generateComponent } from 'vibe-overlord';
import { NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: Request) {
    const { prompt } = await request.json();
    
    const { code, frontmatter } = await generateComponent({
      prompt,
    projectPath: path.resolve(process.cwd()),
      provider: { provider: 'openai' }
    });
    
    return NextResponse.json({ code, frontmatter });
}
```

**Client Component** (`app/page.tsx`):
```typescript
'use client';
import { useState } from 'react';
import { getMDXComponent } from 'vibe-overlord/client';

export default function Home() {
  const [code, setCode] = useState('');

  const generate = async (prompt: string) => {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const { code } = await response.json();
    setCode(code);
  };

  const Component = code ? getMDXComponent(code) : null;

  return (
    <div>
      <button onClick={() => generate('Create a blue button')}>
        Generate
      </button>
      {Component && <Component />}
    </div>
  );
}
```

## Advanced Features

### Auto-Discovery

Automatically discover and use your existing components and utilities.

**1. Create Configuration** (`vibe-overlord.config.ts`):

```typescript
import { VibeOverlordConfig } from 'vibe-overlord';

const config: VibeOverlordConfig = {
  componentGlobs: ['src/components/**/*.{tsx,jsx}'],
  utilityGlobs: ['src/utils/**/*.{ts,tsx}'],
  autoDetectAliases: true,
  useTwoPhaseGeneration: true,
  enableSelfHealing: true,
  useAstValidation: true,
  allowTypescript: true
};

export default config;
```

**2. Use in API Route**:

```typescript
import { generateComponent, loadConfig, scanProject } from 'vibe-overlord';
import path from 'path';

// Cache the catalog
let catalogCache = null;
let lastScan = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function POST(request: Request) {
  const { prompt } = await request.json();
  const projectPath = path.resolve(process.cwd());
  
  // Load config
  const config = await loadConfig(projectPath);
  
  // Scan project (with caching)
  const now = Date.now();
  if (!catalogCache || now - lastScan > CACHE_TTL) {
    catalogCache = await scanProject(projectPath, config);
    lastScan = now;
  }
  
  // Generate with auto-discovery
  const { code, frontmatter, spec } = await generateComponent({
    prompt,
    projectPath,
    config,
    catalog: catalogCache
  });
  
  return NextResponse.json({ code, frontmatter, spec });
}
```

**What Gets Auto-Discovered:**

Your components:
```typescript
// src/components/Button.tsx
/**
 * @description A customizable button with variants
 */
export const Button = ({ variant, children }) => {
  // AI will know about this and use it!
};
```

Your utilities:
```typescript
// src/utils/api.ts
/**
 * @description Fetch user data from API
 */
export async function fetchUsers() {
  // AI will know about this and use it!
}
```

### Two-Phase Generation

Generate components in two phases for better architecture.

**Enable in config:**
```typescript
{
  useTwoPhaseGeneration: true
}
```

**Phase 1 - Planning**: AI creates a component specification
**Phase 2 - Implementation**: AI generates code from the spec

**View the spec:**
```typescript
const { code, frontmatter, spec } = await generateComponent({
  prompt: 'Create a data table with sorting',
  projectPath,
  config
});

console.log(spec.name);        // Component name
console.log(spec.state);       // State management
console.log(spec.props);       // Props definition
console.log(spec.interactions); // User interactions
```

### Template Library

Learn from built-in patterns for better results.

**Built-in Templates:**
- Form with validation
- Data table with sorting
- Modal dialog with accessibility

**Add Custom Templates:**
```typescript
// vibe-overlord.config.ts
{
  templates: {
    enabled: true,
    customTemplatesDir: './src/templates'
  }
}
```

Create MDX templates:
```mdx
---
title: "My Custom Pattern"
description: "Description"
category: "ui"
tags: ["custom"]
pattern: "custom-pattern"
---

import React from 'react';

export const MyPattern = () => {
  // Your example implementation
};

<MyPattern />
```

## Configuration

### Configuration File

Create `vibe-overlord.config.ts` in your project root:

```typescript
import { VibeOverlordConfig } from 'vibe-overlord';

const config: VibeOverlordConfig = {
  // Scanning patterns
  componentGlobs: [
    'src/components/**/*.{tsx,jsx}',
    'app/components/**/*.{tsx,jsx}'
  ],
  utilityGlobs: [
    'src/utils/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}'
  ],
  excludeGlobs: [
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/node_modules/**'
  ],
  
  // Aliases
  autoDetectAliases: true, // Detect from tsconfig.json
  aliases: {
    '@': './src',
    '@/components': './src/components'
  },
  
  // Context
  maxContextItems: 10,
  useEmbeddings: false, // Requires OpenAI key
  
  // Generation
  allowTypescript: true,
  useTwoPhaseGeneration: true,
  enableSelfHealing: true,
  maxRetries: 1,
  
  // Validation
  useAstValidation: true,
  allowedImports: [
    'react',
    'react-dom',
    'next',
    'lucide-react' // Add your libraries
  ],
  
  // Templates
  templates: {
    enabled: true,
    customTemplatesDir: './src/templates'
  }
};

export default config;
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `componentGlobs` | `string[]` | `['src/components/**/*.{tsx,jsx}']` | Patterns to find components |
| `utilityGlobs` | `string[]` | `['src/utils/**/*.{ts,tsx}']` | Patterns to find utilities |
| `autoDetectAliases` | `boolean` | `true` | Auto-detect from tsconfig.json |
| `maxContextItems` | `number` | `10` | Max items to inject into context |
| `useTwoPhaseGeneration` | `boolean` | `false` | Use plan → implement flow |
| `enableSelfHealing` | `boolean` | `true` | Auto-retry on errors |
| `useAstValidation` | `boolean` | `true` | Use AST-based validation |
| `allowTypescript` | `boolean` | `false` | Allow TypeScript output |

## API Reference

### `generateComponent(options)`

Generates a React component from a text prompt.

**Parameters:**

```typescript
interface GenerateComponentOptions {
  prompt: string;              // Component description
  projectPath: string;         // Absolute path to project
  provider?: {                 // AI provider config
    provider: 'openai' | 'anthropic' | 'google';
    model?: string;
  };
  config?: VibeOverlordConfig; // Optional config
  catalog?: ScannedCatalog;    // Optional pre-scanned catalog
}
```

**Returns:**

```typescript
{
  code: string;          // Compiled MDX code
  frontmatter: {         // Component metadata
    title?: string;
    description?: string;
    category?: string;
    tags?: string[];
    version?: string;
  };
  spec?: ComponentSpec;  // Planning phase output (if two-phase enabled)
}
```

### `scanProject(projectPath, config)`

Scans project for components and utilities.

**Returns:**

```typescript
{
  components: AvailableComponent[];
  utilities: AvailableUtility[];
  embeddings?: Map<string, number[]>;
}
```

### `loadConfig(projectPath)`

Loads configuration from `vibe-overlord.config.ts`.

### `getMDXComponent(code)`

Creates a React component from compiled MDX code (client-side).

## Examples

### Simple Button

```typescript
const { code } = await generateComponent({
  prompt: 'Create a blue button with rounded corners',
  projectPath: process.cwd()
});
```

### Using Auto-Discovered Components

```typescript
// Your Button component will be auto-discovered
const { code } = await generateComponent({
  prompt: 'Create a pricing page using Button and Card components',
  projectPath: process.cwd()
});
```

### With Data Fetching

```typescript
// Your fetchUsers utility will be auto-discovered
const { code } = await generateComponent({
  prompt: 'Create a user list that fetches users and displays them in cards',
  projectPath: process.cwd()
});
```

### Complex Components

```typescript
const { code, spec } = await generateComponent({
  prompt: 'Create a data table with sorting, pagination, and row actions',
  projectPath: process.cwd(),
  config: {
    useTwoPhaseGeneration: true,
    enableSelfHealing: true
  }
});

// View the planning phase
console.log('Component spec:', spec);
```

### Different AI Providers

```typescript
// OpenAI (default)
const { code } = await generateComponent({
  prompt: 'Create a modal dialog',
  projectPath: process.cwd(),
  provider: { provider: 'openai' }
});

// Anthropic Claude
const { code } = await generateComponent({
  prompt: 'Create a modal dialog',
  projectPath: process.cwd(),
  provider: { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' }
});

// Google Gemini
const { code } = await generateComponent({
  prompt: 'Create a modal dialog',
  projectPath: process.cwd(),
  provider: { provider: 'google', model: 'gemini-2.5-pro-latest' }
});
```

## Security

### Built-in Security Features

- **Input Validation**: All prompts validated with Zod schemas
- **AST-Based Validation**: Robust checks using Babel parser
- **Import Allowlist**: Only approved imports allowed
- **Sanitization**: Removes dangerous patterns
- **Secure Logging**: Redacts sensitive information

### Security Checks

**Blocked Patterns:**
- `eval()`, `Function()` constructor
- Direct network calls (`fetch`, `XMLHttpRequest`)
- Process/global object access
- `innerHTML`, `outerHTML` assignments
- Node.js built-ins
- Cookie manipulation

**Example Usage with Security:**

```typescript
import { 
  generateComponent, 
  RateLimiter, 
  validateEnvironment 
} from 'vibe-overlord';

// Rate limiting
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10
});

// Environment validation
const envValidation = validateEnvironment();
if (!envValidation.isValid) {
  console.error(envValidation.errors);
}

export async function POST(request: Request) {
  const clientIP = request.headers.get('x-forwarded-for');
  
  if (!rateLimiter.isAllowed(clientIP)) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  
  // Generate component securely
  const { code } = await generateComponent({
    prompt: await request.text(),
    projectPath: process.cwd()
  });
  
  return Response.json({ code });
}
```

## Troubleshooting

### Build Errors

**"Cannot find module 'vibe-overlord'"**
```bash
# Install dependencies
npm install vibe-overlord mdx-bundler ai zod @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

**"Module not found: @babel/parser"**
```bash
# Dependencies are included, try:
npm install
npm run build
```

### Generation Issues

**"No components discovered"**
- Check `componentGlobs` patterns in config
- Ensure components are exported
- Verify components are in the specified directories

**"Generated code has errors"**
- Enable `allowTypescript: true` if using TypeScript
- Check `autoDetectAliases: true` is set
- Verify imports in `allowedImports` list

**"Generation is slow"**
- Reduce `maxContextItems` in config
- Disable `useTwoPhaseGeneration` for simple components
- Implement catalog caching (see Advanced Features)

**"Component doesn't use my components"**
- Ensure components have JSDoc descriptions
- Try mentioning them explicitly in prompt
- Check scanning patterns in config

### Validation Errors

**"Import validation failed"**
```typescript
// Add to allowedImports in config
{
  allowedImports: [
    'react',
    'react-dom',
    'your-library-name' // Add your library
  ]
}
```

**"Security violation"**
- Review the error message
- Check if using forbidden patterns
- Use provided utilities for network calls

## Performance Optimization

### Catalog Caching

```typescript
let catalogCache = null;
let lastScan = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function POST(request: Request) {
  const now = Date.now();
  
  if (!catalogCache || now - lastScan > CACHE_TTL) {
    catalogCache = await scanProject(projectPath, config);
    lastScan = now;
  }
  
  const { code } = await generateComponent({
    prompt,
    projectPath,
    catalog: catalogCache // Use cached catalog
  });
}
```

### Configuration Tips

```typescript
{
  maxContextItems: 10,           // Don't inject too many items
  useTwoPhaseGeneration: false,  // Disable for simple components
  useEmbeddings: false,          // Unless needed for semantic search
  templates: {
    enabled: false                // Disable if not using templates
  }
}
```

## Supported AI Providers

| Provider | Models | Default Model |
|----------|--------|---------------|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo | gpt-4o |
| **Anthropic** | claude-3-5-sonnet-20241022, claude-3-haiku | claude-3-5-sonnet-20241022 |
| **Google** | gemini-2.5-pro-latest, gemini-1.5-flash | gemini-2.5-pro-latest |

## Example Project

Check out the included example in the `./example` directory:

```bash
cd example
npm install
npm run dev
```

The example demonstrates:
- Auto-discovery of components/utilities
- Two-phase generation with spec viewer
- All AI providers
- Template library usage
- Real-time rendering

## Requirements

- Node.js 18+
- React 18+
- At least one AI provider API key

## Migration from v1.x

No breaking changes! All existing code works without modifications.

**To use new features:**

1. Create `vibe-overlord.config.ts`
2. Enable features in config
3. Auto-discovery works automatically

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Acknowledgments

Built on [mdx-bundler](https://github.com/kentcdodds/mdx-bundler) by Kent C. Dodds.

## Support

- [GitHub Issues](https://github.com/your-repo/vibe-overlord/issues)
- [Example Project](./example)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)

## Releasing (npm)

This repo uses Changesets + GitHub Actions to publish to npm and create GitHub Releases automatically.

### Prerequisites

- Set repository secret `NPM_TOKEN` with an npm token that has publish access
- The workflow `.github/workflows/release.yml` already has the right permissions:
  - `contents: write` and `pull-requests: write`
  - Uses Changesets’ built‑in GitHub Release creation (`createGithubReleases: true`)

### Standard release flow (latest)

1) Create a changeset (choose patch/minor/major):

```bash
npx @changesets/cli add
git add .
git commit -m "chore: add changeset"
git push
```

2) The Release PR is opened automatically by the workflow (title: "Release"). Review and merge it.

3) When the Release PR merges into `main`, the workflow:
- builds the package
- publishes to npm (new version)
- creates a Git tag `vX.Y.Z`
- creates a GitHub Release with notes

That’s it—no manual tagging or publishing required.

### Safe test: prerelease to `next` (doesn’t change `latest`)

```bash
# enter prerelease mode (publishes under the `next` dist-tag)
npx @changesets/cli pre enter next

# add a tiny patch changeset and commit
npx @changesets/cli add
git add .
git commit -m "chore: prerelease test"
git push

# a Release PR will open; merge it → publish to `next`

# after testing, exit prerelease mode so future releases are normal
npx @changesets/cli pre exit
git add .changeset/pre.json || true
git commit -m "chore: exit prerelease mode" || true
git push
```

### Reruns and idempotency

- The publish step is idempotent (we ignore EPUBLISHCONFLICT/“previously published version” on reruns)
- If a job is retried after a successful publish, it will still pass
- GitHub Release creation is handled by Changesets, so tag/release races are avoided

### Common issues & fixes

- "Cannot publish over previously published version" during a retry: expected; rerun succeeds due to idempotent publish
- "Resource not accessible by integration" creating the Release PR: ensure workflow `permissions: contents: write` and `pull-requests: write`
- Do not force‑push `main` during a release; if you do, just let the workflow rerun—publishing is safe
- To rollback what users install without deleting versions: use `npm dist-tag add vibe-overlord@<version> latest` and/or `npm deprecate`
