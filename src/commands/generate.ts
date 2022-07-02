import { mkdir, writeFile } from 'fs/promises';
import { findTemplate, getConfigFile } from '../modules/config';
import { renderFile } from '../modules/render';
import { exists, subdirs } from '../modules/utils';
import { BsConfig, GenerateArguments, isFileWithContent } from '../types';

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

    const renderedFiles = await Promise.all(
        names.flatMap((name) => template.files.map((f) => renderFile(f, { name, ...params })))
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
                    process.stdout.write(`Directory "${dir}" created.\n`);
                    await mkdir(dir);
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
