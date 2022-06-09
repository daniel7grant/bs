import { mkdir, writeFile } from 'fs/promises';
import { BsTemplate, BsFile, isFileWithContent } from '../types';
import { renderFile } from '../modules/render';
import { exists, subdirs } from '../modules/utils';

export default async function generate(
    template: BsTemplate,
    names: string[],
    params: { [x: string]: unknown }
): Promise<BsFile[]> {
    const renderedFiles = await Promise.all(
        names.flatMap((name) => template.files.map((f) => renderFile(f, { name, ...params })))
    );

    const existingFiles = await Promise.all(renderedFiles.map((f) => f.path).map(exists));
    if (existingFiles.some((f) => f === true)) {
        process.stderr.write('Files already exist, add --force to overwrite.\n');
        process.exit(0);
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

    return Promise.all(
        renderedFiles.map(async (file) => {
            if (isFileWithContent(file)) {
                await writeFile(file.path, file.content);
            }

            return file;
        })
    );
}
