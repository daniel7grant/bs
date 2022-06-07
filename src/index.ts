#!/usr/bin/node
import path from 'path';
import { homedir } from 'os';
import { create } from './commands/create';
import { parseArguments, parseConfiguration } from './modules/arguments';
import { findTemplate, loadConfig } from './modules/config';
import { firstExists } from './modules/utils';

const configurationPaths = [
    '.bsconfig.yaml',
    '.bsconfig.yml',
    path.join(homedir(), '.bsconfig.yaml'),
    path.join(homedir(), '.bsconfig.yml'),
];

async function main() {
    const { configuration } = await parseConfiguration();
    const configFile = await firstExists(configuration ? [configuration] : configurationPaths);

    if (!configFile) {
        console.error(
            `Config file not found. Create one in the local or homedir or specify one with the --configuration param.`
        );
        process.exit(1);
    }

    const config = await loadConfig(configFile);
    const args = await parseArguments(config);

    if (!args.names) {
        process.exit(1);
    }

    const {
        $0,
        _: [command, templateName],
        names,
        ...params
    } = args;

    const template = findTemplate(config.templates, `${templateName}`);
    if (!template) {
        console.error(`Template "${templateName}" not found in ${configFile}.`);
        process.exit(1);
    }

    const createdFiles = await create(template, names as string[], params);
    createdFiles.flat().forEach((file) => {
        console.log(`File "${file.path}" created.`);
    });
}

main().catch((err) => console.error(err));
