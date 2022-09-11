import { mkdir, writeFile } from 'fs/promises';
import {
    findTemplate,
    getConfigFile,
    getFilesFromTemplates,
    getReferencedFileTemplates,
} from '../modules/config.js';
import { renderFile } from '../modules/render.js';
import { exists, subdirs } from '../modules/utils.js';
import { BsConfig, GenerateArguments, isFileWithContent } from '../types.js';

export default async function generate(
    config: BsConfig | undefined,
    [, templateName]: (number | string)[],
    { names, force, _, ...params }: GenerateArguments
): Promise<void> {
    if (!config) {
        throw new Error('Config file not found. Create one in the local or homedir.\n');
    }

    const template = findTemplate(config.templates, `${templateName}`);
    if (!template) {
        const configFile = await getConfigFile();
        throw new Error(`Template "${templateName}" not found in ${configFile}.\n`);
    }

    const fileTemplates = getReferencedFileTemplates(config.templates, template);
    const files = getFilesFromTemplates(fileTemplates);
    const renderedFiles = await Promise.all(
        names.flatMap((name) => files.map((f) => renderFile(f, { name, ...params })))
    );

    const existingFiles = await Promise.all(renderedFiles.map((f) => f.path).map(exists));
    if (!force && existingFiles.some((f) => f === true)) {
        throw new Error('Files already exist, add --force to overwrite.\n');
    }

    const dirsToCreate = new Set(renderedFiles.flatMap((f) => subdirs(f.path)).filter(Boolean));
    await Array.from(dirsToCreate).reduce(
        (previousPromise, dir) =>
            previousPromise.then(async () => {
                if (!(await exists(dir))) {
                    await mkdir(dir);
                    process.stdout.write(`Directory "${dir}" created.\n`);
                }
            }),
        Promise.resolve()
    );

    const createdFiles = await Promise.all(
        renderedFiles.map(async (file) => {
            if (isFileWithContent(file)) {
                await writeFile(file.path, file.content);
            }

            return file;
        })
    );

    createdFiles.flat().forEach((file) => {
        process.stdout.write(`File "${file.path}" created.\n`);
    });
}
