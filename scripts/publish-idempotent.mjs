#!/usr/bin/env node
import { spawn } from 'node:child_process';

function run(command, args = []) {
    return new Promise((resolve) => {
        const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => (stdout += d.toString()));
        child.stderr.on('data', (d) => (stderr += d.toString()));
        child.on('close', (code) => resolve({ code, stdout, stderr }));
    });
}

(async () => {
    const { code, stdout, stderr } = await run('npx', ['@changesets/cli', 'publish']);
    const output = `${stdout}\n${stderr}`;

    if (code && code !== 0) {
        const publishConflict = /Cannot publish over previously published version|EPUBLISHCONFLICT|previously published version/i;
        if (publishConflict.test(output)) {
            console.log('Publish is idempotent: version already published. Treating as success.');
            process.exit(0);
        }
        console.error(output.trim());
        process.exit(code);
    }

    process.exit(0);
})();


