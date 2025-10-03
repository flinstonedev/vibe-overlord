# Vibe Overlord Example - Enhanced with Auto-Discovery

This example demonstrates all the new features of Vibe Overlord for generating non-trivial UI components.

## 🆕 New Features Demonstrated

1. **Auto-Discovery**: Automatically scans and uses your existing components (Button, Card, Icon, Badge)
2. **Two-Phase Generation**: Plans component architecture before implementing
3. **AST-Based Validation**: Robust security checks using Abstract Syntax Trees
4. **Self-Healing**: Automatically retries and fixes validation errors
5. **Template Library**: Learns from built-in patterns (forms, tables, modals)
6. **TypeScript Support**: Generates TypeScript-compatible code
7. **Component Specification**: View the AI's planning phase output

## 🚀 Quick Start

### 1. Install Dependencies

   ```bash
   npm install
   ```

### 2. Set Up Environment

Copy `.env.local.example` to `.env.local` and add your API key:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add at least one API key:

```env
OPENAI_API_KEY=your_openai_key_here
# Or use:
# ANTHROPIC_API_KEY=your_anthropic_key_here
# GOOGLE_GENERATIVE_AI_API_KEY=your_google_key_here
```

### 3. Run Development Server

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
example/
├── vibe-overlord.config.ts    # Configuration for new features
├── src/
│   ├── app/
│   │   ├── api/generate/
│   │   │   └── route.ts        # Enhanced with auto-discovery
│   │   └── page.tsx            # UI with spec viewer
│   ├── components/             # Your reusable components
│   │   ├── Button.tsx          # Auto-discovered by scanner
│   │   ├── Card.tsx            # Auto-discovered by scanner
│   │   ├── Icon.tsx            # Auto-discovered by scanner
│   │   └── Badge.tsx           # Auto-discovered by scanner
│   └── utils/
│       └── api.ts              # Auto-discovered utilities
```

## ⚙️ Configuration

The `vibe-overlord.config.ts` file enables all new features:

```typescript
{
  // Auto-discover components and utilities
  componentGlobs: ['src/components/**/*.{tsx,jsx}'],
  utilityGlobs: ['src/utils/**/*.{ts,tsx}'],
  
  // Enable advanced features
  useTwoPhaseGeneration: true,  // Plan before implementing
  enableSelfHealing: true,       // Auto-fix errors
  useAstValidation: true,        // Better security
  allowTypescript: true,         // TS support
  
  // Template library enabled by default
  templates: {
    enabled: true
  }
}
```

## 🎯 Try These Prompts

### Simple Components
```
Create a blue button with rounded corners
```

### Using Auto-Discovered Components
```
Create a pricing page using Card and Button components. 
Show three tiers: Free ($0), Pro ($29), Enterprise ($99)
```

```
Create a user profile card using Card, Icon, and Badge components.
Show avatar, name, email, and status badge
```

### Using Auto-Discovered Utilities
```
Create a blog post list that fetches posts using fetchPosts. 
Display title, body preview, and author in Card components
```

```
Create a user dashboard that fetches users with fetchUsers 
and displays them in cards with their info
```

### Complex Components (Two-Phase Generation)
```
Create a data table showing products with columns for name, 
price, category, and status. Include sorting and row actions
```

```
Create a contact form with name, email, and message fields. 
Include validation, error messages, and success feedback
```

```
Create a modal dialog for confirming delete actions with 
proper focus management and keyboard navigation
```

```
Create a todo list with add, complete, and delete functionality.
Show active count and filter by status
```

## 🔍 Understanding the UI

### Tabs

1. **Preview**: See the generated component in action
2. **Code**: View the generated MDX/React code
3. **Specification** (dev only): View the planning phase output
4. **Metadata**: See component metadata (title, description, tags, etc.)

### Component Specification

When two-phase generation is enabled, you'll see a "Specification" tab showing:
- Component name and description
- State variables and their purposes
- Props with types and descriptions
- Data dependencies (which utilities to call)
- Sub-components to use
- Interactions and behaviors
- Accessibility features

This gives you insight into how the AI planned the component before implementing it.

### Catalog Stats

At the top of the page, you'll see:
```
📦 Discovered: 4 components, 6 utilities
```

This shows how many items were auto-discovered from your project.

## 🛡️ Security Features

### AST-Based Validation

The example uses AST validation to catch:
- Dangerous function calls (eval, Function constructor)
- Direct network calls (use provided utilities instead)
- Security violations (innerHTML, process access)
- Missing accessibility features

### Rate Limiting

The API route includes rate limiting:
- 10 requests per minute per IP
- Configurable via `RateLimiter`

### Sanitization

All prompts are:
- Validated against schema
- Sanitized to remove dangerous patterns
- Logged securely (no sensitive data)

## 🎨 Customization

### Add Your Own Components

Create components in `src/components/` and they'll be auto-discovered:

   ```typescript
// src/components/MyComponent.tsx

/**
 * @description A custom component that does something cool
 */
export const MyComponent = ({ title }: { title: string }) => {
  return <div>{title}</div>;
};
```

The AI will automatically know about it and can use it in generated components!

### Add Your Own Utilities

Create utilities in `src/utils/` and they'll be auto-discovered:

   ```typescript
// src/utils/myApi.ts

/**
 * @description Fetch custom data from my API
 */
export async function fetchCustomData(): Promise<any[]> {
  // Your implementation
}
```

### Add Custom Templates

Create MDX files in a custom directory and reference it in config:

```typescript
// vibe-overlord.config.ts
{
  templates: {
    enabled: true,
    customTemplatesDir: './src/templates'
  }
}
```

## 📊 Performance

### Catalog Caching

The API route caches the scanned catalog for 5 minutes:
- First request: ~2-3s (includes scanning)
- Subsequent requests: ~1-2s (uses cache)
- Cache invalidates after 5 minutes

### Optimization Tips

1. **Adjust cache TTL**: Change `CACHE_TTL` in `route.ts`
2. **Limit context items**: Reduce `maxContextItems` in config
3. **Disable two-phase**: Set `useTwoPhaseGeneration: false` for simple components
4. **Disable templates**: Set `templates.enabled: false` if not needed

## 🐛 Troubleshooting

### "No components discovered"

- Check that your components are in `src/components/`
- Ensure they're exported functions/constants
- Check the config `componentGlobs` pattern

### "Generation is slow"

- Reduce `maxContextItems` in config
- Disable `useTwoPhaseGeneration` for simple components
- Check your internet connection (API calls)

### "TypeScript errors in generated code"

- Ensure `allowTypescript: true` in config
- Check that imports are correctly detected
- Verify `autoDetectAliases: true` is set

### "Component doesn't use my components"

- Check they're properly exported
- Add JSDoc comments for better descriptions
- Try mentioning them explicitly in the prompt

## 📚 Learn More

- [Vibe Overlord Documentation](../README.md)
- [Getting Started Guide](../GETTING_STARTED.md)
- [Full Improvements Documentation](../IMPROVEMENTS.md)
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)

## 🎉 What's Next?

Try generating:
1. A complete dashboard with multiple widgets
2. A multi-step form wizard
3. A chat interface with message list
4. A kanban board with drag-and-drop
5. A calendar component with events

The AI will automatically use your components and utilities to build complex, production-ready components!
