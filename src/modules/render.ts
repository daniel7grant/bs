import Handlebars from 'handlebars';
import { BsFile, isFileWithContent } from '../types';
import { capitalize, convertNameToPath, convertToCase, replaceWithCases } from './utils';

Handlebars.registerHelper('lower', (str: string) => str.toLocaleLowerCase());
Handlebars.registerHelper('upper', (str: string) => str.toLocaleUpperCase());
Handlebars.registerHelper('capitalize', (str: string) => capitalize(str));
Handlebars.registerHelper('camel', (str: string) => convertToCase(str, 'camel'));
Handlebars.registerHelper('pascal', (str: string) => convertToCase(str, 'pascal'));
Handlebars.registerHelper('snake', (str: string) => convertToCase(str, 'snake'));
Handlebars.registerHelper('constant', (str: string) => convertToCase(str, 'constant'));
Handlebars.registerHelper('kebab', (str: string) => convertToCase(str, 'kebab'));
Handlebars.registerHelper('words', (str: string) => convertToCase(str, 'words'));

export async function renderFile(file: BsFile, params: Record<string, any>): Promise<BsFile> {
    if (isFileWithContent(file)) {
        const { name, path } = convertNameToPath(params.name, file.path);

        return {
            path: Handlebars.compile(path)({ ...params, name }),
            content: Handlebars.compile(file.content)({ ...params, name }),
        };
    }

    throw new Error();
}

export async function unrenderFile(file: BsFile, params: Record<string, any>): Promise<BsFile> {
    if (isFileWithContent(file)) {
        return {
            path: replaceWithCases(file.path, params.name),
            content: replaceWithCases(file.content, params.name),
        };
    }

    throw new Error();
}
