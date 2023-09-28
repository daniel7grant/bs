import validate, { arrayOf, isBool, isString, optional } from 'dvali';
import { BsConfig } from '../types.js';

const validateBsParameter = validate({
    name: [isString()],
    description: optional([isString()]),
    type: [isString()],
    default: [isString()],
    required: [isBool()],
});

const validateBsGenerator = validate({
    type: [isString()],
});

const validateBsTemplate = {
    name: [isString()],
    namespace: [isString()],
    description: optional([isString()]),
    aliases: arrayOf([isString()]),
    parameters: arrayOf(validateBsParameter),
    generators: arrayOf(validateBsGenerator),
};

export default validate<BsConfig>({
    templates: arrayOf(validateBsTemplate),
});
