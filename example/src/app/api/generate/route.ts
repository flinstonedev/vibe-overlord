import { NextResponse } from 'next/server';
import {
    generateComponent,
    AvailableUtility,
    AvailableComponent,
    PromptSchema,
    RateLimiter,
    createSecureLogger,
    validateEnvironment
} from 'vibe-overlord';
import path from 'path';

// Initialize rate limiter - 10 requests per minute per IP
const rateLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
});

// Use secure logger from shared utilities
const logger = createSecureLogger();

// Validate environment on startup
const envValidation = validateEnvironment();
if (!envValidation.isValid) {
    console.error('Environment validation failed:', envValidation.errors);
    // Don't crash in development, but log warnings
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Define available utilities that the AI can use
const availableUtilities: AvailableUtility[] = [
    {
        name: 'fetchPosts',
        description: 'Fetch blog posts from JSONPlaceholder API',
        signature: 'fetchPosts(limit?: number): Promise<Post[]>',
        returnType: 'Promise<Post[]>',
        importPath: '@/utils/api',
        example: 'fetchPosts(5).then(posts => setPosts(posts))'
    },
    {
        name: 'fetchPost',
        description: 'Fetch a single blog post by ID',
        signature: 'fetchPost(id: number): Promise<Post | null>',
        returnType: 'Promise<Post | null>',
        importPath: '@/utils/api',
        example: 'fetchPost(1).then(post => setPost(post))'
    },
    {
        name: 'fetchUsers',
        description: 'Fetch user profiles from JSONPlaceholder API',
        signature: 'fetchUsers(limit?: number): Promise<User[]>',
        returnType: 'Promise<User[]>',
        importPath: '@/utils/api',
        example: 'fetchUsers(3).then(users => setUsers(users))'
    },
    {
        name: 'fetchUser',
        description: 'Fetch a single user by ID',
        signature: 'fetchUser(id: number): Promise<User | null>',
        returnType: 'Promise<User | null>',
        importPath: '@/utils/api',
        example: 'fetchUser(1).then(user => setUser(user))'
    },
    {
        name: 'fetchTodos',
        description: 'Fetch todo items from JSONPlaceholder API',
        signature: 'fetchTodos(limit?: number, userId?: number): Promise<Todo[]>',
        returnType: 'Promise<Todo[]>',
        importPath: '@/utils/api',
        example: 'fetchTodos(10, 1).then(todos => setTodos(todos))'
    },
    {
        name: 'fetchRandomQuote',
        description: 'Fetch a random cat fact from Cat Facts API',
        signature: 'fetchRandomQuote(): Promise<{content: string, author: string} | null>',
        returnType: 'Promise<{content: string, author: string} | null>',
        importPath: '@/utils/api',
        example: 'fetchRandomQuote().then(catFact => setCatFact(catFact))'
    }
];

// Define available UI components that the AI can use
const availableComponents: AvailableComponent[] = [
    {
        name: 'Icon',
        description: 'A versatile icon component with built-in SVG icons',
        props: 'name: string, size?: number, color?: string, className?: string',
        category: 'ui',
        importPath: '@/components/Icon',
        example: 'import { Icon } from "@/components/Icon"; <Icon name="home" size={24} color="blue" />'
    },
    {
        name: 'Button',
        description: 'A customizable button component with variants and sizes',
        props: 'children: ReactNode, onClick?: () => void, variant?: "primary" | "secondary" | "danger" | "success" | "outline", size?: "sm" | "md" | "lg", disabled?: boolean, className?: string, type?: "button" | "submit" | "reset"',
        category: 'ui',
        importPath: '@/components/Button',
        example: 'import { Button } from "@/components/Button"; <Button variant="primary" size="md" onClick={() => alert("Clicked!")}>Click me</Button>'
    },
    {
        name: 'Card',
        description: 'A flexible card component for displaying content with optional header and footer',
        props: 'children: ReactNode, title?: string, subtitle?: string, footer?: ReactNode, className?: string, padding?: "none" | "sm" | "md" | "lg", shadow?: "none" | "sm" | "md" | "lg"',
        category: 'layout',
        importPath: '@/components/Card',
        example: 'import { Card } from "@/components/Card"; <Card title="Card Title" subtitle="Card subtitle">Card content goes here</Card>'
    },
    {
        name: 'Badge',
        description: 'A small status indicator or label component',
        props: 'children: ReactNode, variant?: "default" | "primary" | "secondary" | "success" | "warning" | "danger" | "info", size?: "sm" | "md" | "lg", className?: string',
        category: 'ui',
        importPath: '@/components/Badge',
        example: 'import { Badge } from "@/components/Badge"; <Badge variant="success" size="md">New</Badge>'
    },
    {
        name: 'Demo',
        description: 'A simple demo component for testing',
        props: 'No props required',
        category: 'demo',
        importPath: '@/components/demo',
        example: 'import Demo from "@/components/demo"; <Demo />'
    }
];

export async function POST(request: Request) {
    try {
        // Get client IP for rate limiting
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Check rate limit using shared utility
        if (!rateLimiter.isAllowed(clientIP)) {
            const remaining = rateLimiter.getRemainingRequests(clientIP);
            logger.warn('Rate limit exceeded', { clientIP, remaining });
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': '60',
                        'X-RateLimit-Remaining': remaining.toString()
                    }
                }
            );
        }

        // Parse and validate request body
        let requestBody;
        try {
            requestBody = await request.json();
        } catch {
            logger.warn('Invalid JSON in request body', { clientIP });
            return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
        }

        const { prompt, provider } = requestBody;

        // Use shared prompt validation
        try {
            PromptSchema.parse(prompt);
        } catch (validationError) {
            logger.warn('Prompt validation failed', { clientIP, error: validationError });
            return NextResponse.json({
                error: 'Invalid prompt: ' + (validationError instanceof Error ? validationError.message : 'Validation failed')
            }, { status: 400 });
        }

        // Validate provider if provided
        if (provider) {
            if (typeof provider !== 'object' ||
                !['openai', 'anthropic', 'google'].includes(provider.provider)) {
                logger.warn('Invalid provider configuration', { clientIP, provider });
                return NextResponse.json({ error: 'Invalid provider configuration' }, { status: 400 });
            }
        }

        logger.info('Processing component generation request', {
            clientIP,
            promptLength: prompt.length,
            provider: provider?.provider || 'default'
        });

        // Use correct project path - pointing to src/components
        const projectPath = path.resolve(process.cwd(), 'src/components');

        const { code, frontmatter } = await generateComponent({
            prompt,
            projectPath,
            provider: provider || { provider: 'openai' },
            availableUtilities,
            availableComponents,
        });

        logger.info('Component generated successfully', { clientIP });
        return NextResponse.json({ code, frontmatter });

    } catch (error) {
        const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
        logger.error('Component generation failed', { clientIP, error });

        // Don't expose internal error details in production
        const errorMessage = process.env.NODE_ENV === 'production'
            ? 'Internal server error occurred while generating component'
            : error instanceof Error ? error.message : 'Unknown error';

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 