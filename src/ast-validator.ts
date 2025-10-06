import { parse } from '@babel/parser';
import traverseImport, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { VibeOverlordConfig } from './config.js';

// Handle CommonJS/ESM interop for @babel/traverse
const traverse = typeof traverseImport === 'function' ? traverseImport : (traverseImport as any).default;

export interface AstValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * AST-based validation for generated code
 * More robust than regex-based validation
 */
export function validateCodeWithAst(
    code: string,
    config: VibeOverlordConfig
): AstValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
        // Strip frontmatter before parsing
        let codeToValidate = code;
        const frontmatterMatch = code.match(/^---\n([\s\S]*?)\n---\n/);
        if (frontmatterMatch) {
            // Remove frontmatter for AST parsing
            codeToValidate = code.slice(frontmatterMatch[0].length);
        }

        // Parse the code
        const ast = parse(codeToValidate, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript']
        });

        // Validate imports
        traverse(ast, {
            ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
                const source = path.node.source.value;

                // Check if import is allowed
                const isAllowed = isAllowedImport(source, config);

                if (!isAllowed) {
                    errors.push(`Forbidden import: "${source}". Only project-relative imports and allowed packages are permitted.`);
                }
            },

            // Check for dangerous function calls
            CallExpression(path: NodePath<t.CallExpression>) {
                const callee = path.node.callee;

                // Check for eval()
                if (t.isIdentifier(callee) && callee.name === 'eval') {
                    errors.push('Use of eval() is forbidden');
                }

                // Check for Function constructor
                if (t.isIdentifier(callee) && callee.name === 'Function') {
                    errors.push('Use of Function constructor is forbidden');
                }

                // Check for require()
                if (t.isIdentifier(callee) && callee.name === 'require') {
                    errors.push('Use of require() is forbidden - use ES6 imports instead');
                }

                // Check for fetch() - should use provided utilities
                if (t.isIdentifier(callee) && callee.name === 'fetch') {
                    errors.push('Direct fetch() calls are forbidden - use provided utility functions instead');
                }

                // Check for XMLHttpRequest
                if (t.isNewExpression(path.node) && t.isIdentifier(callee) && callee.name === 'XMLHttpRequest') {
                    errors.push('XMLHttpRequest is forbidden - use provided utility functions instead');
                }
            },

            // Check for dangerous member expressions
            MemberExpression(path: NodePath<t.MemberExpression>) {
                const object = path.node.object;
                const property = path.node.property;

                // Check for process.*
                if (t.isIdentifier(object) && object.name === 'process') {
                    errors.push('Access to process object is forbidden');
                }

                // Check for global.*
                if (t.isIdentifier(object) && object.name === 'global') {
                    errors.push('Access to global object is forbidden');
                }

                // Check for window.location assignment
                if (
                    t.isIdentifier(object) && object.name === 'window' &&
                    t.isIdentifier(property) && property.name === 'location' &&
                    t.isAssignmentExpression(path.parent)
                ) {
                    errors.push('Direct window.location manipulation is forbidden');
                }

                // Check for localStorage/sessionStorage
                if (t.isIdentifier(object) && (object.name === 'localStorage' || object.name === 'sessionStorage')) {
                    warnings.push(`Use of ${object.name} detected - ensure this is necessary for your use case`);
                }

                // Check for document.cookie
                if (
                    t.isIdentifier(object) && object.name === 'document' &&
                    t.isIdentifier(property) && property.name === 'cookie'
                ) {
                    errors.push('Direct cookie manipulation is forbidden');
                }

                // Check for innerHTML/outerHTML
                if (
                    t.isIdentifier(property) &&
                    (property.name === 'innerHTML' || property.name === 'outerHTML') &&
                    t.isAssignmentExpression(path.parent)
                ) {
                    errors.push(`Assignment to ${property.name} is forbidden - use React rendering instead`);
                }
            },

            // Check for JSX security issues
            JSXAttribute(path: NodePath<t.JSXAttribute>) {
                const name = path.node.name;

                // Check for dangerouslySetInnerHTML
                if (t.isJSXIdentifier(name) && name.name === 'dangerouslySetInnerHTML') {
                    warnings.push('Use of dangerouslySetInnerHTML detected - ensure content is properly sanitized');
                }
            },

            // Check for accessibility issues
            JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
                const name = path.node.name;

                if (t.isJSXIdentifier(name)) {
                    // Check for interactive elements without keyboard handlers
                    const interactiveElements = ['div', 'span'];
                    const elementName = name.name;

                    if (interactiveElements.includes(elementName.toLowerCase())) {
                        const hasOnClick = path.node.attributes.some(
                            attr => t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                attr.name.name === 'onClick'
                        );

                        const hasRole = path.node.attributes.some(
                            attr => t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                attr.name.name === 'role'
                        );

                        const hasKeyHandler = path.node.attributes.some(
                            attr => t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                (attr.name.name === 'onKeyDown' || attr.name.name === 'onKeyPress')
                        );

                        if (hasOnClick && !hasKeyHandler && !hasRole) {
                            warnings.push(`<${elementName}> with onClick should have keyboard handler or role attribute for accessibility`);
                        }
                    }

                    // Check for images without alt text
                    if (elementName === 'img') {
                        const hasAlt = path.node.attributes.some(
                            attr => t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                attr.name.name === 'alt'
                        );

                        if (!hasAlt) {
                            warnings.push('<img> elements should have alt attribute for accessibility');
                        }
                    }

                    // Check for form inputs without labels
                    if (['input', 'textarea', 'select'].includes(elementName)) {
                        const hasAriaLabel = path.node.attributes.some(
                            attr => t.isJSXAttribute(attr) &&
                                t.isJSXIdentifier(attr.name) &&
                                (attr.name.name === 'aria-label' || attr.name.name === 'aria-labelledby')
                        );

                        if (!hasAriaLabel) {
                            warnings.push(`<${elementName}> should have aria-label or be associated with a <label> for accessibility`);
                        }
                    }
                }
            }
        });

    } catch (error) {
        errors.push(`Failed to parse code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Check if an import source is allowed
 */
function isAllowedImport(source: string, config: VibeOverlordConfig): boolean {
    // Allow relative imports
    if (source.startsWith('.') || source.startsWith('/')) {
        return true;
    }

    // Allow common path aliases (these will be marked as external in bundler)
    if (source.startsWith('@/') || source.startsWith('~/') || source.startsWith('#/')) {
        return true;
    }

    // Check against allowed imports list
    if (config.allowedImports.some(allowed => {
        if (allowed.endsWith('*')) {
            // Wildcard match (e.g., "react*" matches "react", "react-dom", etc.)
            const prefix = allowed.slice(0, -1);
            return source.startsWith(prefix);
        }
        return source === allowed || source.startsWith(allowed + '/');
    })) {
        return true;
    }

    // Check against path aliases from config
    if (config.aliases) {
        for (const alias of Object.keys(config.aliases)) {
            if (source.startsWith(alias)) {
                return true;
            }
        }
    }

    // Block node built-ins
    const nodeBuiltins = [
        'fs', 'path', 'os', 'child_process', 'cluster', 'crypto',
        'dgram', 'dns', 'http', 'https', 'net', 'stream', 'tls',
        'url', 'util', 'v8', 'vm', 'zlib', 'buffer', 'events',
        'process', 'timers'
    ];

    if (nodeBuiltins.includes(source) || source.startsWith('node:')) {
        return false;
    }

    return false;
}

/**
 * Extract import statements for reporting
 */
export function extractImports(code: string): string[] {
    const imports: string[] = [];

    try {
        // Strip frontmatter before parsing
        let codeToValidate = code;
        const frontmatterMatch = code.match(/^---\n([\s\S]*?)\n---\n/);
        if (frontmatterMatch) {
            codeToValidate = code.slice(frontmatterMatch[0].length);
        }

        const ast = parse(codeToValidate, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript']
        });

        traverse(ast, {
            ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
                imports.push(path.node.source.value);
            }
        });
    } catch (error) {
        // Ignore parse errors
    }

    return imports;
}

