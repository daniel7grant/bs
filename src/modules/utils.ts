import { constants } from 'fs';
import { access } from 'fs/promises';
import { files } from 'node-dir';
import path from 'path';
import { promisify } from 'util';

export const getFilesRecursively: (dir: string) => Promise<string[]> = promisify(files);

export function escapeForRegExp(str: string): RegExp {
    return new RegExp(str.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'), 'g');
}

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

export function capitalize(str: string): string {
    if (str.length > 0) {
        return str[0].toLocaleUpperCase() + str.slice(1);
    }
    return '';
}

export function convertToCase(
    str: string,
    targetCase: 'camel' | 'pascal' | 'snake' | 'constant' | 'kebab' | 'words'
): string {
    const NOT_WORD_CHARACTER = /[^\p{Lu}0-9]/iu;
    const UPPERCASE_CHARACTER = /(?=[\p{Lu}])/u;
    let rawParts = str.match(NOT_WORD_CHARACTER)
        ? str.split(NOT_WORD_CHARACTER)
        : str.split(UPPERCASE_CHARACTER);
    rawParts = rawParts.filter((x) => x.length > 0).map((x) => x.toLocaleLowerCase());

    switch (targetCase) {
        case 'camel':
            return rawParts[0] + rawParts.slice(1).map(capitalize).join('');
        case 'pascal':
            return rawParts.map(capitalize).join('');
        case 'kebab':
            return rawParts.join('-');
        case 'snake':
            return rawParts.join('_');
        case 'constant':
            return rawParts.join('_').toLocaleUpperCase();
        case 'words':
            return rawParts.join(' ');
        default:
            return rawParts.join('');
    }
}

export function replaceWithCases(str: string, name: string): string {
    return str
        .replace(escapeForRegExp(name), '{{ name }}')
        .replace(escapeForRegExp(name.toLocaleLowerCase()), '{{ lower name }}')
        .replace(escapeForRegExp(name.toLocaleUpperCase()), '{{ upper name }}')
        .replace(escapeForRegExp(capitalize(name)), '{{ capitalize name }}')
        .replace(escapeForRegExp(convertToCase(name, 'camel')), '{{ camel name }}')
        .replace(escapeForRegExp(convertToCase(name, 'pascal')), '{{ pascal name }}')
        .replace(escapeForRegExp(convertToCase(name, 'snake')), '{{ snake name }}')
        .replace(escapeForRegExp(convertToCase(name, 'constant')), '{{ constant name }}')
        .replace(escapeForRegExp(convertToCase(name, 'kebab')), '{{ kebab name }}')
        .replace(escapeForRegExp(convertToCase(name, 'words')), '{{ words name }}');
}
