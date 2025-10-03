import { glob } from 'glob';
import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { VibeOverlordConfig } from './config.js';
import { AvailableComponent, AvailableUtility } from './index.js';

export interface ScannedCatalog {
    components: AvailableComponent[];
    utilities: AvailableUtility[];
    embeddings?: Map<string, number[]>;
}

/**
 * Scan project for components and utilities
 */
export async function scanProject(
    projectPath: string,
    config: VibeOverlordConfig
): Promise<ScannedCatalog> {
    const components = await scanComponents(projectPath, config);
    const utilities = await scanUtilities(projectPath, config);

    const catalog: ScannedCatalog = {
        components,
        utilities
    };

    // Generate embeddings if enabled
    if (config.useEmbeddings && config.embeddingsApiKey) {
        catalog.embeddings = await generateEmbeddings(catalog, config);
    }

    return catalog;
}

/**
 * Scan for React components
 */
async function scanComponents(
    projectPath: string,
    config: VibeOverlordConfig
): Promise<AvailableComponent[]> {
    const components: AvailableComponent[] = [];

    for (const pattern of config.componentGlobs) {
        const files = await glob(pattern, {
            cwd: projectPath,
            ignore: config.excludeGlobs,
            absolute: true
        });

        for (const filePath of files) {
            try {
                const extracted = extractComponentsFromFile(filePath, projectPath, config);
                components.push(...extracted);
            } catch (error) {
                console.warn(`Failed to parse ${filePath}:`, error);
            }
        }
    }

    return components;
}

/**
 * Scan for utility functions
 */
async function scanUtilities(
    projectPath: string,
    config: VibeOverlordConfig
): Promise<AvailableUtility[]> {
    const utilities: AvailableUtility[] = [];

    for (const pattern of config.utilityGlobs) {
        const files = await glob(pattern, {
            cwd: projectPath,
            ignore: config.excludeGlobs,
            absolute: true
        });

        for (const filePath of files) {
            try {
                const extracted = extractUtilitiesFromFile(filePath, projectPath, config);
                utilities.push(...extracted);
            } catch (error) {
                console.warn(`Failed to parse ${filePath}:`, error);
            }
        }
    }

    return utilities;
}

/**
 * Extract components from a file using AST parsing
 */
function extractComponentsFromFile(
    filePath: string,
    projectPath: string,
    config: VibeOverlordConfig
): AvailableComponent[] {
    const content = readFileSync(filePath, 'utf-8');
    const components: AvailableComponent[] = [];

    // Parse with TypeScript and JSX support
    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    });

    // Extract JSDoc comments
    const comments = new Map<number, string>();
    if (ast.comments) {
        for (const comment of ast.comments) {
            if (comment.type === 'CommentBlock' && comment.value.includes('*')) {
                comments.set(comment.loc?.start.line || 0, comment.value);
            }
        }
    }

    traverse(ast, {
        // Arrow function components: export const Button = () => {}
        VariableDeclarator(path) {
            if (
                t.isIdentifier(path.node.id) &&
                isExported(path) &&
                isReactComponent(path.node.init)
            ) {
                const name = path.node.id.name;
                const description = extractDescription(path, comments);
                const props = extractProps(path.node.init);

                components.push({
                    name,
                    description: description || `${name} component`,
                    props,
                    importPath: getImportPath(filePath, projectPath, config),
                    example: generateComponentExample(name, props)
                });
            }
        },

        // Function declaration components: export function Button() {}
        FunctionDeclaration(path) {
            if (
                path.node.id &&
                isExported(path) &&
                isReactComponent(path.node)
            ) {
                const name = path.node.id.name;
                const description = extractDescription(path, comments);
                const props = extractProps(path.node);

                components.push({
                    name,
                    description: description || `${name} component`,
                    props,
                    importPath: getImportPath(filePath, projectPath, config),
                    example: generateComponentExample(name, props)
                });
            }
        }
    });

    return components;
}

/**
 * Extract utilities from a file using AST parsing
 */
