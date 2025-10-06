/**
 * Automatic fixes for common MDX generation issues
 * Applies deterministic transformations to fix predictable problems
 */

import { parse } from '@babel/parser';
import generate from '@babel/generator';
import traverseImport, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

// Handle CommonJS/ESM interop for @babel/traverse
const traverse = typeof traverseImport === 'function' ? traverseImport : (traverseImport as any).default;

export interface AutoFixResult {
    code: string;
    fixes: string[];
}

/**
 * Extract frontmatter from MDX content
 */
function extractFrontmatter(code: string): { frontmatter: string | null; content: string } {
    const frontmatterMatch = code.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (frontmatterMatch) {
        return {
            frontmatter: frontmatterMatch[1],
            content: frontmatterMatch[2]
        };
    }

    return { frontmatter: null, content: code };
}

/**
 * Apply automatic fixes to generated MDX code
 */
export function autoFixMdx(code: string): AutoFixResult {
    const fixes: string[] = [];

    // Extract frontmatter
    const { frontmatter, content } = extractFrontmatter(code);

    try {
        // Parse the code (without frontmatter)
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript']
        });

        // Fix 1: Move top-level const/let/var declarations into the export
        const topLevelVars: t.VariableDeclaration[] = [];
        const exportsToEnhance: t.ExportNamedDeclaration[] = [];

        traverse(ast, {
            Program(path: NodePath<t.Program>) {
                const body = path.node.body;
                const newBody: t.Statement[] = [];

                for (const statement of body) {
                    // Collect top-level variable declarations (not in exports)
                    if (t.isVariableDeclaration(statement)) {
                        topLevelVars.push(statement);
                        fixes.push(`Moved top-level ${statement.kind} declaration inside component`);
                        // Don't add to newBody - we'll move it
                    }
                    // Track export declarations
                    else if (t.isExportNamedDeclaration(statement) &&
                             t.isVariableDeclaration(statement.declaration) &&
                             statement.declaration.declarations.length > 0) {
                        const decl = statement.declaration.declarations[0];
                        if (t.isIdentifier(decl.id) && t.isArrowFunctionExpression(decl.init)) {
                            exportsToEnhance.push(statement);
                        }
                        newBody.push(statement);
                    } else {
                        newBody.push(statement);
                    }
                }

                // If we found top-level vars and an export, move the vars inside the export
                if (topLevelVars.length > 0 && exportsToEnhance.length > 0) {
                    const mainExport = exportsToEnhance[0];
                    const varDecl = mainExport.declaration as t.VariableDeclaration;
                    const componentDecl = varDecl.declarations[0];
                    const arrowFunc = componentDecl.init as t.ArrowFunctionExpression;

                    // Get or create the function body
                    let bodyStatements: t.Statement[] = [];

                    if (t.isBlockStatement(arrowFunc.body)) {
                        bodyStatements = [...arrowFunc.body.body];
                    } else {
                        // Convert expression body to block
                        bodyStatements = [t.returnStatement(arrowFunc.body)];
                    }

                    // Insert the top-level vars at the beginning of the function
                    bodyStatements.unshift(...topLevelVars);

                    // Update the arrow function body
                    arrowFunc.body = t.blockStatement(bodyStatements);
                }

                path.node.body = newBody;
            }
        });

        // Fix 2: Add unique keys to JSX elements in map calls
        traverse(ast, {
            CallExpression(path: NodePath<t.CallExpression>) {
                const callee = path.node.callee;

                // Check if this is an array.map() call
                if (t.isMemberExpression(callee) &&
                    t.isIdentifier(callee.property) &&
                    callee.property.name === 'map') {

                    const callback = path.node.arguments[0];

                    // Check if the callback returns JSX
                    if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
                        let jsxElement: t.JSXElement | null = null;

                        // Get the JSX element being returned
                        if (t.isJSXElement(callback.body)) {
                            jsxElement = callback.body;
                        } else if (t.isBlockStatement(callback.body)) {
                            // Look for return statement
                            for (const statement of callback.body.body) {
                                if (t.isReturnStatement(statement) &&
                                    statement.argument &&
                                    t.isJSXElement(statement.argument)) {
                                    jsxElement = statement.argument;
                                    break;
                                }
                            }
                        }

                        if (jsxElement) {
                            const openingElement = jsxElement.openingElement;

                            // Check if key already exists
                            const hasKey = openingElement.attributes.some(
                                attr => t.isJSXAttribute(attr) &&
                                       t.isJSXIdentifier(attr.name) &&
                                       attr.name.name === 'key'
                            );

                            if (!hasKey) {
                                // Get the callback parameters
                                const params = callback.params;
                                const itemParam = params[0];
                                const indexParam = params[1];

                                if (itemParam && indexParam) {
                                    // Create key={`item-${index}`} or similar
                                    let keyExpression: t.Expression;

                                    if (t.isIdentifier(itemParam) && t.isIdentifier(indexParam)) {
                                        // Try to create a unique key using item properties + index
                                        // key={`${item.id || index}`} or key={`item-${index}`}
                                        keyExpression = t.templateLiteral(
                                            [
                                                t.templateElement({ raw: 'item-', cooked: 'item-' }, false),
                                                t.templateElement({ raw: '', cooked: '' }, true)
                                            ],
                                            [t.identifier(indexParam.name)]
                                        );
                                    } else if (t.isIdentifier(indexParam)) {
                                        keyExpression = t.identifier(indexParam.name);
                                    } else {
                                        // Fallback: use index
                                        keyExpression = t.numericLiteral(0); // placeholder
                                    }

                                    // Add the key attribute
                                    openingElement.attributes.push(
                                        t.jsxAttribute(
                                            t.jsxIdentifier('key'),
                                            t.jsxExpressionContainer(keyExpression)
                                        )
                                    );

                                    fixes.push('Added unique key to JSX element in map');
                                }
                            }
                        }
                    }
                }
            }
        });

        // Fix 3: Convert onclick to onClick, onchange to onChange, etc.
        traverse(ast, {
            JSXAttribute(path: NodePath<t.JSXAttribute>) {
                const name = path.node.name;
                if (t.isJSXIdentifier(name)) {
                    const attrName = name.name;

                    // Common lowercase event handlers that should be camelCase
                    const lowercaseHandlers: Record<string, string> = {
                        'onclick': 'onClick',
                        'onchange': 'onChange',
                        'onsubmit': 'onSubmit',
                        'onfocus': 'onFocus',
                        'onblur': 'onBlur',
                        'onkeydown': 'onKeyDown',
                        'onkeyup': 'onKeyUp',
                        'onkeypress': 'onKeyPress',
                        'onmouseenter': 'onMouseEnter',
                        'onmouseleave': 'onMouseLeave',
                        'onmouseover': 'onMouseOver',
                    };

                    if (lowercaseHandlers[attrName]) {
                        name.name = lowercaseHandlers[attrName];
                        fixes.push(`Converted ${attrName} to ${lowercaseHandlers[attrName]}`);
                    }
                }
            }
        });

        // Fix 4: Ensure React is imported if JSX is used
        let hasReactImport = false;
        let hasJSX = false;

        traverse(ast, {
            ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
                if (path.node.source.value === 'react') {
                    hasReactImport = true;
                }
            },
            JSXElement() {
                hasJSX = true;
            }
        });

        if (hasJSX && !hasReactImport) {
            // Add React import at the beginning
            const reactImport = t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier('React'))],
                t.stringLiteral('react')
            );
            ast.program.body.unshift(reactImport);
            fixes.push('Added missing React import');
        }

        // Generate the fixed code
        const output = generate(ast, {
            retainLines: true,
            compact: false
        });

        let fixedCode = output.code;

        // Reattach frontmatter
        if (frontmatter) {
            fixedCode = `---\n${frontmatter}\n---\n${fixedCode}`;
        }

        return {
            code: fixedCode,
            fixes
        };

    } catch (error) {
        // If parsing fails, return original
        return {
            code,
            fixes: []
        };
    }
}
