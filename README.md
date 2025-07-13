# Vibe Overlord

🎨 **AI-Powered React Component Generation**

Vibe Overlord is a TypeScript library that uses AI to generate React components from natural language prompts. It leverages LLMs
## Features

- 🤖 **AI-Powered Generation**: Uses multiple AI providers (OpenAI, Anthropic, Google) to generate React components from text prompts
- 📦 **MDX Compilation**: Compiles generated components using `mdx-bundler` for immediate rendering
- 🔧 **TypeScript Support**: Full TypeScript support with type definitions
- 🎯 **Flexible Integration**: Works with any React framework (Next.js, Vite, etc.)
- 🔄 **Real-time Rendering**: Generate and render components instantly
- 📝 **Custom Components**: Support for importing and using your own components
- 🧩 **Component Library Integration**: AI automatically knows about your reusable UI components
- 🌐 **API Integration**: Automatic utility detection - AI knows what functions are available without explicit prompting
- ⚙️ **Multi-Provider Support**: Switch between OpenAI, Anthropic (Claude), and Google (Gemini)
- 🎨 **Design System Aware**: Generate components that use your existing design system components

## Installation

```bash
# Install vibe-overlord and required dependencies
npm install vibe-overlord mdx-bundler ai zod @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

**Required Dependencies:**
Vibe Overlord requires these peer dependencies to be installed:
- `mdx-bundler` - Core MDX compilation engine
- `ai` - AI SDK framework for provider integration  
- `zod` - Runtime schema validation
- `@ai-sdk/openai` - OpenAI provider (GPT-4, etc.)
- `@ai-sdk/anthropic` - Anthropic provider (Claude)
- `@ai-sdk/google` - Google provider (Gemini)

> ⚠️ **Important**: All dependencies must be installed for vibe-overlord to work properly.

## Prerequisites

Vibe Overlord supports multiple AI providers. You'll need at least one API key:

**OpenAI (default):**
```bash
export OPENAI_API_KEY=your_api_key_here
```

**Anthropic (Claude):**
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

**Google (Gemini):**
```bash
export GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here
```

**Environment Setup:**
Copy the provided environment example file and add your API keys:
```bash
cp env.example .env.local
# Edit .env.local and add your API key(s)
```

## Quick Start

### Server-side Generation

```typescript
import { generateComponent } from 'vibe-overlord';
import path from 'path';

async function generateMyComponent() {
  const { code, frontmatter } = await generateComponent({
    prompt: "Create a blue button with rounded corners that says 'Click me!'",
    projectPath: path.resolve(process.cwd()), // Always use project root
    // Optional: specify AI provider (defaults to OpenAI)
    provider: { provider: 'openai' } // or 'anthropic' or 'google'
  });
  
  return { code, frontmatter };
}
```

### Client-side Rendering

```typescript
import { getMDXComponent } from 'vibe-overlord/client';

// Get the compiled code from your server
const Component = getMDXComponent(code);

// Render it in your React app
function MyApp() {
  return (
    <div>
      <Component components={{ /* your custom components */ }} />
    </div>
  );
}
```

### Complete Next.js Example

Here's a working example that you can copy-paste into a new Next.js project:

**1. API Route** (`app/api/generate/route.ts`):
```typescript
import { generateComponent } from 'vibe-overlord';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    const { code, frontmatter } = await generateComponent({
      prompt,
      projectPath: path.resolve(process.cwd()), // Project root
      provider: { provider: 'openai' }
    });
    
    return NextResponse.json({ code, frontmatter });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 });
  }
}
```

**2. Client Component** (`app/page.tsx`):
```typescript
'use client';
import { useState } from 'react';
import { getMDXComponent } from 'vibe-overlord/client';

