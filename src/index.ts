#!/usr/bin/node
import create from './commands/create.js';
import generate from './commands/generate.js';
import init from './commands/init.js';
import parseArguments from './modules/arguments.js';
import { loadConfig } from './modules/config.js';
import { isCreateCommand, isGenerateCommand, isInitCommand } from './types.js';

async function main() {
    const config = await loadConfig();
    const args = await parseArguments(config);

    if (isCreateCommand(args)) {
        return create(config, args._, args);
    }
    if (isGenerateCommand(args)) {
        return generate(config, args._, args);
    }
    if (isInitCommand(args)) {
        return init(config, args._, args);
    }

    throw new Error('Command not found.\n');
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});
