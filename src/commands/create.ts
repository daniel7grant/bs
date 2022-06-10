import { lstat, readFile } from 'fs/promises';
import path from 'path';
import { BsConfig, BsTemplate } from 'types';
import { CREATE_OPTIONS } from '../modules/arguments';
import { initConfig, saveConfig } from '../modules/config';
import { unrenderFile } from '../modules/render';
import { exists, getFilesRecursively } from '../modules/utils';

async function createTemplateFromFiles(
    templateName: string,
    nameToReplace: string,
    filenames: string[]
): Promise<BsTemplate> {
    return {
        name: templateName,
        namespace: '',
        aliases: [],
        parameters: [],
        files: await Promise.all(
            filenames.map(async (filename) => {
                const content = await readFile(filename, 'utf-8');
                return unrenderFile({ path: filename, content }, { name: nameToReplace });
            })
        ),
    };
}

export default async function create(
    config: BsConfig | undefined,
    [templateName]: string[],
    params: { [key: string]: unknown }
) {
    if (typeof params.fromFile === 'string') {
        if (!(await exists(params.fromFile))) {
            process.stderr.write(`File ${params.fromFile} does not exist.\n`);
            process.exit(1);
        }

        const stat = await lstat(params.fromFile);
        let template: BsTemplate | undefined;
        const { name } = path.parse(params.fromFile);
        if (stat.isFile()) {
            template = await createTemplateFromFiles(templateName, name, [params.fromFile]);
        } else if (stat.isDirectory()) {
            const files = await getFilesRecursively(params.fromFile);
            template = await createTemplateFromFiles(templateName, name, files);
        } else {
            throw new Error(`Param ${params.fromFile} should be a file or a directory.\n`);
        }

        const updatedConfig = config ?? initConfig();
        updatedConfig.templates.push(template);
        const filename = await saveConfig(updatedConfig);
        process.stdout.write(`Saved new template ${template.name} into file ${filename}.\n`);
    } else {
        throw new Error(
            `You have to pass ${CREATE_OPTIONS.FROM_FILE} to read from a file or directory.\n`
        );
    }
}
