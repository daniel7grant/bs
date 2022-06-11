import { lstat, readFile } from 'fs/promises';
import path from 'path';
import { BsConfig, BsTemplate } from 'types';
import { CREATE_OPTIONS } from '../modules/arguments';
import { findTemplate, initConfig, saveConfig } from '../modules/config';
import { unrenderFile } from '../modules/render';
import { exists, getFilesRecursively } from '../modules/utils';

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
    _: string[],
    params: { [key: string]: unknown }
) {
    if (typeof params.fromFile === 'string') {
        if (!(await exists(params.fromFile))) {
            throw new Error(`File ${params.fromFile} does not exist.\n`);
        }

        const templateName = params.name as string;
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

        const stat = await lstat(params.fromFile);
        let template: BsTemplate | undefined;
        const { name } = path.parse(params.fromFile);
        if (stat.isFile()) {
            template = await createTemplateFromFiles(
                templateName,
                [params.fromFile],
                !params.disableParameters ? name : undefined
            );
        } else if (stat.isDirectory()) {
            const files = await getFilesRecursively(params.fromFile);
            template = await createTemplateFromFiles(
                templateName,
                files,
                !params.disableParameters ? name : undefined
            );
        } else {
            throw new Error(`Param ${params.fromFile} should be a file or a directory.\n`);
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
            `You have to pass ${CREATE_OPTIONS.FROM_FILE} to read from a file or directory.\n`
        );
    }
}
