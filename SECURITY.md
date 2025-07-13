# Security Guide

## Overview

Vibe Overlord is an AI-powered React component generation library with comprehensive security measures. This document outlines the security architecture, implemented controls, and best practices for safe deployment and usage.

## 🚨 Security Architecture

### Defense-in-Depth Implementation

Vibe Overlord implements multiple layers of security controls:

1. **Input Validation Layer** - Comprehensive prompt validation and sanitization
2. **Code Generation Security** - Runtime validation of AI-generated code
3. **API Security Layer** - Rate limiting, authentication, and data validation
4. **Infrastructure Security** - Secure headers, CSP, and environment protection
5. **Monitoring & Auditing** - Automated security testing and vulnerability scanning

## 🔒 Implemented Security Controls

### 1. Input Validation & Sanitization

**Comprehensive Prompt Protection:**
- Length limits: 1-5,000 characters
- Pattern-based injection detection
- Character sanitization and normalization
- Zod schema validation with custom security rules

**Blocked Patterns:**
```typescript
- ignore previous instructions
- system: directives
- <script> tags and JavaScript URLs
- eval() and Function() calls
- Process and file system access attempts
- Dangerous function calls and imports
```

**Implementation:**
```typescript
// Centralized validation in src/security.ts
export const PromptSchema = z.string()
    .min(1, 'Prompt cannot be empty')
    .max(5000, 'Prompt cannot exceed 5000 characters')
    .refine(prompt => {
        // Advanced pattern detection for security
        const dangerousPatterns = [/* comprehensive list */];
        return !dangerousPatterns.some(pattern => pattern.test(prompt));
    }, 'Prompt contains potentially unsafe content');
```

### 2. Code Generation Security

**Multi-Layer Code Validation:**
- Pre-compilation source code analysis
- AST-based pattern detection
- Import statement validation
- Runtime security checks

**Blocked Code Patterns:**
```typescript
- eval() and Function() constructors
- Dynamic imports and require() calls
- Process/global object access
- DOM manipulation (innerHTML, outerHTML)
- Local storage access
- Direct fetch() calls (use provided utilities)
- Script tag injection
- JavaScript URL schemes
```

**Safe Patterns Allowed:**
```typescript
- React event handlers (onClick={})
- Standard React hooks (useState, useEffect)
- Provided utility functions
- Relative imports from project
- Inline styles and CSS classes
```

### 3. API Security

**Rate Limiting:**
- 10 requests per minute per IP address
- Configurable time windows and limits
- Graceful degradation with proper error responses
- Client IP detection with proxy support

**Request Validation:**
- JSON parsing with error handling
- Provider configuration validation
- Comprehensive input sanitization
- Secure error responses (no information leakage)

**Response Security:**
- Sanitized error messages in production
- No stack traces in production logs
- Secure logging with sensitive data redaction

### 4. Infrastructure Security

**HTTP Security Headers:**
```typescript
Content-Security-Policy: 
  default-src 'self';
  script-src 'self';  // Strict script policy
  style-src 'self' 'unsafe-inline';  // Tailwind CSS requirement
  img-src 'self' data: https:;
  connect-src 'self' [approved AI provider domains];
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;

X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()
```

**Environment Security:**
- Startup environment validation
- Crash-fast on production misconfigurations
- API key validation and rotation support
- Secure environment variable handling

### 5. External API Security

**URL Allowlisting:**
```typescript
const ALLOWED_DOMAINS = [
    'jsonplaceholder.typicode.com',
    'api.quotable.io'
];
```

**Request Validation:**
- URL validation before requests
- Response size limits (1MB max)
- Content-type validation
- Response data sanitization

**Data Sanitization:**
```typescript
// Automatic filtering of dangerous content
const dangerousFields = ['script', 'onclick', 'onload', 'javascript:', 'data:'];
// Content filtered for security if detected
```

### 6. Logging & Monitoring Security

**Secure Logging Implementation:**
```typescript
// Production-safe logging
const logger = createSecureLogger();

// Automatic sensitive data redaction
- API keys → 'API_KEY_REDACTED'
- Tokens → 'TOKEN_REDACTED'  
- Passwords → 'PASSWORD_REDACTED'
- Stack traces → Excluded in production
```

**Security Event Logging:**
- Rate limit violations
- Validation failures
- Security pattern detections
- Environment validation errors

## 🛡️ Deployment Security

### Production Environment Setup

**Required Environment Variables:**
```bash
# At least one AI provider required
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# Environment configuration
NODE_ENV=production

# Optional security configuration
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
MAX_PROMPT_LENGTH=5000
```

**Security Validation on Startup:**
- Environment validation with crash-fast on errors
- API key availability verification
- Security configuration validation
- Debug mode detection and warnings

### Content Security Policy (CSP)

**Secure CSP Implementation:**
- Strict script-src policy without unsafe directives
- Strict source allowlisting for all resource types
- Frame ancestors blocking for clickjacking protection
- Upgrade insecure requests enforcement

**CSP Compliance:**
- MDX compilation happens server-side only
- No client-side eval() or unsafe script execution
- Inline styles limited to Tailwind CSS requirements
- All external resources explicitly allowlisted

### Security Tools
- [src/security.ts](./src/security.ts) - Security utility functions
