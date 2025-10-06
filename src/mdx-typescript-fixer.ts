/**
 * Transform TypeScript to JavaScript for MDX compatibility
 * Uses the TypeScript compiler API for robust, correct transformations
 */

import ts from 'typescript';

/**
 * Extract frontmatter from MDX content
 * Returns { frontmatter, content }
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
 * Separate MDX into code zone (imports/exports) and content zone (demo JSX)
 * MDX structure: imports + exports + content (the demo usage)
 */
function separateCodeAndContent(mdx: string): { code: string; content: string } {
    // Find the last export statement
    const lines = mdx.split('\n');
    let lastExportIndex = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('export ') || line.includes('export const') || line === '};') {
            lastExportIndex = i;
            break;
        }
    }

    if (lastExportIndex === -1) {
        // No exports found, treat all as code
        return { code: mdx, content: '' };
    }

    // Everything up to and including the last export is code
    // Everything after is content (the demo JSX)
    const code = lines.slice(0, lastExportIndex + 1).join('\n');
    const content = lines.slice(lastExportIndex + 1).join('\n').trim();

    return { code, content };
}

/**
 * Transpile TypeScript to JavaScript while preserving JSX
 * This ensures MDX can parse the generated code without TypeScript syntax issues
 */
export function transpileTypeScriptForMDX(code: string): string {
    // Extract frontmatter to avoid transpiling YAML as TypeScript
    const { frontmatter, content: mdxBody } = extractFrontmatter(code);

    // Separate code zone (imports/exports) from content zone (demo JSX)
    const { code: codeZone, content: contentZone } = separateCodeAndContent(mdxBody);

    try {
        // Always transpile - TypeScript compiler safely handles plain JavaScript too
        // This avoids fragile regex-based detection of TS syntax
        // Only transpile the CODE zone (imports + exports)
        // Leave the CONTENT zone (demo JSX) untouched
        const result = ts.transpileModule(codeZone, {
            compilerOptions: {
                jsx: ts.JsxEmit.Preserve,           // Keep JSX as-is for MDX
                target: ts.ScriptTarget.ES2020,     // Modern JavaScript
                module: ts.ModuleKind.ESNext,       // ES modules
                removeComments: false,               // Keep comments
                esModuleInterop: true,
                skipLibCheck: true
            }
        });

        let transpiledCode = result.outputText;

        // Recombine: frontmatter + transpiled code + original content (demo JSX)
        let finalOutput = '';

        if (frontmatter) {
            finalOutput += `---\n${frontmatter}\n---\n`;
        }

        finalOutput += transpiledCode;

        if (contentZone) {
            finalOutput += '\n\n' + contentZone;
        }

        return finalOutput;
    } catch (error) {
        // If transpilation fails, log warning and return original
        // This allows the error to be caught later with better context
        console.warn('TypeScript transpilation failed:', error);
        return code;
    }
}

/**
 * Main export for backward compatibility
 */
export function fixTypeScriptForMDX(code: string): string {
    return transpileTypeScriptForMDX(code);
}
