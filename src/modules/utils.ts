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
        process.stdout.write('Paths starting with "/" will be converted to local path.\n');
    }
    return dir.split('/').reduce<string[]>((dirs, newDir) => {
        const last = dirs[dirs.length - 1];
        return last ? [...dirs, path.join(last, newDir)] : [newDir];
    }, []);
}

const nameRegex = '[a-zA-Z0-9_-]*';
export function convertNameToPath(
    name: string,
    templatePath: string
): { name: string; path: string } {
    if (name.match(`^${nameRegex}$`)) {
        return {
            name,
            path: templatePath.replace(/\{\{ ?name ?\}\}/, name),
        };
    }

    const extractedName = name.match(templatePath.replace('{{ name }}', `(${nameRegex})`));
    if (!extractedName) {
        throw Error(`Path "${name}" does not match config path "${templatePath}".`);
    }
    return { name: extractedName[1], path: name };
}
