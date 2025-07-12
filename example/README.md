# Vibe Overlord Example

This is a Next.js application that demonstrates the capabilities of **Vibe Overlord** - an AI-powered React component generation library.

## What This Example Shows

This example application provides a web interface where you can:

- 🎨 **Generate React components** from natural language prompts using AI
- 👀 **See real-time preview** of the generated components
- 📝 **View the generated code** side-by-side with the rendered output
- 🧩 **Use pre-built UI components** - Button, Card, Icon, Badge components that the AI automatically knows about
- 🔧 **Design system integration** - Generated components use your existing component library
- 📊 **API data integration** - AI automatically knows about available utility functions

## Features

- **Multiple AI Providers**: Choose between OpenAI (GPT), Anthropic (Claude), and Google (Gemini)
- **Model Selection**: Use default models or specify custom model names
- **UI Components Library**: Pre-built Button, Card, Icon, and Badge components that AI can use
- **Design System Integration**: AI automatically knows about your reusable components
- **API Integration**: AI automatically knows about available utilities and can generate data-driven components
- **Interactive Web Interface**: Simple textarea for entering prompts
- **Real-time Generation**: Click a button to generate components instantly
- **Live Preview**: See your generated components rendered immediately
- **Code Display**: View the generated MDX/React code with proper imports
- **Metadata Display**: View component metadata (title, description, category, tags)
- **Error Handling**: Graceful error messages for failed generations
- **Responsive Design**: Works on desktop and mobile devices
- **Tailwind CSS**: Modern, responsive styling

## Getting Started

### Prerequisites

1. **AI Provider API Key**: You'll need at least one API key:
   - **OpenAI**: `OPENAI_API_KEY` (default)
   - **Anthropic**: `ANTHROPIC_API_KEY` (for Claude)
   - **Google**: `GOOGLE_GENERATIVE_AI_API_KEY` (for Gemini)
2. **Node.js 18+**: Make sure you have Node.js installed

### Setup

1. **Configure environment variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit .env.local and add your API key(s)
   # You only need ONE of these:
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here  
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_key_here
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Select an AI provider** from the dropdown (OpenAI, Anthropic, or Google)
2. **Optionally specify a model** or use the default for your chosen provider
3. **Enter a prompt** in the textarea describing the component you want to generate
4. **Click "Generate Component"** to send your request to the AI
5. **Watch the magic happen** - the AI will generate and display your component
6. **See the rendered result, generated code, and metadata** in three panels

### Example Prompts

#### Basic Component Generation
Try these prompts to see what Vibe Overlord can create:

- `"Create a blue button with rounded corners and a hover effect"`
- `"Make a card component with a title, description, and action button"`
- `"Build a loading spinner with a pulsing animation"`
- `"Create a contact form with name, email, and message fields"`

#### Using Available UI Components
These prompts use the pre-built components (Button, Card, Icon, Badge):

- `"Create a user profile card using the Card component with an Icon for the avatar"`
- `"Build a pricing table using Card components with Button components for actions"`
- `"Make a notification banner using the Badge component for status"`
- `"Create a navigation menu using Button components and Icon components"`
- `"Build a dashboard with Card components containing status Badge components"`
- `"Make a contact card using Card, Icon, and Button components"`

### Prompts with Metadata

You can also ask for components with specific metadata:

- `"Create a modal dialog with title 'Confirmation Modal', category 'overlay', and tags ['modal', 'dialog', 'confirmation']"`
- `"Build a data table component with description 'Sortable and filterable table', version '1.0.0', and props schema"`
- `"Make a button component with variants, include usage examples and dependency information"`

### Prompts with API Integration

The AI automatically knows about available API utilities and can use them:

- `"Create a blog posts list that fetches and displays recent posts"`
- `"Build a user profile card that loads user data"`
- `"Make a todo list component that shows incomplete tasks"`
- `"Create a random quote widget that displays inspirational quotes"`
- `"Build a dashboard showing posts, users, and todos in separate sections"`
- `"Make a search interface that can find posts by title"`

## Architecture

