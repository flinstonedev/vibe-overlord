import { NextResponse } from 'next/server';
import {
    generateComponent,
    PromptSchema,
    RateLimiter,
    createSecureLogger,
    validateEnvironment,
    loadConfig,
    scanProject,
    ScannedCatalog
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

// Cache for scanned project catalog
let catalogCache: ScannedCatalog | null = null;
let lastScan = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

        // Get project path
        const projectPath = path.resolve(process.cwd());

        // Load configuration from vibe-overlord.config.ts
        const config = await loadConfig(projectPath);

        // Scan project for components and utilities (with caching)
        const now = Date.now();
        if (!catalogCache || now - lastScan > CACHE_TTL) {
            logger.info('Scanning project for components and utilities...');
            try {
                catalogCache = await scanProject(projectPath, config);
                lastScan = now;
                logger.info('Project scan complete', {
                    components: catalogCache.components.length,
                    utilities: catalogCache.utilities.length
                });
            } catch (scanError) {
                logger.warn('Project scan failed, proceeding without catalog', { error: scanError });
                catalogCache = null;
            }
        }

        // Generate component with all features enabled
        const { code, frontmatter, spec } = await generateComponent({
            prompt,
            projectPath,
            provider: provider || { provider: 'openai' },
            config,
            catalog: catalogCache || undefined
        });

        logger.info('Component generated successfully', {
            clientIP,
            componentName: frontmatter?.title,
            usedTwoPhase: !!spec
        });

        return NextResponse.json({
            code,
            frontmatter,
            // Include spec in development for debugging
            spec: process.env.NODE_ENV === 'development' ? spec : undefined,
            // Include catalog stats in development
            catalogStats: process.env.NODE_ENV === 'development' && catalogCache ? {
                components: catalogCache.components.length,
                utilities: catalogCache.utilities.length
            } : undefined
        });

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
