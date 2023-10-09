import validate, { arrayOf, isBool, isString, optional } from 'dvali';
import { Config } from '../types.js';

const validateParameter = validate({
    name: [isString()],
    description: optional([isString()]),
    type: [isString()],
    default: [isString()],
    required: [isBool()],
});

const validateBaseTemplate = {
    name: [isString()],
    namespace: [isString()],
    description: optional([isString()]),
    aliases: arrayOf([isString()]),
    parameters: arrayOf(validateParameter),
    steps: arrayOf({
        type: [isString()],
    }),
};

export default validate<Config>({
    templates: arrayOf(validateBaseTemplate),
});
