import { mkdir, writeFile } from 'fs/promises';
import { BsTemplate, BsFile, isFileWithContent } from '../types';
import { renderFile } from '../modules/render';
import { exists, subdirs } from '../modules/utils';

export async function create(
    template: BsTemplate,
    names: string[],
    params: { [x: string]: unknown }
): Promise<BsFile[]> {
    const renderedFiles = await Promise.all(
        names.flatMap((name) => template.files.map((f) => renderFile(f, { name, ...params })))
    );

    const existingFiles = await Promise.all(renderedFiles.map((f) => f.path).map(exists));
    if (existingFiles.some((f) => f === true)) {
        console.warn(`Files already exist, add --force to overwrite.`);
        process.exit(0);
    }

    const dirsToCreate = renderedFiles
        .map((f) => subdirs(f.path))
        .reduce(
            (set, dirs) => dirs.reduce((set, dir) => (dir ? set.add(dir) : set), set),
            new Set<string>()
        );
    await Array.from(dirsToCreate).reduce(
        (previousPromise, dir) =>
            previousPromise.then(async () => {
                if (!(await exists(dir))) {
                    console.log(`Directory "${dir}" created.`);
                    return mkdir(dir);
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
