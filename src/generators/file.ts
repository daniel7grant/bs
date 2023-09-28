import validate, { isString } from 'dvali';

interface Generator<T> {
    from: (t: string) => Promise<T>;
    validate: (t: unknown) => Promise<void>;
    run: (t: T) => Promise<void>;
}

interface BsFile {
    path: string;
    content: string;
}

const fileGenerator: Generator<BsFile> = {
    async validate(fileConfig) {
        const validateBsFile = validate<BsFile>({
            path: [isString()],
            content: [isString()],
        });
        const file = await validateBsFile(fileConfig);
    },
    async run(fileConfig) {
        
    },
    async from(filename) {
        
    },
};

export default fileGenerator;
