export interface BsFileWithContent {
    path: string;
    content: string;
}

export type BsFile = BsFileWithContent;

export function isFileWithContent(file: BsFile): file is BsFileWithContent {
    return !!file.content;
}

export interface BsParameter {
    name: string;
    description?: string;
    type: string;
    default: string;
    required: boolean;
}

export interface BsTemplate {
    name: string;
    namespace?: string;
    aliases: string[];
    description?: string;
    parameters?: BsParameter[];
    files: BsFile[];
}

export interface BsConfig {
    templates: BsTemplate[];
}

export interface BaseArguments {
    _: (string | number)[];
}

export interface CreateArguments extends BaseArguments {
    name: string;
    'from-file': string | undefined;
    force: boolean;
    'disable-parameters': boolean;
}

export interface GenerateArguments extends BaseArguments {
    names: string[];
    [k: string]: unknown;
}

export type BsArguments = CreateArguments | GenerateArguments;

export const COMMANDS = {
    CREATE: 'create',
    GENERATE: ['generate', 'gen'],
    COMPLETION: 'completion',
};

export const OPTIONS = ['help', 'version'];

export const COMMAND_OPTIONS: {
    CREATE: (keyof CreateArguments)[];
    GENERATE: (keyof GenerateArguments)[];
} = {
    CREATE: ['from-file', 'force', 'disable-parameters'],
    GENERATE: [],
};

export function isCreateCommand(args: BsArguments): args is CreateArguments {
    return args._[0] === COMMANDS.CREATE;
}

export function isGenerateCommand(args: BsArguments): args is GenerateArguments {
    return args._[0] === COMMANDS.GENERATE[0] || args._[0] === COMMANDS.GENERATE[1];
}
