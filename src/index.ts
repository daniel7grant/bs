#!/usr/bin/node
import { create } from './commands/create';
import { parseArguments } from './modules/arguments';
import { findTemplate, loadConfig } from './modules/config';

async function main() {
    const filename = '.bsconfig.yaml';
    const config = await loadConfig(filename);
    const { template: templateName, names } = await parseArguments();

    const template = findTemplate(config.templates, templateName);
    if (!template) {
        console.error(`Template "${templateName}" not found in ${filename}.`);
        process.exit(1);
    }

    const createdFiles = await create(template, names);
    createdFiles.flat().forEach((file) => {
        console.log(`File "${file.path}" created.`);
    });
}

main().catch((err) => console.error(err));
