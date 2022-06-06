import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import { BsConfig, BsTemplate } from '../types';
import { validateBsConfig } from './validation';

export function findTemplate(templates: BsTemplate[], name: string): BsTemplate | undefined {
    return templates.find((t) => t.name === name || t.aliases.includes(name));
}

export async function loadConfig(filename: string): Promise<BsConfig> {
    try {
        // TODO: load from multiple files
        const content = await readFile(filename, 'utf8');
        const config = await validateBsConfig(load(content));
        return config;
    } catch (error: any) {
        console.error(`Loading config "${filename}" failed: ${error}`);
        process.exit(1);
    }
}
