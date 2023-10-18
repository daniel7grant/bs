import validate, { isString } from 'dvali';
import { writeFile } from 'fs/promises';
import { mkdirp } from 'mkdirp';
import { dirname } from 'path';
import { renderString } from '../modules/render.js';
import { convertNameToPath, exists } from '../modules/utils.js';
import { Generator, GeneratorParams, Step } from '../types.js';

interface FileData {
    path: string;
    content: string;
}

const validateFileData = validate({
    path: [isString()],
    content: [isString()],
});

class FileGenerator implements Generator {
    config: FileData;

    params: GeneratorParams;

    constructor({ type, ...config }: Step, params: GeneratorParams) {
        this.config = config as unknown as FileData;
        this.params = params;
    }

    getKey() {
        return this.config.path;
    }

    async prepare() {
        // TODO: sync validation
        this.config = await validateFileData(this.config);

        const { name, path } = convertNameToPath(this.params.name, this.config.path);

        this.config = {
            path: renderString(path, { ...this.params, name }),
            content: renderString(this.config.content, { ...this.params, name }),
        };

        // Check if file exists (it shouldn't overwrite anything by default)
        const existing = await exists(this.config.path);
        if (!this.params.force && existing) {
            throw new Error(`File ${this.config.path} already exist, add --force to overwrite.\n`);
        }
    }

    async generate() {
        // Generate directories if they don't exist
        await mkdirp(dirname(this.config.path));

        // Write to the file
        await writeFile(this.config.path, this.config.content);
    }
}

export default FileGenerator;
