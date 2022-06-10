import { lstat, readFile } from 'fs/promises';
import path from 'path';
import { BsConfig, BsTemplate } from 'types';
import { exists } from '../modules/utils';

async function createTemplateFromFiles(
    templateName: string,
    filenames: string[]
): Promise<BsTemplate> {
    return {
        name: templateName,
        namespace: '',
        aliases: [],
        parameters: [],
        files: await Promise.all(
            filenames.map(async (filename) => {
                const { name } = path.parse(filename);
                const content = await readFile(filename, 'utf-8');
                return {
                    path: filename.replace(name, '{{ name }}'),
                    content: content.replace(name, '{{ name }}'),
                };
            })
        ),
    };
}

export default async function create(
    config: BsConfig,
    [templateName]: string[]
    params: { [key: string]: unknown }
) {
    if (typeof params.fromFile === 'string') {
        if (!(await exists(params.fromFile))) {
            process.stderr.write(`File ${params.fromFile} does not exist.\n`);
            process.exit(1);
        }

        const { isFile, isDirectory } = await lstat(params.fromFile);
        switch (true) {
            case isFile(): {
                const template = await createTemplateFromFiles(templateName, [
                    params.fromFile,
                ]);
                console.log(template);
                break;
            }
            case isDirectory():
            default:
                process.stderr.write(`Param ${params.fromFile} should be a file or a directory.\n`);
                process.exit(1);
        }
    }
}
