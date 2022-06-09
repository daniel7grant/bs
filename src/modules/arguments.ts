import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { findTemplate } from './config';
import { BsConfig, BsParameter, BsTemplate } from '../types';

const COMMANDS = {
    CREATE: 'create',
    COMPLETION: 'completion',
};

const OPTIONS = {
    HELP: '--help',
    VERSION: '--version',
};

function complete(config: BsConfig): yargs.AsyncCompletionFunction {
    return (current, argv) => {
        if (current.startsWith('-')) {
            const optionCompletion = Object.values(OPTIONS);
            if (argv._.length >= 3 && argv._[1] === COMMANDS.CREATE) {
                const templateOptions = findTemplate(config.templates, argv._[2])?.parameters?.map(
                    (p) => `--${p.name}`
                );
                return templateOptions;
            }
            return optionCompletion;
        }
        switch (argv._.length) {
            case 2:
                return Object.values(COMMANDS);
            case 3:
                switch (argv._[1]) {
                    case COMMANDS.CREATE:
                        return config.templates.flatMap((template) =>
                            template.namespace
                                ? [template.name, `${template.namespace}:${template.name}`]
                                : [template.name]
                        );
                    default:
                        return [];
                }
            default:
                return [];
        }
    };
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
        .parserConfiguration({ 'dot-notation': false })
        .usage('$0: bootstrap files quickly and efficiently.')
        .example([
            [
                `$0 ${COMMANDS.CREATE} react:component HelloWorld`,
                `Generate files with ${COMMANDS.CREATE}`,
            ],
            [
                `$0 ${COMMANDS.COMPLETION}`,
                'Generate tab completion for bash or zsh',
            ],
        ])
        .command(COMMANDS.CREATE, 'Generate new template.', (yargs) =>
            generateTemplateCommands(config.templates, yargs)
        )
        .completion(COMMANDS.COMPLETION, 'Generate tab completion bash and zsh', complete(config))
        .showHelpOnFail(true)
        .recommendCommands()
        .demandCommand(1, '')
        .parseAsync();
}
