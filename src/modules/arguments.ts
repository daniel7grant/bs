import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { findTemplate } from './config';
import { BsConfig, BsParameter, BsTemplate } from '../types';

export const COMMANDS = {
    CREATE: 'create',
    GENERATE: ['generate', 'gen'],
    COMPLETION: 'completion',
};

const OPTIONS = {
    HELP: '--help',
    VERSION: '--version',
};

export const CREATE_OPTIONS = { FROM_FILE: '--from-file' };

function complete(templates: BsTemplate[] = []): yargs.AsyncCompletionFunction {
    return (current, argv) => {
        if (current.startsWith('-')) {
            const optionCompletion = Object.values(OPTIONS);
            if (argv._.length >= 3) {
                switch (argv._[1]) {
                    case COMMANDS.GENERATE[0]:
                    case COMMANDS.GENERATE[1]:
                        return findTemplate(templates, argv._[2])?.parameters?.map(
                            (p) => `--${p.name}`
                        );
                    case COMMANDS.CREATE:
                        return Object.values(CREATE_OPTIONS);
                    default:
                        return [];
                }
            }
            return optionCompletion;
        }
        switch (argv._.length) {
            case 2:
                return Object.values(COMMANDS).flat();
            case 3:
                switch (argv._[1]) {
                    case COMMANDS.GENERATE[0]:
                    case COMMANDS.GENERATE[1]:
                        return templates.flatMap((template) => {
                            if (template.namespace) {
                                return [template.name, `${template.namespace}:${template.name}`];
                            }
                            return [template.name];
                        });
                    default:
                        return [];
                }
            default:
                return [];
        }
    };
}

function generateTemplateParameters(parameters: BsParameter[] = []) {
    return (y: yargs.Argv): yargs.Argv => {
        const parameterYargs = y.positional('names', {
            describe: 'the name or path to pass to the template',
            type: 'string',
            demandOption: true,
            array: true,
        });

        return parameters.reduce(
            (optionYargs, parameter) =>
                optionYargs.option(parameter.name, {
                    desc: parameter.description ?? '',
                    demandOption: parameter.required,
                    default: parameter.default,
                    type: parameter.type as yargs.PositionalOptionsType,
                }),
            parameterYargs
        );
    };
}

function generateTemplateCommands(templates: BsTemplate[] = []) {
    return (y: yargs.Argv): yargs.Argv =>
        templates
            .reduce(
                (templateYargs, template) =>
                    templateYargs.command(
                        `${template.name} <names..>`,
                        template.description ?? '',
                        generateTemplateParameters(template.parameters)
                    ),
                y
            )
            .demandCommand(1, '');
}

export default async function parseArguments(config: BsConfig | undefined): Promise<{
    [x: string]: unknown;
    _: (string | number)[];
    $0: string;
}> {
    return yargs(hideBin(process.argv))
        .parserConfiguration({ 'dot-notation': false })
        .usage('$0: bootstrap files quickly and efficiently')
        .example([
            [
                `$0 ${COMMANDS.GENERATE[1]} react:component HelloWorld`,
                'Generate files from template',
            ],
            [`source <($0 ${COMMANDS.COMPLETION})`, 'Generate tab completion for bash or zsh'],
        ])
        .command(
            COMMANDS.GENERATE,
            'Generate files from template',
            generateTemplateCommands(config?.templates)
        )
        .completion(
            COMMANDS.COMPLETION,
            'Generate tab completion bash and zsh',
            complete(config?.templates)
        )
        .command(COMMANDS.CREATE, 'Create new template', (y) =>
            y
                .positional('name', {
                    describe: 'the name of the new template',
                    type: 'string',
                    demandOption: true,
                })
                .option(CREATE_OPTIONS.FROM_FILE, {
                    type: 'string',
                })
        )
        .completion(
            COMMANDS.COMPLETION,
            'Generate tab completion bash and zsh',
            complete(config?.templates)
        )
        .showHelpOnFail(true)
        .recommendCommands()
        .demandCommand(1, '')
        .parseAsync();
}
