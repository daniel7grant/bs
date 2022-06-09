#!/usr/bin/node
import findUp from 'find-up';
import path from 'path';
import { homedir } from 'os';
import create from './commands/create';
import parseArguments from './modules/arguments';
import { findTemplate, loadConfig } from './modules/config';

const configurationPaths = [
    '.bsconfig.yaml',
    '.bsconfig.yml',
    path.join(homedir(), '.bsconfig.yaml'),
    path.join(homedir(), '.bsconfig.yml'),
];

async function main() {
    const configFile = await findUp(configurationPaths);

    if (!configFile) {
        process.stderr.write(
            'Config file not found. Create one in the local or homedir or specify one with the --configuration param.\n'
        );
        process.exit(1);
    }

    const config = await loadConfig(configFile);
    const args = await parseArguments(config);

    if (!args.names) {
        process.stderr.write('You have to define one or more names to generate files with.\n');
        process.exit(1);
    }

    const {
        $0,
        _: [, templateName],
        names,
        ...params
    } = args;

    const template = findTemplate(config.templates, `${templateName}`);
    if (!template) {
        process.stderr.write(`Template "${templateName}" not found in ${configFile}.\n`);
        process.exit(1);
    }

    const createdFiles = await create(template, names as string[], params);
    createdFiles.flat().forEach((file) => {
        process.stdout.write(`File "${file.path}" created.\n`);
    });
}

main().catch((err) => process.stderr.write(err));
