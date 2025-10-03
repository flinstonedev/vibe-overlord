import { generateObject } from 'ai';
import { z } from 'zod';
import { getProviderModel } from './providers.js';
import { AIProviderConfig } from './index.js';
import { ScannedCatalog, retrieveRelevantItems } from './scanner.js';

/**
 * Component specification schema
 */
export const ComponentSpecSchema = z.object({
    name: z.string().describe('Component name in PascalCase'),
    description: z.string().describe('Brief description of what the component does'),
    category: z.enum(['ui', 'form', 'layout', 'data', 'navigation', 'feedback', 'media', 'other'])
        .describe('Component category'),

    // State management
    state: z.array(z.object({
        name: z.string(),
        type: z.string(),
        initialValue: z.string().optional(),
        description: z.string()
    })).optional().describe('React state variables needed'),

    // Props
    props: z.array(z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean(),
        description: z.string(),
        defaultValue: z.string().optional()
    })).optional().describe('Component props'),

    // Data dependencies
    dataDependencies: z.array(z.object({
        utility: z.string(),
        when: z.string().describe('When to call (mount, interaction, etc.)'),
        params: z.record(z.string()).optional()
    })).optional().describe('Utility functions the component needs to call'),

    // Child components
    subComponents: z.array(z.object({
        component: z.string(),
        purpose: z.string()
    })).optional().describe('Existing components to reuse'),

    // Interactions
    interactions: z.array(z.object({
        trigger: z.string().describe('What triggers it (click, hover, etc.)'),
        action: z.string().describe('What happens'),
        stateChanges: z.array(z.string()).optional()
    })).optional().describe('User interactions and their effects'),

    // Accessibility
    accessibility: z.object({
        hasKeyboardNav: z.boolean(),
        ariaLabels: z.array(z.string()).optional(),
        focusManagement: z.string().optional(),
        screenReaderText: z.array(z.string()).optional()
    }).optional().describe('Accessibility requirements'),

    // Styling approach
    styling: z.object({
        approach: z.enum(['inline', 'tailwind', 'css-modules', 'styled-components']),
        responsive: z.boolean(),
        darkMode: z.boolean().optional()
    }).describe('Styling strategy'),

    // Implementation notes
    notes: z.array(z.string()).optional().describe('Additional implementation notes')
});

export type ComponentSpec = z.infer<typeof ComponentSpecSchema>;

/**
 * Generate a component specification from a prompt
 */
export async function planComponent(
    prompt: string,
    catalog: ScannedCatalog,
    providerConfig: AIProviderConfig = { provider: 'openai' },
    maxContextItems: number = 10
): Promise<ComponentSpec> {
    const model = getProviderModel(providerConfig);

    // Retrieve relevant components and utilities
    const relevant = retrieveRelevantItems(prompt, catalog, maxContextItems);

    // Build context
    const availableComponents = relevant.components.length > 0
        ? `\nAvailable Components:\n${relevant.components.map(c =>
            `- ${c.name}: ${c.description}${c.props ? ` (Props: ${c.props})` : ''}`
        ).join('\n')}`
        : '';

    const availableUtilities = relevant.utilities.length > 0
        ? `\nAvailable Utilities:\n${relevant.utilities.map(u =>
            `- ${u.name}: ${u.description} (${u.signature})`
        ).join('\n')}`
        : '';

    const systemPrompt = `You are an expert React component architect.
Your job is to analyze a component request and create a detailed specification for implementation.

Consider:
- What state management is needed?
- What props should the component accept?
- What existing components can be reused?
- What utility functions are needed for data fetching?
- What user interactions are required?
- What accessibility features are needed?
- What styling approach fits best?

Be specific and practical. Only include what's necessary for the requested component.${availableComponents}${availableUtilities}`;

    const result = await generateObject({
        model,
        schema: ComponentSpecSchema,
        system: systemPrompt,
        prompt: `Create a component specification for: ${prompt}

Analyze the request and determine:
1. What the component should be called
2. What state it needs to manage
3. What props it should accept
4. What data it needs to fetch (use available utilities)
5. What child components to use (prefer existing components)
6. What user interactions it supports
7. What accessibility features it needs
8. How it should be styled

Be thorough but practical. Only specify what's actually needed.`
    });

    return result.object as ComponentSpec;
}

