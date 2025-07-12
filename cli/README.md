# Create Vibe Overlord CLI

🚀 **Quickly add Vibe Overlord to existing projects**

A command-line tool that automatically sets up Vibe Overlord in your existing React projects with intelligent framework detection and one-command setup.

## Features

- 🔍 **Smart Framework Detection** - Automatically detects Next.js, Vite, and React projects
- 📦 **Automatic Installation** - Installs dependencies and sets up configuration
- 🛠️ **Complete Setup** - Creates API routes, example components, and demo pages
- 🎯 **Next.js Focused** - Full support for both App Router and Pages Router
- 🔧 **Extensible** - Architecture ready for additional frameworks

## Installation

### Global Installation (Recommended)

```bash
npm install -g create-vibe-overlord
```

### One-time Usage

```bash
npx create-vibe-overlord add
```

## Usage

### Basic Usage

Navigate to your existing React project and run:

```bash
create-vibe-overlord add
```

The CLI will:
1. Detect your framework automatically
2. Ask what you want to set up
3. Install dependencies and create all necessary files
4. Provide next steps

### Advanced Usage

```bash
# Specify framework explicitly
create-vibe-overlord add --framework nextjs

# Skip dependency installation
create-vibe-overlord add --skip-install

# Skip specific features
create-vibe-overlord add --no-api-route --no-components --no-examples
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --framework <framework>` | Specify framework (nextjs, react, vite) | Auto-detect |
| `--skip-install` | Skip package installation | false |
| `--no-api-route` | Skip API route creation | false |
| `--no-components` | Skip example components | false |
| `--no-examples` | Skip example pages | false |

## What Gets Created

### For Next.js Projects

- 📦 **Dependencies**: Installs `vibe-overlord` package
- 🔐 **Environment**: Creates `.env.local` with API key placeholders
- 🛣️ **API Routes**: 
  - App Router: `/app/api/generate/route.ts`
  - Pages Router: `/pages/api/generate.ts`
- 🎨 **Components**: Example UI components in `/components/`
- 📄 **Demo Page**: Interactive demo at `/vibe-overlord`

### Directory Structure (Next.js App Router)

```
your-project/
├── .env.local                    # API keys configuration
├── .env.example                  # Environment template
├── src/
│   ├── app/
│   │   ├── api/generate/
│   │   │   └── route.ts          # Component generation API
│   │   └── vibe-overlord/
│   │       └── page.tsx          # Interactive demo page
│   └── components/
│       └── Button.tsx            # Example component
└── package.json                  # Updated with vibe-overlord
```

## Requirements

- Node.js 18+
- Existing React project with `package.json`
- One of the supported frameworks:
  - Next.js (App Router or Pages Router)
  - React + Vite
  - Create React App
  - Other React setups (manual mode)

## Framework Support

### ✅ Fully Supported

- **Next.js** - Complete setup with API routes and demo pages
  - App Router (13.4+)
  - Pages Router (12.0+)
  - TypeScript and JavaScript
  - `src/` directory structure

### 🚧 Coming Soon

- **Vite + React** - Template generation and dev server integration
- **Remix** - Loader/action integration
- **Astro** - Component islands support

## Getting Started After Setup

1. **Add your API keys** to `.env.local`:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Start your development server**:
   ```bash
   npm run dev
   ```

3. **Try the demo** (if examples were created):
   - Navigate to `/vibe-overlord`
   - Enter a component description
   - Watch AI generate React components!

## Examples

### Next.js App Router Setup

```bash
cd my-nextjs-app
create-vibe-overlord add
```

Output:
```
✅ Detected Next.js project. Use this framework? Yes
✅ Create API route for component generation? Yes
✅ Add example UI components? Yes
✅ Add example usage pages? Yes
✅ Install dependencies? Yes

🎉 Vibe Overlord setup completed successfully!
```

### Existing Project with Custom Options

```bash
cd existing-app
create-vibe-overlord add --framework nextjs --no-examples
```

This will set up Vibe Overlord but skip creating demo pages.

## Troubleshooting

### Common Issues

**"No package.json found"**
- Make sure you're in a valid project directory
- Create a basic React project first

**"This doesn't appear to be a React project"**
- Ensure React is installed in your project
- Check `package.json` for React dependencies

**"Framework not supported yet"**
- Use `--framework manual` for manual setup instructions
- Check supported frameworks list above

### Manual Setup

If automatic setup doesn't work for your project:

```bash
create-vibe-overlord add --framework manual
```

This will display step-by-step instructions for manual integration.

## Development

### Building the CLI

```bash
cd cli
npm install
npm run build
```

### Testing Locally

```bash
cd cli
npm run build
npm link
create-vibe-overlord add
```

### Adding New Frameworks

1. Create setup function in `src/frameworks/`
2. Add detection logic in `src/utils/framework-detector.ts`
3. Update main CLI in `src/index.ts`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC 