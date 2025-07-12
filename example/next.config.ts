import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize mdx-bundler and its dependencies on the server side
      config.externals = config.externals || [];
      config.externals.push('esbuild');
      config.externals.push('mdx-bundler');
    }
    return config;
  },
  serverExternalPackages: ['mdx-bundler', 'esbuild'],

  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy - Different for dev vs production
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allow unsafe-eval and unsafe-inline in development for Next.js functionality
              // In production, use stricter CSP
              isDev
                ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
                : "script-src 'self'",
              "style-src 'self' 'unsafe-inline'", // Tailwind CSS requires this
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://jsonplaceholder.typicode.com https://catfact.ninja",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              ...(isDev ? [] : ["upgrade-insecure-requests"]) // Only in production
            ].join('; ')
          },
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()'
          },
          // HSTS (only in production)
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          }] : [])
        ]
      }
    ];
  }
};

export default nextConfig;
