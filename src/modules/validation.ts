import validate, { arrayOf, isString } from 'dvali';
import { BsFile, BsParameter, BsConfig } from '../types';

const validateBsFile = validate<BsFile>({
    name: [isString()],
    content: [isString()],
});

const validateBsParameter = validate<BsParameter>({
    name: [isString()],
});

export const validateBsConfig = validate<BsConfig>({
    templates: arrayOf({
        aliases: arrayOf([isString()]),
        files: arrayOf(validateBsFile),
        name: [isString()],
        parameters: arrayOf(validateBsParameter),
    }),
});
