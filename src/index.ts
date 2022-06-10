#!/usr/bin/node
import generate from './commands/generate';
import parseArguments, { COMMANDS } from './modules/arguments';
import { loadConfig } from './modules/config';

async function main() {
    const config = await loadConfig();
    const args = await parseArguments(config);

    const {
        $0,
        _: [command, ...positionals],
        ...params
    } = args;

    switch (command) {
        case COMMANDS.GENERATE[0]:
        case COMMANDS.GENERATE[1]:
            return generate(config, positionals as string[], params);
        default:
            throw new Error(`Command ${command} not found.\n`);
    }
}

main().catch((err) => process.stderr.write(err));