export default function Home() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async (prompt: string) => {
    setLoading(true);
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const result = await response.json();
    setCode(result.code);
    setLoading(false);
  };

  const Component = code ? getMDXComponent(code) : null;

  return (
    <div className="p-8">
      <button 
        onClick={() => generate('Create a blue button that says Hello')}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Component'}
      </button>
      {Component && <Component />}
    </div>
  );
}
```

This example will generate and render components in real-time!

## API Reference

### `generateComponent(options)`

Generates a React component from a text prompt using AI.

**Parameters:**
- `options.prompt` (string): The text prompt describing the component you want to generate
- `options.projectPath` (string): Absolute path to your project directory (used for resolving imports)
- `options.provider` (optional): AI provider configuration object
  - `provider`: `'openai' | 'anthropic' | 'google'` - The AI provider to use
  - `model` (optional): Specific model name (uses defaults if not specified)
- `options.availableUtilities` (optional): Array of utilities available to generated components
  - `name`: Function name
  - `description`: What the function does
  - `signature`: Function signature with types
  - `returnType` (optional): Return type description
  - `importPath` (optional): Module import path for the utility
  - `example` (optional): Usage example
- `options.availableComponents` (optional): Array of UI components available to generated components
  - `name`: Component name
  - `description`: What the component does
  - `props` (optional): Component props description
  - `category` (optional): Component category (e.g., "ui", "layout", "form")
  - `importPath` (optional): Module import path for the component
  - `example` (optional): Usage example

**Returns:**
- `Promise<{ code: string, frontmatter: any }>`: The compiled component code and any frontmatter

**Examples:**

*Using default OpenAI:*
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Create a responsive card component with a title, description, and action button",
  projectPath: path.resolve(process.cwd()) // Always use project root
});
```

*Using Anthropic Claude:*
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Create a responsive card component",
  projectPath: path.resolve(process.cwd()), // Always use project root
  provider: { 
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022' // optional
  }
});
```

*Using Google Gemini:*
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Create a responsive card component",
  projectPath: path.resolve(process.cwd(), 'src/components'),
  provider: { 
    provider: 'google',
    model: 'gemini-2.5-pro-latest' // optional
  }
});
```

*With API Utilities:*
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Create a blog posts list that fetches and displays recent articles",
  projectPath: path.resolve(process.cwd(), 'src/components'),
  availableUtilities: [
    {
      name: 'fetchPosts',
      description: 'Fetch blog posts from API',
      signature: 'fetchPosts(limit?: number): Promise<Post[]>',
      returnType: 'Promise<Post[]>',
      importPath: './utils/api', // Path from project root
      example: 'fetchPosts(5).then(posts => setPosts(posts))'
    }
  ]
});
```

*With UI Components:*
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Create a user profile card with an icon and action button",
  projectPath: path.resolve(process.cwd()), // Always project root
  availableComponents: [
    {
      name: 'Button',
      description: 'A customizable button component with variants and sizes',
      props: 'children: ReactNode, variant?: "primary" | "secondary", size?: "sm" | "md" | "lg"',
      category: 'ui',
      importPath: './src/components/Button', // Path from project root
      example: '<Button variant="primary" size="md">Click me</Button>'
    },
    {
      name: 'Icon',
      description: 'A versatile icon component with built-in SVG icons',
      props: 'name: string, size?: number, color?: string',
      category: 'ui',
      importPath: './src/components/Icon', // Path from project root
      example: '<Icon name="user" size={24} />'
    }
  ]
});
```

*With Both Utilities and Components:*
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Create a dashboard showing user stats with data fetching and custom components",
  projectPath: path.resolve(process.cwd()), // Always project root
  availableUtilities: [
    {
      name: 'fetchUserStats',
      description: 'Fetch user statistics from API',
      signature: 'fetchUserStats(userId: string): Promise<UserStats>',
      importPath: './utils/api' // Path from project root
    }
  ],
  availableComponents: [
    {
      name: 'Card',
      description: 'A flexible card component for displaying content',
      props: 'title?: string, children: ReactNode',
      category: 'layout',
      importPath: './src/components/Card' // Path from project root
    },
    {
      name: 'Badge',
      description: 'A small status indicator component',
      props: 'variant?: "success" | "warning" | "danger", children: ReactNode',
      category: 'ui',
      importPath: './src/components/Badge' // Path from project root
    }
  ]
});
```

Frontmatter example:
```javascript
// frontmatter might contain:
{
  title: "Responsive Card Component",
  description: "A flexible card component with title, description, and action button",
  category: "ui",
  tags: ["card", "responsive", "ui"],
  version: "1.0.0"
}
```

### `getMDXComponent(code)`

Creates a React component from compiled MDX code (client-side).

**Parameters:**
- `code` (string): The compiled MDX code from `generateComponent`

**Returns:**
- `React.ComponentType`: A React component that can be rendered

## UI Components Integration

Vibe Overlord can automatically discover and use your existing UI components, enabling the AI to generate components that seamlessly integrate with your design system.

### How It Works

When you provide `availableComponents`, the AI:
- **Knows about your components** - Understands what components are available and their purpose
- **Uses correct imports** - Automatically imports components using the exact paths you specify
- **Follows your patterns** - Generates code that matches your component usage patterns
- **Maintains consistency** - Ensures generated components use your existing design system

### Setting Up Component Integration

```typescript
import { generateComponent, AvailableComponent } from 'vibe-overlord';

