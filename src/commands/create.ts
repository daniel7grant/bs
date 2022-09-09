import { readFile } from 'fs/promises';
import { globby } from 'globby';
import { BsConfig, BsTemplate, CreateArguments, COMMAND_OPTIONS } from '../types.js';
import {
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

export default async function create(
    config: BsConfig | undefined,
    _: (number | string)[],
    params: CreateArguments
) {
    const {
        'from-file': patterns,
        'disable-parameters': disableParameters,
        template: templateName,
        name,
        gitignore,
    } = params;
    if (patterns) {
        const files = await globby(patterns, { gitignore });
        if (files.length === 0) {
            throw new Error(`File ${patterns} does not exist.\n`);
        }

        if (!templateName.includes(':')) {
            throw new Error(
                'Component name have to contain the namespace (e.g. react:component).\n'
            );
        }

        const willOverwrite = config && findTemplate(config.templates, templateName);
        if (!params.force && willOverwrite) {
            throw new Error(
                `Template ${templateName} already exists in config file. Add the --force option to overwrite it.\n`
            );
        }

        const parsedName = name ?? getNameFromPaths(files);
        const template = await createTemplateFromFiles(
            templateName,
            files,
            !disableParameters ? parsedName : undefined
        );

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
    } else {
        throw new Error(
            `You have to pass ${COMMAND_OPTIONS.CREATE.map((p) => `--${p}`).join(
                ', '
            )} to read from a file or directory.\n`
        );
    }
}
