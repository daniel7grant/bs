import findUp from 'find-up';
import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import { homedir } from 'os';
import path from 'path';
import { BsConfig, BsTemplate } from '../types';
import validateBsConfig from './validation';

const configurationPaths = [
    '.bsconfig.yaml',
    '.bsconfig.yml',
    path.join(homedir(), '.bsconfig.yaml'),
    path.join(homedir(), '.bsconfig.yml'),
];

export function findTemplate(templates: BsTemplate[], name: string): BsTemplate | undefined {
    return (
        templates.find((t) => `${t.namespace}:${t.name}` === name) ||
        templates.find((t) => t.name === name) ||
        templates.find((t) => t.aliases.includes(name))
    );
}

export async function getConfigFile(): Promise<string | undefined> {
    const filename = await findUp(configurationPaths);
    return filename;
}

export async function loadConfig(): Promise<BsConfig | undefined> {
    const filename = await getConfigFile();
    if (!filename) {
        return undefined;
    }
    try {
        const content = await readFile(filename, 'utf8');
        const config = await validateBsConfig(load(content));
        return config;
    } catch (error: any) {
        throw new Error(`Loading config "${filename}" failed: ${error}\n`);
    }
}