// Define your available components
const availableComponents: AvailableComponent[] = [
  {
    name: 'Button',
    description: 'A customizable button component with variants and sizes',
    props: 'children: ReactNode, onClick?: () => void, variant?: "primary" | "secondary" | "danger", size?: "sm" | "md" | "lg"',
    category: 'ui',
    importPath: './src/components/Button', // Path from project root
    example: '<Button variant="primary" size="md" onClick={() => alert("Clicked!")}>Click me</Button>'
  },
  {
    name: 'Card',
    description: 'A flexible card component for displaying content with optional header and footer',
    props: 'children: ReactNode, title?: string, subtitle?: string, footer?: ReactNode',
    category: 'layout',
    importPath: './src/components/Card', // Path from project root
    example: '<Card title="Card Title" subtitle="Card subtitle">Card content</Card>'
  }
];

// Generate components that use your design system
const { code } = await generateComponent({
  prompt: "Create a pricing page with cards and buttons for each tier",
  projectPath: path.resolve(process.cwd(), 'src/components'),
  availableComponents
});
```

### Component Definition Best Practices

**Name**: Use the exact export name of your component
```typescript
name: 'Button' // matches: export const Button = ...
```

**Description**: Be specific about the component's purpose
```typescript
description: 'A customizable button component with variants and sizes'
```

**Props**: Include all important props with their types
```typescript
props: 'children: ReactNode, variant?: "primary" | "secondary", disabled?: boolean'
```

**Import Path**: Use paths relative to your project root (NOT relative to file location)
```typescript
// ✅ Correct - relative to project root
importPath: './src/components/Button'     // For src/ structure
importPath: './app/components/Button'     // For Next.js app/ structure  
importPath: './components/Button'         // For root components/

// ❌ Wrong - relative paths from file location
importPath: '../components/Button'        // This won't work
importPath: '../../src/components/Button' // This won't work
```

**Examples**: Show realistic usage patterns
```typescript
example: '<Button variant="primary" onClick={() => handleClick()}>Submit</Button>'
```

### Generated Code Example

When you prompt: *"Create a user profile card with edit and delete buttons"*

Vibe Overlord generates:
```typescript
import React from 'react';
import { Card } from './src/components/Card';
import { Button } from './src/components/Button';

export const UserProfileCard = ({ user }) => {
  return (
    <Card title={user.name} subtitle={user.email}>
      <div className="flex gap-2 mt-4">
        <Button variant="primary" size="sm" onClick={() => handleEdit(user.id)}>
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(user.id)}>
          Delete
        </Button>
      </div>
    </Card>
  );
};
```

## Usage Examples

### Basic Component Generation

```typescript
import { generateComponent } from 'vibe-overlord';

const { code } = await generateComponent({
  prompt: "Create a loading spinner with a blue color",
  projectPath: __dirname
});
```

### With Custom Components

The best way to use your custom components is through the `availableComponents` parameter:

```typescript
// Your custom component at ./components/Icon.tsx
export const Icon = ({ name }: { name: string }) => {
  return <span className={`icon-${name}`} />;
};

// Tell Vibe Overlord about your component
const { code } = await generateComponent({
  prompt: "Create a button with a home icon using the Icon component",
  projectPath: path.resolve(process.cwd()), // Always project root
  availableComponents: [
    {
      name: 'Icon',
      description: 'A versatile icon component with built-in SVG icons',
      props: 'name: string, size?: number, color?: string',
      category: 'ui',
      importPath: './components/Icon', // Path from project root
      example: '<Icon name="home" size={24} color="blue" />'
    }
  ]
});
```

### Full Example with Next.js API Route

```typescript
// app/api/generate/route.ts (App Router)
import { NextResponse } from 'next/server';
import { generateComponent, AvailableUtility, AvailableComponent } from 'vibe-overlord';
import path from 'path';

// Define available utilities
const availableUtilities: AvailableUtility[] = [
  {
    name: 'fetchPosts',
    description: 'Fetch blog posts from API',
    signature: 'fetchPosts(limit?: number): Promise<Post[]>',
    returnType: 'Promise<Post[]>',
    importPath: './utils/api', // Path from project root
    example: 'fetchPosts(5).then(posts => setPosts(posts))'
  }
];