This example demonstrates the full Vibe Overlord workflow with component library integration:

```
User Input → API Route → Vibe Overlord + Available Components + Utilities → AI Provider → Generated Component + Metadata → Rendered Output
```

### How Component Integration Works

1. **Component Definition**: Available components (Button, Card, Icon, Badge) are defined in the API route
2. **AI Knowledge**: The AI automatically knows about these components and their props
3. **Smart Generation**: Generated components use your existing design system components
4. **Proper Imports**: AI generates correct import statements with named imports
5. **Consistent Styling**: Components follow your established design patterns

The generated response includes both the component code and frontmatter metadata that can be used for component management, documentation, and cataloging.

### Key Files

- **`src/app/page.tsx`**: Main UI with the prompt interface and component rendering
- **`src/app/api/generate/route.ts`**: API route that handles component generation and declares available utilities and components
- **`src/components/`**: Reusable UI components that the AI can use:
  - **`Button.tsx`**: Customizable button with variants and sizes
  - **`Card.tsx`**: Flexible card layout component
  - **`Icon.tsx`**: Icon component with 12+ built-in SVG icons
  - **`Badge.tsx`**: Status indicator component with variants
  - **`demo.tsx`**: Example custom component
- **`src/utils/api.ts`**: API utility functions for fetching data (JSONPlaceholder, quotes, etc.)
- **`src/app/layout.tsx`**: Root layout with global CSS imports
- **`src/app/globals.css`**: Global styles with Tailwind CSS
- **`.env.example`**: Environment configuration template

### Technology Stack

- **Next.js 15**: React framework with App Router
- **Vibe Overlord**: AI-powered component generation with automatic utility detection
- **Tailwind CSS v4**: Utility-first CSS framework
- **TypeScript**: Type safety and better developer experience
- **MDX Bundler**: Compiles and bundles generated components
- **JSONPlaceholder API**: Free fake REST API for testing data-driven components
- **Quotable API**: Free quotes API for inspirational content

## Customization

### Adding Custom Components

You can add your own components that the AI can use by updating the `availableComponents` array:

1. **Create a component** in the `src/components/` directory:
   ```typescript
   // src/components/MyIcon.tsx
   export const MyIcon = ({ name, color }: { name: string; color?: string }) => {
     return <span className={`icon-${name}`} style={{ color }} />;
   };
   ```

2. **Add it to the availableComponents array** in `src/app/api/generate/route.ts`:
   ```typescript
   const availableComponents: AvailableComponent[] = [
     // ... existing components
     {
       name: 'MyIcon',
       description: 'A custom icon component with color support',
       props: 'name: string, color?: string',
       category: 'ui',
       importPath: '../src/components/MyIcon',
       example: '<MyIcon name="home" color="blue" />'
     }
   ];
   ```

3. **Import it in your page** and pass it to the component:
   ```typescript
   import { MyIcon } from '@/components/MyIcon';
   
   <Component components={{ Demo, Icon, Button, Card, Badge, MyIcon }} />
   ```

4. **Use it in prompts**: `"Create a button with a home icon using the MyIcon component"`

### Available Components

This example includes these pre-built components:

- **Button**: `variant?: "primary" | "secondary" | "danger" | "success" | "outline", size?: "sm" | "md" | "lg"`
- **Card**: `title?: string, subtitle?: string, footer?: ReactNode, padding?: "none" | "sm" | "md" | "lg"`
- **Icon**: `name: string, size?: number, color?: string` (includes: home, user, heart, star, check, close, arrow-right, arrow-left, search, mail, phone)
- **Badge**: `variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "info", size?: "sm" | "md" | "lg"`

### Styling

The example uses Tailwind CSS v4. You can:

- **Modify `tailwind.config.js`** to customize your design system
- **Edit `src/app/globals.css`** to add custom styles
- **Update component styles** in `src/app/page.tsx`

## Development

### Project Structure

