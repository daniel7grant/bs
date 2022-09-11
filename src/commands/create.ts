import { readFile } from 'fs/promises';
import { globby } from 'globby';
import { BsConfig, BsTemplate, CreateArguments } from '../types.js';
import {
    findReferences,
    findTemplate,
    generateTemplateFullname,
    initConfig,
    saveConfig,
} from '../modules/config.js';
import { unrenderFile } from '../modules/render.js';
import { escapeHandlebars, getNameFromPaths } from '../modules/utils.js';

async function createTemplateFromFiles(
    templateName: string,
    filenames: string[],
    nameToReplace?: string
): Promise<BsTemplate> {
    const [namespace, name] = templateName.split(':');
    return {
        name,
        namespace,
        aliases: [],
        parameters: [],
        files: await Promise.all(
            filenames.map(async (filename) => {
                const content = await readFile(filename, 'utf-8');
                const file = { path: filename, content: escapeHandlebars(content) };
                return nameToReplace ? unrenderFile(file, { name: nameToReplace }) : file;
            })
        ),
    };
}

function createTemplateFromIncludes(templateName: string, includes: string[]): BsTemplate {
    const [namespace, name] = templateName.split(':');
    return {
        name,
        namespace,
        aliases: [],
        parameters: [],
        includes,
    };
}

export default async function create(
    config: BsConfig | undefined,
    _: (number | string)[],
    params: CreateArguments
) {
    const {
        'from-file': patterns = [],
        include: includes = [],
        'disable-parameters': disableParameters,
        template: templateName,
        name,
        gitignore,
    } = params;
    if (!templateName.includes(':')) {
        throw new Error(
            'New template name have to contain the namespace (e.g. react:component).\n'
        );
    }

    const willOverwrite = config && findTemplate(config.templates, templateName);
    if (!params.force && willOverwrite) {
        throw new Error(
            `Template ${templateName} already exists in config file. Add the --force option to overwrite it.\n`
        );
    }

    let template: BsTemplate | null = null;
    if (patterns.length > 0) {
        const files = await globby(patterns, { gitignore });
        if (files.length === 0) {
            throw new Error(`File ${patterns} does not exist.\n`);
        }

        const parsedName = name ?? getNameFromPaths(files);
        template = await createTemplateFromFiles(
            templateName,
            files,
            !disableParameters ? parsedName : undefined
        );
    } else if (includes.length > 0) {
        if (!config) {
            throw new Error(
                'Config file does not exist, create some templates before you can use --include.'
            );
        }

        const referencedTemplates = findReferences(config.templates, includes);
        template = createTemplateFromIncludes(
            templateName,
            referencedTemplates.map(generateTemplateFullname)
        );
    } else {
        throw new Error(
            'You have to pass --from-file or --include to read from a file or directory.\n'
        );
    }

    const updatedConfig = config ?? initConfig();
    updatedConfig.templates = updatedConfig.templates
        .filter((t) => generateTemplateFullname(t) !== templateName)
        .concat(template);
    const filename = await saveConfig(updatedConfig);
    process.stdout.write(
        `${
            willOverwrite ? 'Overwritten' : 'Saved new'
        } template ${templateName} in config file ${filename}.\n`
    );
}
