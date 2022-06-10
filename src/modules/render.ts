import { compile } from 'handlebars';
import { BsFile, isFileWithContent } from '../types';
import { convertNameToPath, escapeForRegExp } from './utils';

export async function renderFile(file: BsFile, params: Record<string, any>): Promise<BsFile> {
    if (isFileWithContent(file)) {
        const { name, path } = convertNameToPath(params.name, file.path);

        return {
            // TODO: add helper functions
            path: compile(path)({ ...params, name }),
            content: compile(file.content)({ ...params, name }),
        };
    }

    throw new Error();
}

export async function unrenderFile(file: BsFile, params: Record<string, any>): Promise<BsFile> {
    if (isFileWithContent(file)) {
        const nameRegexp = escapeForRegExp(params.name as string);

        return {
            path: file.path.replace(nameRegexp, '{{ name }}'),
            content: file.content.replace(nameRegexp, '{{ name }}'),
        };
    }

    throw new Error();
}
