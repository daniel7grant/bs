import validate, { isString } from 'dvali';
import { writeFile } from 'fs/promises';
import { mkdirp } from 'mkdirp';
import { dirname } from 'path';
import { renderString } from '../modules/render.js';
import { convertNameToPath, exists } from '../modules/utils.js';
import { BsGenerator, BsGeneratorParams, BsStep } from '../types.js';

interface BsFileData {
    path: string;
    content: string;
}

const validateBsFile = validate({
    path: [isString()],
    content: [isString()],
});

class FileGenerator implements BsGenerator {
    config: BsFileData;

    params: BsGeneratorParams;

    constructor({ type, ...config }: BsStep, params: BsGeneratorParams) {
        this.config = config as unknown as BsFileData;
        this.params = params;
    }

    async prepare() {
        // TODO: sync validation
        this.config = await validateBsFile(this.config);

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