// Define available components
const availableComponents: AvailableComponent[] = [
  {
    name: 'Button',
    description: 'A customizable button component with variants and sizes',
    props: 'children: ReactNode, variant?: "primary" | "secondary", size?: "sm" | "md" | "lg"',
    category: 'ui',
    importPath: './components/Button', // Path from project root
    example: '<Button variant="primary" size="md">Click me</Button>'
  },
  {
    name: 'Card',
    description: 'A flexible card component for displaying content',
    props: 'children: ReactNode, title?: string, subtitle?: string',
    category: 'layout',
    importPath: './components/Card', // Path from project root
    example: '<Card title="Title">Content</Card>'
  }
];

export async function POST(request: Request) {
  const { prompt, provider } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const { code, frontmatter } = await generateComponent({
      prompt,
      projectPath: path.resolve(process.cwd(), 'components'),
      provider,
      availableUtilities,
      availableComponents
    });

    return NextResponse.json({ code, frontmatter });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate component' }, { status: 500 });
  }
}
```

## Working with Frontmatter

The `frontmatter` returned by Vibe Overlord contains metadata about the generated component. The AI can automatically generate useful metadata that you can use in your application.

### What Frontmatter Contains

By default, Vibe Overlord generates structured frontmatter with useful metadata for every component:

```typescript
interface ComponentFrontmatter {
  title: string;            // Component display name (always included)
  description: string;      // Component description (always included)
  category: string;         // Component category like "ui", "form", "layout" (always included)
  tags: string[];           // Component tags/categories (always included)
  version: string;          // Component version (defaults to "1.0.0")
  author?: string;          // Component author
  props?: object;           // Expected props schema
  examples?: string[];      // Usage examples
  dependencies?: string[];  // Required dependencies
  [key: string]: any;       // Any other metadata
}
```

**Example generated frontmatter:**
```yaml
---
title: "Pricing Card"
description: "A flexible pricing card component with tier information and call-to-action"
category: "ecommerce"
tags: ["pricing", "card", "ecommerce", "cta"]
version: "1.0.0"
---
```

### Use Cases for Frontmatter

**1. Component Library Management**
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Create a button component with variants",
  projectPath: projectPath
});

// Use frontmatter to catalog the component
await saveToLibrary({
  title: frontmatter.title,
  description: frontmatter.description,
  category: frontmatter.category,
  tags: frontmatter.tags,
  code: code
});
```

**2. Documentation Generation**
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Create a data table with sorting",
  projectPath: projectPath
});

// Generate documentation from frontmatter
const documentation = {
  name: frontmatter.title,
  description: frontmatter.description,
  usage: frontmatter.examples,
  props: frontmatter.props
};
```

**3. Component Search and Filtering**
```typescript
const components = await Promise.all([
  generateComponent({ prompt: "Create a modal dialog", projectPath }),
  generateComponent({ prompt: "Create a tooltip", projectPath }),
  generateComponent({ prompt: "Create a dropdown menu", projectPath })
]);

// Filter by category or tags
const uiComponents = components.filter(
  ({ frontmatter }) => frontmatter.category === 'ui'
);
```

**4. Version Control and Updates**
```typescript
const { code, frontmatter } = await generateComponent({
  prompt: "Update the button component with accessibility features",
  projectPath: projectPath
});

// Track component versions
if (frontmatter.version && frontmatter.version !== currentVersion) {
  await updateComponent({
    name: frontmatter.title,
    version: frontmatter.version,
    changes: frontmatter.changelog,
    code: code
  });
}
```

### Prompting for Specific Frontmatter

You can ask the AI to include specific metadata:

```typescript
const { code, frontmatter } = await generateComponent({
  prompt: `Create a pricing card component. Include metadata with:
    - title: "Pricing Card"
    - description: "A card component for displaying pricing tiers"
    - category: "ecommerce"
    - tags: ["pricing", "card", "ecommerce"]
    - props: schema for title, price, features, buttonText`,
  projectPath: projectPath
});
```

## Development

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your OpenAI API key:
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Project Structure

```
src/
  ├── index.ts          # Main API, component generation, and type definitions
  ├── client.ts         # Client-side exports (re-exports from mdx-bundler)
  ├── security.ts       # Security utilities and validation
  ├── index.test.ts     # Tests
  └── templates/        # Code generation templates