/**
 * Validate a component spec
 */
export function validateComponentSpec(spec: ComponentSpec): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for naming conventions
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(spec.name)) {
        errors.push(`Component name "${spec.name}" must be in PascalCase`);
    }

    // Check for description
    if (!spec.description || spec.description.length < 10) {
        errors.push('Component description is too short');
    }

    // Validate state definitions
    if (spec.state) {
        for (const state of spec.state) {
            if (!state.name || !state.type) {
                errors.push(`State definition incomplete: ${JSON.stringify(state)}`);
            }
        }
    }

    // Validate props
    if (spec.props) {
        for (const prop of spec.props) {
            if (!prop.name || !prop.type) {
                errors.push(`Prop definition incomplete: ${JSON.stringify(prop)}`);
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generate implementation prompt from spec
 */
export function specToImplementationPrompt(spec: ComponentSpec): string {
    let prompt = `Implement a React component named "${spec.name}".

Description: ${spec.description}
Category: ${spec.category}
`;

    if (spec.props && spec.props.length > 0) {
        prompt += `\nProps:\n${spec.props.map(p =>
            `- ${p.name}${p.required ? ' (required)' : ' (optional)'}: ${p.type}${p.defaultValue ? ` = ${p.defaultValue}` : ''} - ${p.description}`
        ).join('\n')}`;
    }

    if (spec.state && spec.state.length > 0) {
        prompt += `\nState Management:\n${spec.state.map(s =>
            `- ${s.name}: ${s.type}${s.initialValue ? ` = ${s.initialValue}` : ''} - ${s.description}`
        ).join('\n')}`;
    }

    if (spec.dataDependencies && spec.dataDependencies.length > 0) {
        prompt += `\nData Dependencies:\n${spec.dataDependencies.map(d =>
            `- Call ${d.utility} ${d.when}${d.params ? ` with params: ${JSON.stringify(d.params)}` : ''}`
        ).join('\n')}`;
    }

    if (spec.subComponents && spec.subComponents.length > 0) {
        prompt += `\nUse These Components:\n${spec.subComponents.map(c =>
            `- ${c.component}: ${c.purpose}`
        ).join('\n')}`;
    }

    if (spec.interactions && spec.interactions.length > 0) {
        prompt += `\nInteractions:\n${spec.interactions.map(i =>
            `- On ${i.trigger}: ${i.action}${i.stateChanges ? ` (updates: ${i.stateChanges.join(', ')})` : ''}`
        ).join('\n')}`;
    }

    if (spec.accessibility) {
        prompt += `\nAccessibility:\n`;
        if (spec.accessibility.hasKeyboardNav) {
            prompt += `- Implement keyboard navigation\n`;
        }
        if (spec.accessibility.ariaLabels) {
            prompt += `- Add ARIA labels: ${spec.accessibility.ariaLabels.join(', ')}\n`;
        }
        if (spec.accessibility.focusManagement) {
            prompt += `- Focus management: ${spec.accessibility.focusManagement}\n`;
        }
        if (spec.accessibility.screenReaderText) {
            prompt += `- Screen reader text: ${spec.accessibility.screenReaderText.join(', ')}\n`;
        }
    }

    prompt += `\nStyling: Use ${spec.styling.approach}${spec.styling.responsive ? ', make it responsive' : ''}${spec.styling.darkMode ? ', support dark mode' : ''}.`;

    if (spec.notes && spec.notes.length > 0) {
        prompt += `\n\nImplementation Notes:\n${spec.notes.map(n => `- ${n}`).join('\n')}`;
    }

    return prompt;
}

