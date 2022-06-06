import { constants } from 'fs';
import { access } from 'fs/promises';
import path from 'path';

export async function exists(filename: string): Promise<boolean> {
    return access(filename, constants.F_OK).then(
        () => true,
        () => false
    );
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
