import { z } from 'zod';
import path from 'path';

// Input validation schemas
export const PromptSchema = z.string()
    .min(1, 'Prompt cannot be empty')
    .max(5000, 'Prompt cannot exceed 5000 characters')
    .refine(prompt => {
        // Check for potential prompt injection patterns
        const dangerousPatterns = [
            /ignore\s+previous\s+instructions/i,
            /system\s*:/i,
            /\/\/\s*@ts-ignore/i,
            /<script[^>]*>/i,
            /javascript\s*:/i,
            /data\s*:/i,
            /eval\s*\(/i,
            /function\s*\(/i,
            /require\s*\(/i,
            /import\s*\(/i,
            /process\s*\./i,
            /global\s*\./i,
            /window\s*\./i,
            /document\s*\./i,
            /__dirname/i,
            /__filename/i,
            /fs\./i,
            /child_process/i,
        ];

        return !dangerousPatterns.some(pattern => pattern.test(prompt));
    }, 'Prompt contains potentially unsafe content');

export const ProjectPathSchema = z.string()
    .min(1, 'Project path cannot be empty')
    .refine(path => {
        // Basic path validation - block obvious dangerous patterns
        const normalizedPath = path.replace(/\\/g, '/');

        // Block null bytes and control characters
        const hasDangerousChars = normalizedPath.includes('\0') ||
            normalizedPath.includes('\r') ||
            normalizedPath.includes('\n') ||
            normalizedPath.includes('\t');

        // Block obviously malicious patterns
        const hasMaliciousPatterns = normalizedPath.includes('../../') ||
            normalizedPath.includes('..\\..\\') ||
            normalizedPath.includes('~/../') ||
            normalizedPath.includes('/etc/') ||
            normalizedPath.includes('/proc/') ||
            normalizedPath.includes('/sys/');

        return !hasDangerousChars && !hasMaliciousPatterns;
    }, 'Invalid project path detected');

export const AIProviderSchema = z.object({
    provider: z.enum(['openai', 'anthropic', 'google']),
    model: z.string().optional()
});

// Code validation and sanitization for SOURCE CODE ONLY
// NOTE: This should only be used to validate source MDX/JSX code before compilation.
// Do NOT use this on compiled JavaScript output from mdx-bundler.
export function validateGeneratedCode(code: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for dangerous patterns in source code
    const dangerousPatterns = [
        { pattern: /eval\s*\(/i, error: 'eval() function not allowed' },
        { pattern: /Function\s*\(/i, error: 'Function constructor not allowed' },
        { pattern: /require\s*\(/i, error: 'require() not allowed in generated components' },
        { pattern: /import\s*\(/i, error: 'Dynamic imports not allowed' },
        { pattern: /process\s*\./i, error: 'Process access not allowed' },
        { pattern: /global\s*\./i, error: 'Global object access not allowed' },
        { pattern: /window\s*\.\s*location\s*=/i, error: 'Window location manipulation not allowed' },
        { pattern: /window\s*\[\s*['"]location['"]]/i, error: 'Window location manipulation not allowed' },
        { pattern: /document\s*\.\s*cookie/i, error: 'Cookie manipulation not allowed' },
        { pattern: /localStorage\s*\./i, error: 'localStorage access not allowed' },
        { pattern: /sessionStorage\s*\./i, error: 'sessionStorage access not allowed' },
        { pattern: /fetch\s*\(/i, error: 'Direct fetch calls not allowed - use provided utilities' },
        { pattern: /XMLHttpRequest/i, error: 'XMLHttpRequest not allowed' },
        { pattern: /innerHTML\s*=/i, error: 'innerHTML assignment not allowed' },
        { pattern: /outerHTML\s*=/i, error: 'outerHTML assignment not allowed' },
        { pattern: /dangerouslySetInnerHTML/i, error: 'dangerouslySetInnerHTML not allowed' },
        { pattern: /<script[^>]*>/i, error: 'Script tags not allowed' },
        { pattern: /javascript\s*:/i, error: 'javascript: URLs not allowed' }
        // NOTE: HTML event handlers (onclick, onload, etc.) are NOT blocked because:
        // 1. MDX can contain legitimate HTML with event handlers
        // 2. Compiled JSX will generate HTML with event handlers
        // 3. Event handlers themselves are not inherently dangerous - the content matters
    ];

    // Check for dangerous patterns
    dangerousPatterns.forEach(({ pattern, error }) => {
        if (pattern.test(code)) {
            errors.push(error);
        }
    });

    // Validate import statements in source code
    const importLines = code.split('\n').filter(line => line.trim().startsWith('import'));
    importLines.forEach(line => {
        // Only allow relative imports and specific allowed modules
        const allowedImports = [
            /^import\s+.*\s+from\s+['"]react['"];?$/,
            /^import\s+.*\s+from\s+['"]\.{1,2}\/.*['"];?$/, // Relative imports
            /^import\s+.*\s+from\s+['"]@\/.*['"];?$/, // @ alias imports
        ];

        if (!allowedImports.some(pattern => pattern.test(line.trim()))) {
            errors.push(`Potentially unsafe import: ${line.trim()}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Sanitize user input
export function sanitizePrompt(prompt: string): string {
    // Remove potentially dangerous characters and normalize
    return prompt
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove HTML entities like &quot; &lt; etc.
        .replace(/javascript\s*:/gi, '') // Remove javascript: URLs
        .trim();
}

// Rate limiting utilities
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

export class RateLimiter {
    private requests: Map<string, number[]> = new Map();

    constructor(private config: RateLimitConfig) { }

    isAllowed(identifier: string): boolean {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        // Get existing requests for this identifier
        const requests = this.requests.get(identifier) || [];

        // Filter out requests outside the window
        const validRequests = requests.filter(time => time > windowStart);

        // Check if limit exceeded
        if (validRequests.length >= this.config.maxRequests) {
            return false;
        }

        // Add current request
        validRequests.push(now);
        this.requests.set(identifier, validRequests);

        return true;
    }

    getRemainingRequests(identifier: string): number {
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        const requests = this.requests.get(identifier) || [];
        const validRequests = requests.filter(time => time > windowStart);

        return Math.max(0, this.config.maxRequests - validRequests.length);
    }
}

// Secure path utilities
export function securePath(basePath: string, userPath: string): string {

    // If userPath is absolute, validate it directly
    if (path.isAbsolute(userPath)) {
        const normalizedUserPath = path.normalize(userPath);
        const normalizedBasePath = path.normalize(basePath);

        // For absolute paths, ensure they're within reasonable bounds
        // and don't access system directories
        if (normalizedUserPath.includes('/etc/') ||
            normalizedUserPath.includes('/proc/') ||
            normalizedUserPath.includes('/sys/') ||
            normalizedUserPath.includes('\\Windows\\System32\\')) {
            throw new Error('Access to system directories not allowed');
        }

        return normalizedUserPath;
    }

    // For relative paths, resolve and validate against base path
    const resolvedPath = path.resolve(basePath, userPath);
    const normalizedBasePath = path.resolve(basePath);

    // Ensure the resolved path is within the base path
    if (!resolvedPath.startsWith(normalizedBasePath)) {
        throw new Error('Path traversal attempt detected');
    }

    return resolvedPath;
}

// Environment validation
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required environment variables
    const requiredEnvVars = [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'GOOGLE_GENERATIVE_AI_API_KEY'
    ];

    const hasAtLeastOne = requiredEnvVars.some(envVar => process.env[envVar]);

    if (!hasAtLeastOne) {
        errors.push('At least one AI provider API key must be configured');
    }

    // Check for development mode in production
    if (process.env.NODE_ENV === 'production') {
        if (process.env.DEBUG === 'true' || process.env.VERBOSE === 'true') {
            errors.push('Debug/verbose logging should be disabled in production');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Secure logging utilities
export function createSecureLogger() {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        info: (message: string, meta?: any) => {
            if (!isProduction) {
                console.log(`[INFO] ${message}`, meta ? sanitizeLogData(meta) : '');
            }
        },
        warn: (message: string, meta?: any) => {
            console.warn(`[WARN] ${message}`, meta ? sanitizeLogData(meta) : '');
        },
        error: (message: string, error?: any) => {
            console.error(`[ERROR] ${message}`, error ? sanitizeError(error) : '');
        }
    };
}

function sanitizeLogData(data: any): any {
    if (typeof data === 'string') {
        // Remove potential sensitive information
        return data
            .replace(/api[_-]?key['":\s=]*['"]*[a-zA-Z0-9-_]{20,}['"]*?/gi, 'API_KEY_REDACTED')
            .replace(/token['":\s=]*['"]*[a-zA-Z0-9-_.]{20,}['"]*?/gi, 'TOKEN_REDACTED')
            .replace(/password['":\s=]*['"]*[^\s'"]+['"]*?/gi, 'PASSWORD_REDACTED');
    }

    if (typeof data === 'object' && data !== null) {
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => {
            if (/api[_-]?key|token|password|secret/i.test(key)) {
                sanitized[key] = 'REDACTED';
            }
        });
        return sanitized;
    }

    return data;
}

function sanitizeError(error: any): any {
    if (error instanceof Error) {
        return {
            message: error.message,
            name: error.name,
            // Don't include stack trace in production
            ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
        };
    }
    return sanitizeLogData(error);
} 