function extractUtilitiesFromFile(
    filePath: string,
    projectPath: string,
    config: VibeOverlordConfig
): AvailableUtility[] {
    const content = readFileSync(filePath, 'utf-8');
    const utilities: AvailableUtility[] = [];

    const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    });

    const comments = new Map<number, string>();
    if (ast.comments) {
        for (const comment of ast.comments) {
            if (comment.type === 'CommentBlock' && comment.value.includes('*')) {
                comments.set(comment.loc?.start.line || 0, comment.value);
            }
        }
    }

    traverse(ast, {
        // Arrow function utilities: export const fetchData = async () => {}
        VariableDeclarator(path) {
            if (
                t.isIdentifier(path.node.id) &&
                isExported(path) &&
                isUtilityFunction(path.node.init)
            ) {
                const name = path.node.id.name;
                const description = extractDescription(path, comments);
                const signature = extractFunctionSignature(name, path.node.init);
                const returnType = extractReturnType(path.node.init);

                utilities.push({
                    name,
                    description: description || `${name} utility function`,
                    signature,
                    returnType,
                    importPath: getImportPath(filePath, projectPath, config),
                    example: generateUtilityExample(name, signature)
                });
            }
        },

        // Function declaration utilities: export function fetchData() {}
        FunctionDeclaration(path) {
            if (
                path.node.id &&
                isExported(path)
            ) {
                const name = path.node.id.name;
                const description = extractDescription(path, comments);
                const signature = extractFunctionSignature(name, path.node);
                const returnType = extractReturnType(path.node);

                utilities.push({
                    name,
                    description: description || `${name} utility function`,
                    signature,
                    returnType,
                    importPath: getImportPath(filePath, projectPath, config),
                    example: generateUtilityExample(name, signature)
                });
            }
        }
    });

    return utilities;
}

/**
 * Check if a path is exported
 */
function isExported(path: any): boolean {
    let parent = path.parentPath;
    while (parent) {
        if (t.isExportNamedDeclaration(parent.node) || t.isExportDefaultDeclaration(parent.node)) {
            return true;
        }
        parent = parent.parentPath;
    }
    return false;
}

/**
 * Check if a node is a React component
 */
function isReactComponent(node: any): boolean {
    if (!node) return false;

    // Check if it returns JSX
    let returnsJSX = false;

    if (t.isArrowFunctionExpression(node) || t.isFunctionExpression(node) || t.isFunctionDeclaration(node)) {
        const body = node.body;

        // Implicit return: () => <div />
        if (t.isJSXElement(body) || t.isJSXFragment(body)) {
            returnsJSX = true;
        }

        // Block body with return statement
        if (t.isBlockStatement(body)) {
            traverse(body, {
                ReturnStatement(path) {
                    const argument = path.node.argument;
                    if (t.isJSXElement(argument) || t.isJSXFragment(argument)) {
                        returnsJSX = true;
                        path.stop();
                    }
                }
            }, node);
        }
    }

    return returnsJSX;
}

/**
 * Check if a node is a utility function (not a component)
 */
function isUtilityFunction(node: any): boolean {
    if (!node) return false;
    return (
        t.isArrowFunctionExpression(node) ||
        t.isFunctionExpression(node)
    ) && !isReactComponent(node);
}

/**
 * Extract JSDoc description
 */
function extractDescription(path: any, comments: Map<number, string>): string | undefined {
    const line = path.node.loc?.start.line;
    if (!line) return undefined;

    // Look for comment in the few lines above
    for (let i = line - 1; i >= Math.max(1, line - 5); i--) {
        const comment = comments.get(i);
        if (comment) {
            // Extract description from JSDoc
            const descMatch = comment.match(/\*\s*@description\s+(.+)/);
            if (descMatch) return descMatch[1].trim();

            // Extract first line of JSDoc
            const lines = comment.split('\n').map(l => l.trim().replace(/^\*\s*/, ''));
            const firstLine = lines.find(l => l && !l.startsWith('@'));
            if (firstLine) return firstLine;
        }
    }

    return undefined;
}

/**
 * Extract props from a component
 */
function extractProps(node: any): string | undefined {
    if (!node) return undefined;

    const params = node.params;
    if (!params || params.length === 0) return undefined;

    const firstParam = params[0];

    // TypeScript type annotation
    if (firstParam.typeAnnotation) {
        return extractTypeAnnotation(firstParam.typeAnnotation);
    }

    // Destructured props
    if (t.isObjectPattern(firstParam)) {
        const propNames = firstParam.properties
            .map((prop: any) => {
                if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                    return prop.key.name;
                }
                return null;
            })
            .filter(Boolean);

        if (propNames.length > 0) {
            return propNames.join(', ');
        }
    }

    return undefined;
}

/**
 * Extract type annotation as string
 */
function extractTypeAnnotation(typeAnnotation: any): string {
    // Simplified type extraction - in production, use a proper type printer
    if (t.isTSTypeAnnotation(typeAnnotation)) {
        const tsType = typeAnnotation.typeAnnotation;

        if (t.isTSTypeLiteral(tsType)) {
            const props = tsType.members
                .map((member: any) => {
                    if (t.isTSPropertySignature(member) && t.isIdentifier(member.key)) {
                        return member.key.name;
                    }
                    return null;
                })
                .filter(Boolean);
            return props.join(', ');
        }
    }

    return 'props';
}

/**
 * Extract function signature
 */
