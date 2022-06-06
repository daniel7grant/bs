import validate, { arrayOf, isString, optional } from 'dvali';
import { BsFile, BsParameter, BsConfig } from '../types';

const validateBsFile = validate<BsFile>({
    path: [isString()],
    content: [isString()],
});

const validateBsParameter = validate<BsParameter>({
    name: [isString()],
});

export const validateBsConfig = validate<BsConfig>({
    templates: arrayOf({
        name: [isString()],
        namespace: [isString()],
        aliases: arrayOf([isString()]),
        files: arrayOf(validateBsFile),
        parameters: optional(arrayOf(validateBsParameter)),
    }),
});
