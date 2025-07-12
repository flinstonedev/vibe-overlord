import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
export async function validateProjectStructure(projectRoot) {
    try {
        // Check if we're in a valid project directory
        const packageJsonPath = join(projectRoot, 'package.json');
        if (!existsSync(packageJsonPath)) {
            return {
                isValid: false,
                error: 'No package.json found. Please run this command in a project directory.'
            };
        }
        // Parse package.json
        let packageJson;
        try {
            packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        }
        catch (error) {
            return {
                isValid: false,
                error: 'Invalid package.json file. Please check the JSON syntax.'
            };
        }
        // Check if it's a React project
        const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };
        if (!deps.react) {
            return {
                isValid: false,
                error: 'This doesn\'t appear to be a React project. Vibe Overlord requires React.'
            };
        }
        // Check for common issues
        const warnings = [];
        // Check if TypeScript is present
        if (!deps.typescript && !deps['@types/react']) {
            warnings.push('TypeScript not detected. Vibe Overlord works best with TypeScript.');
        }
        // Check if there's already a vibe-overlord installation
        if (deps['vibe-overlord']) {
            warnings.push('Vibe Overlord is already installed. This will update your configuration.');
        }
        // Check Node.js version (rough check via package.json engines)
        if (packageJson.engines && packageJson.engines.node) {
            const nodeVersion = packageJson.engines.node;
            if (nodeVersion.includes('16') || nodeVersion.includes('17')) {
                warnings.push('Node.js 18+ is recommended for best compatibility.');
            }
        }
        return {
            isValid: true,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
    catch (error) {
        return {
            isValid: false,
            error: `Error validating project: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
export function validateApiKey(apiKey) {
    if (!apiKey || apiKey.trim() === '') {
        return {
            isValid: false,
            error: 'API key is required'
        };
    }
    if (apiKey.includes('your_') || apiKey.includes('_here')) {
        return {
            isValid: false,
            error: 'Please replace the placeholder with your actual API key'
        };
    }
    // Basic format validation for OpenAI keys
    if (apiKey.startsWith('sk-') && apiKey.length < 20) {
        return {
            isValid: false,
            error: 'API key appears to be invalid (too short)'
        };
    }
    return {
        isValid: true
    };
}
export function validateProjectPath(path) {
    if (!existsSync(path)) {
        return {
            isValid: false,
            error: `Path does not exist: ${path}`
        };
    }
    // Check write permissions by trying to create a temp file
    try {
        const tempFile = join(path, '.vibe-overlord-temp');
        const { writeFileSync, unlinkSync } = require('fs');
        writeFileSync(tempFile, 'test');
        unlinkSync(tempFile);
        return {
            isValid: true
        };
    }
    catch (error) {
        return {
            isValid: false,
            error: `No write permissions for path: ${path}`
        };
    }
}
//# sourceMappingURL=validators.js.map