function extractFunctionSignature(name: string, node: any): string {
    if (!node) return `${name}()`;

    const params = node.params || [];
    const paramStrings = params.map((param: any) => {
        if (t.isIdentifier(param)) {
            return param.name;
        }
        if (t.isObjectPattern(param)) {
            return '{ ... }';
        }
        if (t.isArrayPattern(param)) {
            return '[ ... ]';
        }
        return 'arg';
    });

    return `${name}(${paramStrings.join(', ')})`;
}

/**
 * Extract return type
 */
function extractReturnType(node: any): string | undefined {
    if (!node) return undefined;

    // Check for TypeScript return type annotation
    if (node.returnType && t.isTSTypeAnnotation(node.returnType)) {
        // Simplified - could be expanded
        const tsType = node.returnType.typeAnnotation;
        if (t.isTSTypeReference(tsType) && t.isIdentifier(tsType.typeName)) {
            return tsType.typeName.name;
        }
    }

    // Check if it's async
    if (node.async) {
        return 'Promise<any>';
    }

    return undefined;
}

/**
 * Get import path relative to project root
 */
function getImportPath(filePath: string, projectPath: string, config: VibeOverlordConfig): string {
    const relativePath = relative(projectPath, filePath);

    // Remove file extension
    const withoutExt = relativePath.replace(/\.(tsx?|jsx?)$/, '');

    // Convert to import path
    return './' + withoutExt.replace(/\\/g, '/');
}

/**
 * Generate example usage for a component
 */
function generateComponentExample(name: string, props?: string): string {
    if (!props) {
        return `<${name} />`;
    }

    return `<${name}>Content</${name}>`;
}

/**
 * Generate example usage for a utility
 */
function generateUtilityExample(name: string, signature: string): string {
    return `const result = await ${signature};`;
}

/**
 * Generate embeddings for catalog items (requires OpenAI API)
 */
async function generateEmbeddings(
    catalog: ScannedCatalog,
    config: VibeOverlordConfig
): Promise<Map<string, number[]>> {
    if (!config.embeddingsApiKey) {
        throw new Error('Embeddings API key is required');
    }

    const embeddings = new Map<string, number[]>();

    // Prepare texts for embedding
    const items: { id: string; text: string }[] = [];

    for (const component of catalog.components) {
        const text = `${component.name}: ${component.description}. Props: ${component.props || 'none'}. Category: ${component.category || 'ui'}`;
        items.push({ id: `component:${component.name}`, text });
    }

    for (const utility of catalog.utilities) {
        const text = `${utility.name}: ${utility.description}. Signature: ${utility.signature}. Returns: ${utility.returnType || 'void'}`;
        items.push({ id: `utility:${utility.name}`, text });
    }

    // Generate embeddings in batches
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.embeddingsApiKey}`
                },
                body: JSON.stringify({
                    model: config.embeddingsModel,
                    input: batch.map(item => item.text)
                })
            });

            if (!response.ok) {
                throw new Error(`Embeddings API error: ${response.statusText}`);
            }

            const data = await response.json();

            for (let j = 0; j < batch.length; j++) {
                embeddings.set(batch[j].id, data.data[j].embedding);
            }
        } catch (error) {
            console.error('Failed to generate embeddings:', error);
        }
    }

    return embeddings;
}

/**
 * Retrieve most relevant items from catalog based on prompt
 */
export function retrieveRelevantItems(
    prompt: string,
    catalog: ScannedCatalog,
    maxItems: number = 10
): { components: AvailableComponent[]; utilities: AvailableUtility[] } {
    if (!catalog.embeddings) {
        // Simple fallback: return first N items
        return {
            components: catalog.components.slice(0, maxItems),
            utilities: catalog.utilities.slice(0, maxItems)
        };
    }

    // TODO: Implement proper embedding-based retrieval
    // For now, use simple keyword matching
    const keywords = prompt.toLowerCase().split(/\s+/);

    const scoredComponents = catalog.components.map(comp => {
        const text = `${comp.name} ${comp.description} ${comp.category || ''}`.toLowerCase();
        const score = keywords.reduce((acc, keyword) => {
            return acc + (text.includes(keyword) ? 1 : 0);
        }, 0);
        return { item: comp, score };
    });

    const scoredUtilities = catalog.utilities.map(util => {
        const text = `${util.name} ${util.description}`.toLowerCase();
        const score = keywords.reduce((acc, keyword) => {
            return acc + (text.includes(keyword) ? 1 : 0);
        }, 0);
        return { item: util, score };
    });

    // Sort by score and take top items
    scoredComponents.sort((a, b) => b.score - a.score);
    scoredUtilities.sort((a, b) => b.score - a.score);

    return {
        components: scoredComponents.slice(0, maxItems).map(s => s.item),
        utilities: scoredUtilities.slice(0, maxItems).map(s => s.item)
    };
}

