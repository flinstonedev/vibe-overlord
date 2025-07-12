import { test, expect, vi } from 'vitest';
import { generateComponent } from './index';
import path from 'path';

// Mock the Vercel AI SDK
vi.mock('ai', () => ({
    generateText: vi.fn().mockResolvedValue({
        text: `
---
title: "My Awesome AI Component"
description: "A demo component that showcases AI-generated React components"
category: "demo"
tags: ["ai", "demo", "example"]
version: "1.0.0"
---
import Demo from './demo.tsx'

## AI-Generated Component

<Demo />
    `.trim(),
    }),
}));

test('generateComponent should bundle an MDX string with a local import', async () => {
    const projectPath = path.resolve(__dirname, '../tests/fixtures');
    const result = await generateComponent({
        prompt: 'Create a component that uses my Demo component.',
        projectPath,
    });

    expect(typeof result.code).toBe('string');
    expect(result.code.length).toBeGreaterThan(0);
});

test('generateComponent should correctly parse the frontmatter', async () => {
    const projectPath = path.resolve(__dirname, '../tests/fixtures');
    const result = await generateComponent({
        prompt: 'Create a component with a title.',
        projectPath,
    });

    expect(result.frontmatter).toEqual({
        title: 'My Awesome AI Component',
        description: 'A demo component that showcases AI-generated React components',
        category: 'demo',
        tags: ['ai', 'demo', 'example'],
        version: '1.0.0',
    });
}); 