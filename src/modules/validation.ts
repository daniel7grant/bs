import validate, { arrayOf, either, isBool, isString, optional } from 'dvali';
import { BsConfig } from '../types.js';

const validateBsFile = validate({
    path: [isString()],
    content: [isString()],
});

const validateBsParameter = validate({
    name: [isString()],
    description: optional([isString()]),
    type: [isString()],
    default: [isString()],
    required: [isBool()],
});

const validateBaseBsTemplate = {
    name: [isString()],
    namespace: [isString()],
    description: optional([isString()]),
    aliases: arrayOf([isString()]),
    parameters: arrayOf(validateBsParameter),
};

const validateBsFilesTemplate = validate({
    ...validateBaseBsTemplate,
    files: arrayOf(validateBsFile),
});

const validateBsIncludeTemplate = validate({
    ...validateBaseBsTemplate,
    includes: arrayOf(isString()),
});

export default validate<BsConfig>({
    templates: arrayOf(either([validateBsFilesTemplate, validateBsIncludeTemplate])),
});
