import validate, { arrayOf, isString, optional } from 'dvali';
import { BsFile, BsParameter, BsConfig } from '../types';

const validateBsFile = validate<BsFile>({
    path: [isString()],
    content: [isString()],
});

const validateBsParameter = validate<BsParameter>(
    {
        name: [isString()],
    }
);

export const validateBsConfig = validate<BsConfig>({
    templates: arrayOf({
        aliases: arrayOf([isString()]),
        files: arrayOf(validateBsFile),
        name: [isString()],
        parameters: optional(arrayOf(validateBsParameter)),
    }),
});
