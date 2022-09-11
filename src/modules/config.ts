import { findUp } from 'find-up';
import { readFile, writeFile } from 'fs/promises';
import { dump, load } from 'js-yaml';
import { homedir } from 'os';
import path from 'path';
import { difference, uniqBy } from 'ramda';
import { BsConfig, BsFile, BsTemplate, BsFilesTemplate } from '../types.js';
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

export function findReferences(templates: BsTemplate[], includes: string[]): BsTemplate[] {
    const referencedTemplates: [string, BsTemplate | undefined][] = includes.map((t) => [
        t,
        findTemplate(templates, t),
    ]);
    const notFoundTemplates = referencedTemplates.filter(([, t]) => t === undefined);
    if (notFoundTemplates.length > 0) {
        throw new Error(
            `Templates ${notFoundTemplates
                .map(([n]) => n)
                .join(', ')} not found in the config file.`
        );
    }
    return referencedTemplates.map(([, t]) => t!);
}

export function getReferencedFileTemplates(
    templates: BsTemplate[],
    template: BsTemplate,
    alreadyIncluded: string[] = []
): BsFilesTemplate[] {
    // TODO: fix validation here as well
    if ('files' in template && template.files.length > 0) {
        return [template];
    }
    if ('includes' in template) {
        const templatesToInclude = difference(template.includes, alreadyIncluded);
        const referencedTemplates = findReferences(templates, templatesToInclude);
        return referencedTemplates.flatMap((t) =>
            getReferencedFileTemplates(templates, t, alreadyIncluded.concat(templatesToInclude))
        );
    }
    throw new Error(
        `Template ${generateTemplateFullname(
            template
        )} has to contain either a files or and includes block.`
    );
}

export function getFilesFromTemplates(templates: BsFilesTemplate[]): BsFile[] {
    return uniqBy((f) => f.path, templates.flatMap((t) => t.files).reverse());
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
