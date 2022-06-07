import { BsConfig, BsParameter, BsTemplate } from '../types';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export async function parseConfiguration() {
    return yargs(hideBin(process.argv))
        .option('configuration', {
            alias: ['c'],
            demandOption: false,
            type: 'string',
        })
        .parseAsync();
}

function generateTemplateParameters(parameters: BsParameter[] = [], yargs: yargs.Argv): yargs.Argv {
    let parameterYargs = yargs.positional('names', {
        describe: 'the name or path to pass to the template',
        type: 'string',
        demandOption: true,
        array: true,
    });
    for (const parameter of parameters) {
        parameterYargs = parameterYargs.option(parameter.name, {
            desc: parameter.description ?? '',
            demandOption: parameter.required,
            default: parameter.default,
            type:
                parameter.type === 'string'
                    ? 'string'
                    : parameter.type === 'number'
                    ? 'number'
                    : 'boolean',
        });
    }
    return parameterYargs;
}

function generateTemplateCommands(templates: BsTemplate[], yargs: yargs.Argv): yargs.Argv {
    return templates
        .reduce(
            (templateYargs, template) =>
                templateYargs.command(
                    `${template.name} <names..>`,
                    template.description ?? '',
                    (subcommandYargs) =>
                        generateTemplateParameters(template.parameters, subcommandYargs)
                ),
            yargs
        )
        .demandCommand(1, '');
}

export async function parseArguments(config: BsConfig): Promise<{
    [x: string]: unknown;
    _: (string | number)[];
    $0: string;
}> {
    return yargs(hideBin(process.argv))
        .option('configuration', {
            alias: ['c'],
            demandOption: false,
            type: 'string',
        })
        .command('create', 'Generate new template', (yargs) =>
            generateTemplateCommands(config.templates, yargs)
        )
        .showHelpOnFail(true)
        .demandCommand(1, '')
        .parseAsync();
}
