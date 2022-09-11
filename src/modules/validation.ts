import validate, { arrayOf, isString, optional, isBool } from 'dvali';
import { BsFile, BsParameter, BsConfig } from '../types.js';

const validateBsFile = validate<BsFile>({
    path: [isString()],
    content: [isString()],
});

const validateBsParameter = validate<BsParameter>({
    name: [isString()],
    description: optional([isString()]),
    type: [isString()],
    default: [isString()],
    required: [isBool()],
});

export default validate<BsConfig>({
    templates: arrayOf({
        name: [isString()],
        namespace: [isString()],
        description: optional([isString()]),
        aliases: arrayOf([isString()]),
        // TODO: fix validation
        files: arrayOf(validateBsFile),
        includes: optional(arrayOf(isString())),
        parameters: optional(arrayOf(validateBsParameter)),
    }),
});
