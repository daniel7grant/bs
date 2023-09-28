import { constants } from 'fs';
import { access } from 'fs/promises';
import path from 'path';
import pluralize from 'pluralize';
import { takeWhile, transpose, uniq } from 'ramda';

/**
 * Check if file exists with filename
 *
 * @param filename the filename to check
 * @returns true if exists, false if it doesn't
 */
export async function exists(filename: string): Promise<boolean> {
    return access(filename, constants.F_OK).then(
        () => true,
        () => false
    );
}

/**
 * Check whether all items are the same in an array
 *
 * @param xs an array
 * @returns whether all items are the same
 */
const allEquals = <T>(xs: T[]): boolean => uniq(xs).length === 1;

/**
 * Get the lowest common directory (or file) of the paths, and get the name of it.
 *
 * @example
 *      getNameFromPaths(["src/commands/create.ts", "src/commands/generate.ts"]); // => "commands"
 *      getNameFromPaths(["src/index.ts", "src/types.ts"]); // => "src"
 *      getNameFromPaths(["src/index.ts", "dist/index.ts"]); // => (current dir name)
 *      getNameFromPaths(["src/index.ts"]); // => "index"
 *
 * @param paths the list of string relative paths
 * @returns the base name of the closest parent directory
 */
export function getNameFromPaths(paths: string[]): string | undefined {
    const parsedPaths = paths.map((p) => p.split(path.sep));
    const commonPathParts = takeWhile(allEquals, transpose(parsedPaths));
    const commonPath = commonPathParts.map(([x]) => x).join('/');
    return path.parse(path.resolve(commonPath)).name;
}

const nameRegex = '[a-zA-Z0-9_-]*';
/**
 * Convert passed name to a path, if it already has a path, then it will not be transformed
 *
 * @param name the name to transform
 * @param templatePath the path defined in the template
 * @returns the path to write the file to
 */
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

/**
 * Capitalize string: make the first letter a capital letter
 *
 * @example
 *      capitalize("asdasd"); // => "Asdasd"
 *
 * @param str the string to capitalize
 * @returns the capitalized string
 */
export function capitalize(str: string): string {
    if (str.length > 0) {
        return str[0].toLocaleUpperCase() + str.slice(1);
    }
    return '';
}

/**
 * Guess the case of a string, which can either be:
 *   - separated, e.g. ("snake_case", "kebab-case" "CONSTANT_CASE")
 *   - cased, e.g. ("camelCase", "PascalCase")
 * separate the parts, and convert it to another case.
 *
 * @example
 *      convertToCase("koala-bear", "pascal"); // => KoalaBear
 *      convertToCase("koalaBear", "words"); // => koala bear
 *      convertToCase("koalabear", "words"); // => koalabear // no separator!
 *
 * @param str the string to detect the case of
 * @param targetCase the case to change to
 * @returns the changed cased string
 */
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

/**
 * Escape characters in RegExp to protect from RegExp posioning.
 * For cases where you have to use a RegExp instead of replaceAll.
 *
 * @param str the string you want to replace all with
 * @returns the regex from the string
 */
export function escapeForRegExp(str: string): RegExp {
    return new RegExp(str.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'), 'g');
}

const helpers: Record<string, (x: string) => string> = {
    '': (name) => name,
    lower: (name) => name.toLocaleLowerCase(),
    upper: (name) => name.toLocaleUpperCase(),
    capitalize: (name) => capitalize(name),
    camel: (name) => convertToCase(name, 'camel'),
    pascal: (name) => convertToCase(name, 'pascal'),
    snake: (name) => convertToCase(name, 'snake'),
    constant: (name) => convertToCase(name, 'constant'),
    kebab: (name) => convertToCase(name, 'kebab'),
    words: (name) => convertToCase(name, 'words'),
};
/**
 * Replace the different cases of the name in str.
 *
 * @example
 *      replaceWithCases(
 *          "const koalaBear = KoalaBearRepository.create(new KoalaBear());"
 *          "koalaBear"
 *      ); // => "const {{ name }} = {{ pascal name }}Repository.create(new {{ pascal name }}());"
 *
 * @param str the string to replace in
 * @param name the name to replace, either separated (e.g. snake_case) or cased (e.g. CamelCase)
 * @returns the replaced string
 */
export function replaceWithCases(str: string, name: string): string {
    const singularName = pluralize.singular(name);
    const pluralName = pluralize.plural(name);

    let output = str;
    if (singularName !== pluralName) {
        output = Object.entries(helpers).reduce(
            (previousStr, [helperName, helperFn]) =>
                previousStr.replace(
                    escapeForRegExp(helperFn(pluralName)),
                    `{{ plural( ${helperName ? `${helperName} ` : ''}name) }}`
                ),
            output
        );
    }
    output = Object.entries(helpers).reduce(
        (previousStr, [helperName, helperFn]) =>
            previousStr.replace(
                escapeForRegExp(helperFn(singularName)),
                `{{ ${helperName ? `${helperName} ` : ''}name }}`
            ),
        output
    );
    return output;
}

/**
 * Replace "{{ }}" with escaped blocks for Handlebars
 *
 * @example
 *      escapeHandlebars("{{ originalTemplate }}") // => "\{{ originalTemplate }}"
 *
 * @param str the string to escape
 * @returns the escaped string
 */
export function escapeHandlebars(str: string): string {
    return str.replace(/\{\{/g, '\\{{');
}
