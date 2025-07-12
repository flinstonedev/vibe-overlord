import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { execa } from 'execa';
import ora from 'ora';
import chalk from 'chalk';
export async function setupNextJS(projectRoot, options) {
    const spinner = ora('Setting up Vibe Overlord for Next.js...').start();
    try {
        // Detect Next.js structure (app router vs pages router)
        const { isAppRouter, srcDir } = await detectNextJSStructure(projectRoot);
        spinner.text = 'Installing dependencies...';
        // Install dependencies
        if (options.install) {
            await installDependencies(projectRoot);
        }
        spinner.text = 'Creating environment configuration...';
        // Create environment file
        await createEnvironmentFile(projectRoot);
        // Create API route
        if (options.apiRoute) {
            spinner.text = 'Creating API route...';
            await createApiRoute(projectRoot, isAppRouter, srcDir);
        }
        // Create example components
        if (options.components) {
            spinner.text = 'Adding example components...';
            await createExampleComponents(projectRoot, srcDir);
        }
        // Create example pages
        if (options.examples) {
            spinner.text = 'Creating example pages...';
            await createExamplePages(projectRoot, isAppRouter, srcDir);
        }
        spinner.succeed('Vibe Overlord setup completed successfully!');
        // Show completion message
        showCompletionMessage(projectRoot, options);
    }
    catch (error) {
        spinner.fail('Setup failed');
        throw error;
    }
}
async function detectNextJSStructure(projectRoot) {
    const appDir = existsSync(join(projectRoot, 'app')) || existsSync(join(projectRoot, 'src', 'app'));
    const pagesDir = existsSync(join(projectRoot, 'pages')) || existsSync(join(projectRoot, 'src', 'pages'));
    const srcDir = existsSync(join(projectRoot, 'src'));
    return {
        isAppRouter: appDir,
        isPagesRouter: pagesDir,
        srcDir
    };
}
async function installDependencies(projectRoot) {
    const packageJsonPath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    // Check if we need to install vibe-overlord
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const needsVibeOverlord = !deps['vibe-overlord'];
    if (needsVibeOverlord) {
        // Detect package manager
        const hasYarnLock = existsSync(join(projectRoot, 'yarn.lock'));
        const hasPnpmLock = existsSync(join(projectRoot, 'pnpm-lock.yaml'));
        let packageManager = 'npm';
        if (hasPnpmLock)
            packageManager = 'pnpm';
        else if (hasYarnLock)
            packageManager = 'yarn';
        const installCommand = packageManager === 'npm' ? 'install' : 'add';
        await execa(packageManager, [installCommand, 'vibe-overlord'], {
            cwd: projectRoot,
            stdio: 'inherit'
        });
    }
}
async function createEnvironmentFile(projectRoot) {
    const envPath = join(projectRoot, '.env.local');
    const envExamplePath = join(projectRoot, '.env.example');
    const envContent = `# Vibe Overlord API Keys
# ======================
# You need AT LEAST ONE of these API keys configured.
# Choose your preferred AI provider:

# OpenAI (GPT-4, GPT-4o, etc.)
# Get your API key at: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic (Claude)
# Get your API key at: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google (Gemini)
# Get your API key at: https://makersuite.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# Environment Configuration
# =========================
NODE_ENV=development
`;
    // Create .env.example
    if (!existsSync(envExamplePath)) {
        writeFileSync(envExamplePath, envContent);
    }
    // Create .env.local if it doesn't exist
    if (!existsSync(envPath)) {
        writeFileSync(envPath, envContent);
    }
}
async function createApiRoute(projectRoot, isAppRouter, srcDir) {
    const baseDir = srcDir ? 'src' : '';
    if (isAppRouter) {
        // App Router API route
        const apiDir = join(projectRoot, baseDir, 'app', 'api', 'generate');
        const routePath = join(apiDir, 'route.ts');
        if (!existsSync(apiDir)) {
            mkdirSync(apiDir, { recursive: true });
        }
        const routeContent = `import { NextResponse } from 'next/server';
import { generateComponent } from 'vibe-overlord';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { prompt, provider } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    const { code, frontmatter } = await generateComponent({
      prompt,
      projectPath: path.resolve(process.cwd(), 'src/components'),
      provider: provider || { provider: 'openai' }
    });
    
    return NextResponse.json({ code, frontmatter });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate component' },
      { status: 500 }
    );
  }
}`;
        writeFileSync(routePath, routeContent);
    }
    else {
        // Pages Router API route
        const apiDir = join(projectRoot, baseDir, 'pages', 'api');
        const routePath = join(apiDir, 'generate.ts');
        if (!existsSync(apiDir)) {
            mkdirSync(apiDir, { recursive: true });
        }
        const routeContent = `import type { NextApiRequest, NextApiResponse } from 'next';
import { generateComponent } from 'vibe-overlord';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { prompt, provider } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const { code, frontmatter } = await generateComponent({
      prompt,
      projectPath: path.resolve(process.cwd(), 'src/components'),
      provider: provider || { provider: 'openai' }
    });
    
    return res.json({ code, frontmatter });
  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: 'Failed to generate component' });
  }
}`;
        writeFileSync(routePath, routeContent);
    }
}
async function createExampleComponents(projectRoot, srcDir) {
    const baseDir = srcDir ? 'src' : '';
    const componentsDir = join(projectRoot, baseDir, 'components');
    if (!existsSync(componentsDir)) {
        mkdirSync(componentsDir, { recursive: true });
    }
    // Create Button component
    const buttonPath = join(componentsDir, 'Button.tsx');
    const buttonContent = `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const baseStyles = 'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const buttonStyles = \`\${baseStyles} \${variantStyles[variant]} \${sizeStyles[size]} \${className}\`;
  
  return (
    <button
      className={buttonStyles}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};`;
    writeFileSync(buttonPath, buttonContent);
}
async function createExamplePages(projectRoot, isAppRouter, srcDir) {
    const baseDir = srcDir ? 'src' : '';
    if (isAppRouter) {
        // App Router page
        const pageDir = join(projectRoot, baseDir, 'app', 'vibe-overlord');
        const pagePath = join(pageDir, 'page.tsx');
        if (!existsSync(pageDir)) {
            mkdirSync(pageDir, { recursive: true });
        }
        const pageContent = `'use client';

import { useState } from 'react';
import { getMDXComponent } from 'vibe-overlord/client';

export default function VibeOverlordPage() {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate component');
      }
      
      const { code } = await response.json();
      setCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const Component = code ? getMDXComponent(code) : null;
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Vibe Overlord Demo</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Describe your component:
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="e.g., Create a blue button with rounded corners..."
        />
      </div>
      
      <button
        onClick={handleGenerate}
        disabled={isLoading || !prompt.trim()}
        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Generating...' : 'Generate Component'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {Component && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Generated Component:</h2>
          <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
            <Component />
          </div>
        </div>
      )}
    </div>
  );
}`;
        writeFileSync(pagePath, pageContent);
    }
}
function showCompletionMessage(projectRoot, options) {
    console.log(chalk.green('\n✅ Vibe Overlord setup completed successfully!'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.white('\n📋 What was created:'));
    if (options.install) {
        console.log(chalk.cyan('  ✓ Installed vibe-overlord package'));
    }
    console.log(chalk.cyan('  ✓ Created environment configuration (.env.local)'));
    if (options.apiRoute) {
        console.log(chalk.cyan('  ✓ Created API route for component generation'));
    }
    if (options.components) {
        console.log(chalk.cyan('  ✓ Added example components'));
    }
    if (options.examples) {
        console.log(chalk.cyan('  ✓ Created example pages'));
    }
    console.log(chalk.white('\n🚀 Next steps:'));
    console.log(chalk.yellow('  1. Add your API keys to .env.local'));
    console.log(chalk.yellow('  2. Run your Next.js development server'));
    if (options.examples) {
        console.log(chalk.yellow('  3. Visit /vibe-overlord to try the demo'));
    }
    console.log(chalk.green('\n🎉 Happy coding with Vibe Overlord!'));
}
//# sourceMappingURL=nextjs.js.map