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

/**
 * Generate namespaced name from template object.
 * This should be used internally everywhere to avoid mixups.
 *
 * @example
 *      generateTemplateFullName({
 *          namespace: 'react',
 *          name: 'component',
 *          ...
 *      }); // => 'react:component'
 *
 * @param template the template object
 * @returns the namespaced name
 */
export function generateTemplateFullname(template: BsTemplate): string {
    return `${template.namespace}:${template.name}`;
}

/**
 * Generate all different version for a template name (name, fullname + aliases).
 * Primarily used for completion.
 *
 * @example
 *      generateTemplateNames({
 *          namespace: 'react',
 *          name: 'component',
 *          aliases: ['rc'],
 *          ...
 *      }); // => 'react:component'
 *
 * @param template the template object
 * @returns an array of names
 */
export function generateTemplateNames(template?: BsTemplate): string[] {
    return template ? [generateTemplateFullname(template), template.name, ...template.aliases] : [];
}

/**
 * Generate list of parameter names for a template. Primarily used for completion.
 *
 * @param template the template object
 * @returns the list of the parameter names
 */
export function generateTemplateParamNames(template?: BsTemplate): string[] {
    return template?.parameters?.map((p) => p.name) ?? [];
}

/**
 * Find a template in the given list of templates by name, fullname or alias.
 *
 * @example
 *      const template = { name: 'component', namespace: 'react', aliases: 'rc', ... };
 *      findTemplate([template], 'component'); => // template
 *      findTemplate([template], 'react:component'); => // template
 *      findTemplate([template], 'rc'); => // template
 *      findTemplate([template], 'asdasd'); => // undefined
 *
 * @param templates the list of templates to search in
 * @param name the name, fullname or alias of the template
 * @returns the first matching template object or undefined if none found
 */
export function findTemplate(templates: BsTemplate[], name: string): BsTemplate | undefined {
    return (
        templates.find((t) => generateTemplateFullname(t) === name) ??
        templates.find((t) => t.name === name) ??
        templates.find((t) => t.aliases.includes(name))
    );
}

/**
 * Find the templates, based on a list of names. Primarily used for includes.
 *
 * @example
 *      const template = { name: 'component', namespace: 'react', ... };
 *      findReferences([template], ['component']); => // [template]
 *      findTemplate([template], ['asdasd']); => // throw new Error(...)
 *
 * @param templates the list of templates to search in
 * @param includes the list of names, fullnames or aliases of the templates (mostly aliases)
 * @returns the list of found templates
 * @throws if one of the templates not found
 */
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

/**
 * Recursively resolve the included templates.
 * Also collects the templates that are already included, to avoid infinite include loops.
 *
 * @param templates the list of templates to search in
 * @param template the template to start the includes from
 * @param alreadyIncluded the templates that are already included
 * @returns the list of included templates recursively, or a one-item list if files templates
 */
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

/**
 * Get a deduplicated list of files from list of files templates.
 *
 * @param templates the list of files templates
 * @returns the list of files to render
 */
export function getFilesFromTemplates(templates: BsFilesTemplate[]): BsFile[] {
    return uniqBy((f) => f.path, templates.flatMap((t) => t.files).reverse());
}

/**
 * Create a minimal new configuration.
 *
 * @returns the configuration object
 */
export function initConfig(): BsConfig {
    return {
        templates: [],
    };
}

/**
 * Find a configuration file in the current directory or in any of the parent directories
 *
 * @returns the name of the config file or undefined if not found
 */
export async function getConfigFile(): Promise<string | undefined> {
    const filename = await findUp(configurationPaths);
    return filename;
}

/**
 * Load the config from the current directory, or any of the parent directories
 * and parses the yaml to a config object.
 *
 * @returns the config object or undefined if not found
 * @throws error if config loading failed
 */
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

/**
 * Dumps the config object to yaml and saves it to the default config path.
 *
 * @param config the config object
 * @returns the filename the config has been saved
 */
export async function saveConfig(config: BsConfig): Promise<string> {
    const filename = (await getConfigFile()) ?? configurationPaths[0];
    try {
        await writeFile(filename, dump(config), 'utf8');
        return filename;
    } catch (error: any) {
        throw new Error(`Saving config "${filename}" failed: ${error.message}\n`);
    }
}
