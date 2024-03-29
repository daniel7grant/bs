import { sortBy } from 'ramda';
import yargs, { Argv, AsyncCompletionFunction, PositionalOptionsType } from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
    BsArguments,
    BsConfig,
    BsParameter,
    BsTemplate,
    COMMANDS,
    COMMAND_OPTIONS,
    CreateArguments,
    GenerateArguments,
    InitArguments,
    OPTIONS,
} from '../types.js';
import {
    findTemplate,
    generateTemplateFullname,
    generateTemplateNames,
    generateTemplateParamNames,
} from './config.js';

function complete(templates: BsTemplate[] = []): AsyncCompletionFunction {
    return (current, argv) => {
        if (current.startsWith('-')) {
            const optionCompletion = OPTIONS.map((p) => `--${p}`);
            if (argv._.length >= 3) {
                switch (argv._[1]) {
                    case COMMANDS.GENERATE[0]:
                    case COMMANDS.GENERATE[1]:
                        return [
                            ...generateTemplateParamNames(findTemplate(templates, argv._[2])),
                            ...COMMAND_OPTIONS.GENERATE,
                        ].map((p) => `--${p}`);
                    case COMMANDS.CREATE:
                        // TODO: remove either the --from-file or --includes if the other exists
                        return COMMAND_OPTIONS.CREATE.map((p) => `--${p}`);
                    case COMMANDS.INIT:
                        return COMMAND_OPTIONS.INIT.map((p) => `--${p}`);
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
                        return templates.flatMap(generateTemplateNames);
                    default:
                        return [];
                }
            default:
                switch (argv._[1]) {
                    case COMMANDS.CREATE:
                        // We are completing an --include flag
                        if (
                            typeof argv.include !== 'undefined' &&
                            argv.include[argv.include.length - 1] === current
                        ) {
                            // TODO: exclude previously used templates
                            return templates.map(generateTemplateFullname);
                        }
                        return [];
                    default:
                        return [];
                }
        }
    };
}

function generateTemplateParameters(parameters: BsParameter[] = []) {
    return (y: Argv): Argv<GenerateArguments> => {
        const parameterYargs = y
            .positional('names', {
                describe: 'the name or path to pass to the template',
                type: 'string',
                demandOption: true,
                array: true,
            })
            .option('force', {
                type: 'boolean',
                default: false,
            })
            .group(
                parameters.map((param) => param.name),
                'Template options:'
            );

        return parameters.reduce(
            (optionYargs, parameter) =>
                optionYargs.option(parameter.name, {
                    desc: parameter.description ?? '',
                    demandOption: parameter.required,
                    default: parameter.default,
                    type: parameter.type as PositionalOptionsType,
                }),
            parameterYargs
        );
    };
}

function generateTemplateCommands(templates: BsTemplate[] = []) {
    return (y: Argv): Argv<GenerateArguments> => {
        const sortedTemplates = sortBy(generateTemplateFullname, templates);
        return sortedTemplates
            .reduce(
                (templateYargs, template) =>
                    templateYargs.command(
                        generateTemplateNames(template).map((name) => `${name} <names..>`),
                        template.description ?? '',
                        generateTemplateParameters(template.parameters)
                    ),
                y as Argv<GenerateArguments>
            )
            .demandCommand(1, '');
    };
}

function createTemplateCommands() {
    return (y: Argv): Argv<CreateArguments> =>
        y
            .positional('template', {
                describe: 'The name of the new template',
                type: 'string',
                demandOption: true,
            })
            .option('from-file', {
                describe: 'The file or directory to create the template from',
                type: 'string',
                array: true,
            })
            .option('include', {
                describe: 'The templates to include in the new template',
                type: 'string',
                array: true,
            })
            .option('name', {
                describe: 'The name to be used as the parameter for the template',
                type: 'string',
            })
            .option('force', {
                describe: 'Whether it should overwrite existing template',
                type: 'boolean',
                default: false,
            })
            .option('gitignore', {
                describe:
                    'Whether it should respect the .gitignore files (use --no-gitignore to not)',
                type: 'boolean',
                default: true,
            })
            .option('disable-parameters', {
                describe: 'Whether it must not guess to replace template parts',
                type: 'boolean',
                default: false,
            });
}

function initTemplateCommands() {
    return (y: Argv): Argv<InitArguments> =>
        y
            .option('directory', {
                describe: 'The directory to create the file into (default: current directory)',
                type: 'string',
                default: '.'
            })
            .option('force', {
                describe: 'Whether it should overwrite existing config file',
                type: 'boolean',
                default: false,
            });
}

export default async function parseArguments(config: BsConfig | undefined): Promise<BsArguments> {
    return yargs(hideBin(process.argv))
        .parserConfiguration({ 'greedy-arrays': false })
        .usage('$0: bootstrap files quickly and efficiently')
        .example([
            [`$0 ${COMMANDS.INIT}`, 'Initialize a .bsconfig.yaml file'],
            [
                `$0 ${COMMANDS.GENERATE[1]} react:component HelloWorld`,
                'Generate files from template',
            ],
            [`source <($0 ${COMMANDS.COMPLETION})`, 'Generate tab completion for bash or zsh'],
        ])
        .command(
            COMMANDS.INIT,
            'Initialize a .bsconfig.yaml file in the local directory',
            initTemplateCommands()
        )
        .command(`${COMMANDS.CREATE} <template>`, 'Create new template', createTemplateCommands())
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
        .showHelpOnFail(true)
        .recommendCommands()
        .demandCommand(1, '')
        .parseAsync();
}
