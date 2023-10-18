import validate, { isString, optional } from 'dvali';
import { createReadStream, createWriteStream } from 'fs';
import { copyFile, unlink } from 'fs/promises';
import split from 'split2';
import { pipeline } from 'stream/promises';
import { renderString } from '../modules/render.js';
import { convertNameToPath, exists, mktmp } from '../modules/utils.js';
import { Generator, GeneratorParams, Step } from '../types.js';

interface LineData {
    path: string;
    line: string;
    before?: string;
    after?: string;
    beforeLast?: string;
    afterLast?: string;
    beforeAll?: string;
    afterAll?: string;
}

const validateLineData = validate({
    path: [isString()],
    line: [isString()],
    before: optional(isString()),
    after: optional(isString()),
    beforeLast: optional(isString()),
    afterLast: optional(isString()),
});

class LineGenerator implements Generator {
    config: LineData;

    params: GeneratorParams;

    constructor({ type, ...config }: Step, params: GeneratorParams) {
        this.config = config as unknown as LineData;
        this.params = params;
    }

    getKey() {
        return this.config.path;
    }

    async prepare() {
        // TODO: sync validation
        this.config = await validateLineData(this.config);

        const { name, path } = convertNameToPath(this.params.name, this.config.path);

        this.config = {
            ...this.config,
            path: renderString(path, { ...this.params, name }),
            line: renderString(this.config.line, { ...this.params, name }),
        };

        if (
            !this.config.before &&
            !this.config.after &&
            !this.config.beforeLast &&
            !this.config.afterLast &&
            !this.config.beforeAll &&
            !this.config.afterAll
        ) {
            throw new Error(
                'You have to pass any one of before, after, beforeLast or afterLast.\n'
            );
        }

        // Check if file exists, otherwise fail
        const existing = await exists(this.config.path);
        if (!existing) {
            throw new Error(`File ${this.config.path} does not exist.\n`);
        }
    }

    async generate() {
        const input = createReadStream(this.config.path);
        const tmppath = await mktmp();
        const output = createWriteStream(tmppath);

        const reStr =
            this.config.before ??
            this.config.after ??
            this.config.beforeAll ??
            this.config.afterAll;
        if (!reStr) {
            throw new Error(
                'You have to pass any one of before, after, beforeLast or afterLast.\n'
            );
        }
        const re = new RegExp(reStr);

        try {
            let changed = false;
            await pipeline(
                input,
                split((line) => {
                    if (re.test(line)) {
                        if ((this.config.before && !changed) || this.config.beforeAll) {
                            changed = true;
                            return `${this.config.line}\n${line}\n`;
                        }
                        if ((this.config.after && !changed) || this.config.afterAll) {
                            changed = true;
                            return `${line}\n${this.config.line}\n`;
                        }
                    }
                    return `${line}\n`;
                }),
                output
            );
            await copyFile(tmppath, this.config.path);
            await unlink(tmppath);
        } catch (err) {
            let errorMessage = '';
            if (err instanceof Error) {
                errorMessage = ` (${err.message})`;
            }
            throw new Error(`Failed writing to ${this.config.path}${errorMessage}.`);
        }
    }
}

export default LineGenerator;
