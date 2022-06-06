import { compile } from 'handlebars';
import { BsFile, isFileWithContent } from '../types';

export async function renderFile(file: BsFile, params: Record<string, any>): Promise<BsFile> {
    if (isFileWithContent(file)) {
        return {
            // TODO: add helper functions
            name: compile(file.name)(params),
            content: compile(file.content)(params),
        };
    }

    throw new Error();
}
