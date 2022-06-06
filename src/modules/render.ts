import { compile } from 'handlebars';
import { BsFile, isFileWithContent } from '../types';
import { convertNameToPath } from './utils';

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
