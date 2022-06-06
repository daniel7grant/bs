import { mkdir, writeFile } from 'fs/promises';
import { BsTemplate, BsFile, isFileWithContent } from '../types';
import { renderFile } from '../modules/render';
import { exists, subdirs } from '../modules/file';

export async function create(template: BsTemplate, names: string[]): Promise<BsFile[]> {
    const renderedFiles = await Promise.all(
        // TODO: add more parameters to rendering
        names.flatMap((name) => template.files.map((f) => renderFile(f, { name })))
    );

    const existingFiles = await Promise.all(renderedFiles.map((f) => f.name).map(exists));
    if (existingFiles.some((f) => f === true)) {
        console.warn(`Files already exist, add --force to overwrite.`);
        process.exit(0);
    }

    const dirsToCreate = renderedFiles
        .map((f) => subdirs(f.name))
        .reduce((set, dirs) => dirs.reduce((set, dir) => set.add(dir), set), new Set<string>());
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
                await writeFile(file.name, file.content);
            }

            return file;
        })
    );
}
