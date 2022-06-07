import { constants } from 'fs';
import { access } from 'fs/promises';
import path from 'path';

export async function exists(filename: string): Promise<boolean> {
    return access(filename, constants.F_OK).then(
        () => true,
        () => false
    );
}

export async function firstExists(filenames: string[]): Promise<string | undefined> {
    for (const filename of filenames) {
        if (await exists(filename)) {
            return filename;
        }
    }
    return undefined;
}

export function subdirs(filename: string): string[] {
    const { dir } = path.parse(filename);
    if (dir.startsWith('/')) {
        console.warn('Paths starting with "/" will be converted to local path.');
    }
    return dir.split('/').reduce<string[]>((subdirs, newDir) => {
        const last = subdirs[subdirs.length - 1];
        return last ? [...subdirs, path.join(last, newDir)] : [newDir];
    }, []);
}

const nameRegex = '[a-zA-Z0-9_-]*';
export function convertNameToPath(name: string, path: string): { name: string; path: string } {
    if (name.match(`^${nameRegex}$`)) {
        return {
            name,
            path: path.replace(/\{\{ ?name ?\}\}/, name),
        };
    }

    const extractedName = name.match(path.replace('{{ name }}', `(${nameRegex})`));
    if (!extractedName) {
        throw Error(`Path "${name}" does not match config path "${path}".`);
    }
    return { name: extractedName[1], path: name };
}
