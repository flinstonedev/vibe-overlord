import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Template {
    name: string;
    content: string;
    frontmatter: {
        title: string;
        description: string;
        category: string;
        tags: string[];
        pattern: string;
    };
}

/**
 * Load all built-in templates
 */
export function loadBuiltInTemplates(): Template[] {
    const templates: Template[] = [];
    const templatesDir = join(__dirname, 'templates');

    if (!existsSync(templatesDir)) {
        return templates;
    }

    const files = readdirSync(templatesDir).filter(f => f.endsWith('.mdx'));

    for (const file of files) {
        try {
            const content = readFileSync(join(templatesDir, file), 'utf-8');
            const frontmatter = parseFrontmatter(content);

            templates.push({
                name: file.replace('.mdx', ''),
                content,
                frontmatter: frontmatter as any
            });
        } catch (error) {
            console.warn(`Failed to load template ${file}:`, error);
        }
    }

    return templates;
}

/**
 * Load custom templates from a directory
 */
export function loadCustomTemplates(customDir: string): Template[] {
    const templates: Template[] = [];

    if (!existsSync(customDir)) {
        return templates;
    }

    const files = readdirSync(customDir).filter(f => f.endsWith('.mdx'));

    for (const file of files) {
        try {
            const content = readFileSync(join(customDir, file), 'utf-8');
            const frontmatter = parseFrontmatter(content);

            templates.push({
                name: file.replace('.mdx', ''),
                content,
                frontmatter: frontmatter as any
            });
        } catch (error) {
            console.warn(`Failed to load custom template ${file}:`, error);
        }
    }

    return templates;
}

/**
 * Find relevant templates based on prompt
 */
export function findRelevantTemplates(
    prompt: string,
    templates: Template[],
    maxTemplates: number = 2
): Template[] {
    const keywords = prompt.toLowerCase().split(/\s+/);

    const scored = templates.map(template => {
        const searchText = `${template.frontmatter.title} ${template.frontmatter.description} ${template.frontmatter.tags.join(' ')} ${template.frontmatter.pattern}`.toLowerCase();

        const score = keywords.reduce((acc, keyword) => {
            return acc + (searchText.includes(keyword) ? 1 : 0);
        }, 0);

        return { template, score };
    });

    // Sort by score and take top templates
    scored.sort((a, b) => b.score - a.score);

    return scored
        .filter(s => s.score > 0)
        .slice(0, maxTemplates)
        .map(s => s.template);
}

/**
 * Parse frontmatter from MDX content
 */
function parseFrontmatter(content: string): Record<string, any> {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return {};
    }

    const frontmatterText = match[1];
    const frontmatter: Record<string, any> = {};

    // Simple YAML parser for frontmatter
    const lines = frontmatterText.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.substring(0, colonIndex).trim();
        let value: any = line.substring(colonIndex + 1).trim();

        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        // Parse arrays
        if (value.startsWith('[') && value.endsWith(']')) {
            value = value
                .slice(1, -1)
                .split(',')
                .map((v: string) => v.trim().replace(/['"]/g, ''));
        }

        frontmatter[key] = value;
    }

    return frontmatter;
}

/**
 * Build few-shot examples from templates
 */
export function buildFewShotExamples(templates: Template[]): string {
    if (templates.length === 0) {
        return '';
    }

    let examples = '\n\n📚 RELEVANT EXAMPLES:\n';
    examples += 'Here are similar patterns you can reference:\n\n';

    for (const template of templates) {
        examples += `Example: ${template.frontmatter.title}\n`;
        examples += `Pattern: ${template.frontmatter.pattern}\n`;
        examples += `Description: ${template.frontmatter.description}\n`;

        // Extract key code patterns (simplified)
        const stateMatch = template.content.match(/const \[[\s\S]*?\] = React\.useState/g);
        if (stateMatch) {
            examples += `Uses state management: ${stateMatch.length} state variables\n`;
        }

        const effectMatch = template.content.match(/React\.useEffect/g);
        if (effectMatch) {
            examples += `Uses effects: ${effectMatch.length} effects\n`;
        }

        examples += '\n';
    }

    return examples;
}

