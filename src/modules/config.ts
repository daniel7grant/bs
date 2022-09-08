import { findUp } from 'find-up';
import { readFile, writeFile } from 'fs/promises';
import { dump, load } from 'js-yaml';
import { homedir } from 'os';
import path from 'path';
import { BsConfig, BsTemplate } from '../types.js';
import validateBsConfig from './validation.js';

const configurationPaths = [
    '.bsconfig.yaml',
    '.bsconfig.yml',
    path.join(homedir(), '.bsconfig.yaml'),
    path.join(homedir(), '.bsconfig.yml'),
];

export function generateTemplateFullname(template: BsTemplate): string {
    return `${template.namespace}:${template.name}`;
}

export function generateTemplateNames(template?: BsTemplate): string[] {
    return template ? [generateTemplateFullname(template), template.name, ...template.aliases] : [];
}

export function generateTemplateParamNames(template?: BsTemplate): string[] {
    return template?.parameters?.map((p) => p.name) ?? [];
}

export function findTemplate(templates: BsTemplate[], name: string): BsTemplate | undefined {
    return (
        templates.find((t) => generateTemplateFullname(t) === name) ??
        templates.find((t) => t.name === name) ??
        templates.find((t) => t.aliases.includes(name))
    );
}

export function initConfig(): BsConfig {
    return {
        templates: [],
    };
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
        throw new Error(`Loading config "${filename}" failed: ${error.message}\n`);
    }
}

export async function saveConfig(config: BsConfig): Promise<string> {
    const filename = (await getConfigFile()) ?? configurationPaths[0];
    try {
        await writeFile(filename, dump(config), 'utf8');
        return filename;
    } catch (error: any) {
        throw new Error(`Saving config "${filename}" failed: ${error.message}\n`);
    }
}
