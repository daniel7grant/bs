import { lstat, readFile } from 'fs/promises';
import path from 'path';
import { findTemplate, initConfig, saveConfig } from '../modules/config';
import { unrenderFile } from '../modules/render';
import { exists, getFilesRecursively } from '../modules/utils';
import { BsConfig, BsTemplate, CreateArguments, COMMAND_OPTIONS } from '../types';

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
                const file = { path: filename, content };
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
        'from-file': fromFile,
        'disable-parameters': disableParameters,
        name: templateName,
    } = params;
    if (fromFile) {
        if (!(await exists(fromFile))) {
            throw new Error(`File ${fromFile} does not exist.\n`);
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

        const stat = await lstat(fromFile);
        let template: BsTemplate | undefined;
        const { name } = path.parse(fromFile);
        if (stat.isFile()) {
            template = await createTemplateFromFiles(
                templateName,
                [fromFile],
                !disableParameters ? name : undefined
            );
        } else if (stat.isDirectory()) {
            const files = await getFilesRecursively(fromFile);
            template = await createTemplateFromFiles(
                templateName,
                files,
                !disableParameters ? name : undefined
            );
        } else {
            throw new Error(`Param ${fromFile} should be a file or a directory.\n`);
        }

        const updatedConfig = config ?? initConfig();
        updatedConfig.templates = updatedConfig.templates
            .filter((t) => `${t.namespace}:${t.name}` !== templateName)
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