example/
  ├── src/
  │   ├── app/
  │   │   ├── api/generate/route.ts  # Example API route with components/utilities
  │   │   └── page.tsx               # Example UI with multi-provider support
  │   └── components/                # Example reusable components
  │       ├── Button.tsx             # Button component with variants
  │       ├── Card.tsx               # Card layout component
  │       ├── Icon.tsx               # Icon component with SVG library
  │       └── Badge.tsx              # Badge/status component
  └── env.example           # Environment configuration template
```

### Type Definitions

Vibe Overlord exports TypeScript interfaces for better development experience:

```typescript
import { 
  generateComponent, 
  AvailableUtility, 
  AvailableComponent,
  AIProvider,
  AIProviderConfig 
} from 'vibe-overlord';

// Type-safe utility definitions
const utilities: AvailableUtility[] = [
  // ... your utilities
];

// Type-safe component definitions  
const components: AvailableComponent[] = [
  // ... your components
];
```

## Example Project

Check out the included example project in the `./example` directory to see Vibe Overlord in action with a Next.js application. The example demonstrates:

- **Component Generation**: Generate components from natural language prompts
- **UI Components Integration**: Pre-built components (Button, Card, Icon, Badge) that the AI can use
- **API Utilities**: Data fetching functions that the AI automatically knows about
- **Multi-Provider Support**: Switch between OpenAI, Anthropic, and Google in the UI
- **Frontmatter Display**: View component metadata including title, description, category, and tags
- **Real-time Rendering**: See components rendered immediately after generation
- **Code Preview**: View the generated MDX/React code with proper imports
- **Design System Integration**: Generated components use the existing component library

### Getting Started with the Example

1. **Setup environment**:
```bash
cd example
cp env.example .env.local
# Edit .env.local and add your API key(s)
```

2. **Install and run**:
```bash
npm install
npm run dev
```

3. **Try these prompts**:
   - `"Create a user profile card using the Card component with an Icon"`
   - `"Build a pricing table with Button components for each tier"`
   - `"Make a notification using the Badge component"`
   - `"Create a dashboard that fetches posts and displays them in cards"`

The example includes a three-panel layout showing the rendered component, generated code, and extracted metadata side-by-side.

## Requirements

- Node.js 18+
- At least one AI provider API key:
  - OpenAI API key (default)
  - Anthropic API key (for Claude)
  - Google Generative AI API key (for Gemini)
- React 18+

## Security Utilities

Vibe Overlord includes built-in security utilities accessible via `'vibe-overlord/security'`:

```typescript
import { 
  RateLimiter, 
  createSecureLogger, 
  validateEnvironment,
  PromptSchema 
} from 'vibe-overlord/security';

// Rate limiting
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10
});

// Secure logging
const logger = createSecureLogger();

// Environment validation
const envValidation = validateEnvironment();
```

## Supported AI Providers

| Provider | Models | Default Model |
|----------|--------|---------------|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, etc. | gpt-4o |
| **Anthropic** | claude-3-5-sonnet-20241022, claude-3-haiku-20240307, etc. | claude-3-5-sonnet-20241022 |
| **Google** | gemini-1.5-pro-latest, gemini-1.5-flash, etc. | gemini-2.5-pro-latest |

## Acknowledgments

This library builds upon the excellent work of [Ken Doods](https://github.com/kentcdodds) and the [mdx-bundler](https://github.com/kentcdodds/mdx-bundler) project. MDX-bundler provides the core MDX compilation capabilities that make real-time React component generation possible.

Special thanks to:
- **Ken Doods** - Creator of mdx-bundler, the foundation for our MDX compilation
- **The mdx-bundler contributors** - For maintaining this essential tool for the React ecosystem

## Troubleshooting

### "Cannot resolve module" errors

**Error**: `Could not resolve "./components/Button"`

**Solution**: 
- Ensure `projectPath` is set to `path.resolve(process.cwd())` (project root)
- Use import paths relative to project root: `'./src/components/Button'` or `'./app/components/Button'`
- Verify the file exists at the specified path

### Missing dependencies

**Error**: `Cannot find module 'mdx-bundler'`

**Solution**: Install all required dependencies:
```bash
npm install mdx-bundler ai zod @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google
```

### Component not rendering

**Possible causes**:
- Import path doesn't match actual file location
- Component file missing proper export (`export function ComponentName` or `export default`)
- TypeScript errors in your component files

### Environment setup

**Error**: No API key configured

**Solution**: Create `.env.local` and add at least one API key:
```bash
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here  
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

For more detailed troubleshooting, check the [Security Documentation](./SECURITY.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository. 