```
src/
├── app/
│   ├── api/generate/
│   │   └── route.ts      # API endpoint with available components and utilities
│   ├── globals.css       # Global styles with Tailwind
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main UI with multi-provider support
├── components/
│   ├── Button.tsx        # Button component with variants
│   ├── Card.tsx          # Card layout component
│   ├── Icon.tsx          # Icon component with SVG library
│   ├── Badge.tsx         # Badge/status component
│   └── demo.tsx          # Example custom component
├── utils/
│   └── api.ts            # API utility functions
├── .env.example          # Environment configuration template
└── ...
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Deployment

This example can be deployed to any platform that supports Next.js:

- **Vercel**: Perfect for Next.js applications
- **Netlify**: Great for static sites
- **Railway**: Easy deployment with environment variables
- **Docker**: Containerized deployment

### Environment Variables

Make sure to set your AI provider API key(s) in your deployment environment:

```bash
# Choose one or more providers
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key_here
```

## Troubleshooting

### Common Issues

1. **"API key not found"**: Make sure you have the correct environment variable set for your chosen provider:
   - OpenAI: `OPENAI_API_KEY`
   - Anthropic: `ANTHROPIC_API_KEY` 
   - Google: `GOOGLE_GENERATIVE_AI_API_KEY`
2. **"Failed to generate component"**: Check your internet connection and API key validity
3. **"Model not found"**: Verify the model name is correct for your chosen provider
4. **Components not rendering**: Ensure your custom components are properly exported and imported
5. **Styling issues**: Make sure Tailwind CSS is properly configured

### Getting Help

- Check the [Vibe Overlord documentation](../README.md) for API details
- Review the console logs for detailed error messages
- Ensure all dependencies are installed correctly

## Next Steps

### Already Implemented ✅
- **UI Components Integration**: Button, Card, Icon, and Badge components that AI automatically uses
- **Design System Integration**: AI generates components using your existing design system
- **Multi-Provider Support**: Switch between OpenAI, Anthropic, and Google
- **Frontmatter Display**: Component metadata is shown in the UI
- **API Integration**: Utility functions are automatically available to the AI

### Future Enhancements
- **Component Library View**: Build a searchable library using frontmatter to categorize components
- **Export with Metadata**: Allow users to export components with their metadata
- **Component History**: Save generated components with their frontmatter for reuse
- **Filtering & Search**: Filter components by category, tags, or other metadata
- **Documentation**: Auto-generate component documentation from frontmatter
- **Version Control**: Track component versions and changes using metadata
- **More Components**: Add additional design system components (Modal, Dropdown, Table, etc.)
- **Theme Support**: Add dark/light theme variants to components
- **Advanced Layouts**: Add complex layout components (Grid, Flex, etc.)

### Current Implementation

The example now includes comprehensive frontmatter display and component integration:

1. **Component Metadata Display** ✅ **Implemented**
   ```typescript
   // Component metadata is displayed in the UI
   {frontmatter.title && <p><strong>Title:</strong> {frontmatter.title}</p>}
   {frontmatter.description && <p><strong>Description:</strong> {frontmatter.description}</p>}
   {frontmatter.tags && <p><strong>Tags:</strong> {frontmatter.tags.join(', ')}</p>}
   {frontmatter.category && <p><strong>Category:</strong> {frontmatter.category}</p>}
   ```

2. **Three-Panel Layout** ✅ **Implemented**
   - **Rendered Component**: Live preview with your design system components
   - **Generated Code**: MDX/React code with proper imports
   - **Metadata**: Frontmatter displayed as formatted JSON

3. **Future Enhancement Ideas**
   ```typescript
   // Component Library View
   const [componentLibrary, setComponentLibrary] = useState([]);
   
   // Add search/filter functionality
   const filteredComponents = componentLibrary.filter(
     component => component.frontmatter.category === selectedCategory
   );
   
   // Export with Metadata
   const exportComponent = () => {
     const componentPackage = {
       code: componentCode,
       metadata: frontmatter,
       generatedAt: new Date().toISOString()
     };
     downloadFile(JSON.stringify(componentPackage, null, 2));
   };
   ```

## Learn More

- [Vibe Overlord Documentation](../README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
