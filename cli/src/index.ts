#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync } from 'fs';
import { join } from 'path';
import { detectFramework, Framework } from './utils/framework-detector.js';
import { setupNextJS } from './frameworks/nextjs.js';
import { validateProjectStructure } from './utils/validators.js';

const program = new Command();

interface SetupOptions {
    framework?: Framework;
    skipInstall?: boolean;
    apiRoute?: boolean;
    components?: boolean;
    examples?: boolean;
}

program
    .name('create-vibe-overlord')
    .description('CLI to quickly add Vibe Overlord to existing projects')
    .version('1.0.0');

program
    .command('add')
    .description('Add Vibe Overlord to an existing project')
    .option('-f, --framework <framework>', 'specify framework (nextjs)')
    .option('--skip-install', 'skip package installation')
    .option('--no-api-route', 'skip API route creation')
    .option('--no-components', 'skip example components')
    .option('--no-examples', 'skip example usage')
    .action(async (options: SetupOptions) => {
        const spinner = ora('Analyzing project...').start();

        try {
            // Validate we're in a valid project
            const projectRoot = process.cwd();
            const validation = await validateProjectStructure(projectRoot);

            if (!validation.isValid) {
                spinner.fail('Invalid project structure');
                console.error(chalk.red('❌ This doesn\'t appear to be a valid project directory'));
                console.error(chalk.red(`   ${validation.error}`));
                process.exit(1);
            }

            // Detect or prompt for framework
            let framework = options.framework as Framework;
            if (!framework) {
                const detected = await detectFramework(projectRoot);

                if (detected.framework) {
                    const { useDetected } = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'useDetected',
                            message: `Detected ${chalk.cyan(detected.framework)} project. Use this framework?`,
                            default: true
                        }
                    ]);

                    if (useDetected) {
                        framework = detected.framework;
                    }
                }

                if (!framework) {
                    const { selectedFramework } = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'selectedFramework',
                            message: 'Select your framework:',
                            choices: [
                                { name: 'Next.js', value: 'nextjs' },
                                { name: 'Other (manual setup)', value: 'manual' }
                            ]
                        }
                    ]);
                    framework = selectedFramework;
                }
            }

            spinner.succeed(`Setting up Vibe Overlord for ${chalk.cyan(framework)}`);

            // Get setup preferences
            const setupPreferences = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'apiRoute',
                    message: 'Create API route for component generation?',
                    default: options.apiRoute !== false
                },
                {
                    type: 'confirm',
                    name: 'components',
                    message: 'Add example UI components?',
                    default: options.components !== false
                },
                {
                    type: 'confirm',
                    name: 'examples',
                    message: 'Add example usage pages?',
                    default: options.examples !== false
                },
                {
                    type: 'confirm',
                    name: 'install',
                    message: 'Install dependencies?',
                    default: !options.skipInstall
                }
            ]);

            // Setup based on framework
            const setupOptions = {
                ...options,
                ...setupPreferences,
                framework
            };

            switch (framework) {
                case 'nextjs':
                    await setupNextJS(projectRoot, setupOptions);
                    break;
                case 'manual':
                    await showManualInstructions();
                    break;
                default:
                    console.error(chalk.red(`❌ Framework ${framework} not supported yet`));
                    process.exit(1);
            }

        } catch (error) {
            spinner.fail('Setup failed');
            console.error(chalk.red('❌ An error occurred during setup:'));
            console.error(error);
            process.exit(1);
        }
    });

async function showManualInstructions() {
    console.log(chalk.blue('\n📋 Manual Setup Instructions:'));
    console.log(chalk.gray('─'.repeat(50)));

    console.log(chalk.white('\n1. Install Vibe Overlord:'));
    console.log(chalk.cyan('   npm install vibe-overlord'));

    console.log(chalk.white('\n2. Set up environment variables:'));
    console.log(chalk.cyan('   # Create .env.local file'));
    console.log(chalk.cyan('   OPENAI_API_KEY=your_openai_api_key_here'));

    console.log(chalk.white('\n3. Create API route (example for Next.js):'));
    console.log(chalk.cyan('   # See documentation for implementation examples'));

    console.log(chalk.white('\n4. Add components:'));
    console.log(chalk.cyan('   # Import and use generateComponent in your app'));

    console.log(chalk.green('\n✨ For detailed instructions, visit:'));
    console.log(chalk.blue('   https://github.com/your-repo/vibe-overlord#readme'));
}

program.parse(); 