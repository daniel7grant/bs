export interface GeneratorParams {
    name: string;
    force: boolean;
    [k: string]: unknown;
}

export interface Generator {
    getKey: () => string;
    prepare: () => Promise<void>;
    generate: () => Promise<void>;
}

export interface FileWithContent {
    path: string;
    content: string;
}

export type File = FileWithContent;

export function isFileWithContent(file: File): file is FileWithContent {
    return !!file.content;
}

export interface Parameter {
    name: string;
    description?: string;
    type: string;
    default: string;
    required: boolean;
}

export interface Step {
    type: string;
    [k: string]: unknown;
}

export interface Template {
    name: string;
    namespace: string;
    aliases: string[];
    description?: string;
    parameters?: Parameter[];
    steps: Step[];
}

export interface Config {
    templates: Template[];
}

export interface BaseArguments {
    _: (string | number)[];
}

export interface CreateArguments extends BaseArguments {
    template: string;
    name: string | undefined;
    'from-file': string[] | undefined;
    include: string[] | undefined;
    force: boolean;
    'disable-parameters': boolean;
    gitignore: boolean;
}

export interface GenerateArguments extends BaseArguments {
    names: string[];
    force: boolean;
    [k: string]: unknown;
}

export interface InitArguments extends BaseArguments {
    directory: string;
    force: boolean;
}

export type Arguments = CreateArguments | GenerateArguments | InitArguments;

export const COMMANDS = {
    COMPLETION: 'completion',
    CREATE: 'create',
    GENERATE: ['generate', 'gen'],
    INIT: 'init',
};

export const OPTIONS = ['help', 'version'];

export const COMMAND_OPTIONS: {
    CREATE: (keyof CreateArguments)[];
    GENERATE: (keyof GenerateArguments)[];
    INIT: (keyof InitArguments)[];
} = {
    CREATE: ['from-file', 'include', 'force', 'disable-parameters', 'name'],
    GENERATE: ['force'],
    INIT: ['directory', 'force'],
};

export function isCreateCommand(args: Arguments): args is CreateArguments {
    return args._[0] === COMMANDS.CREATE;
}

export function isGenerateCommand(args: Arguments): args is GenerateArguments {
    return args._[0] === COMMANDS.GENERATE[0] || args._[0] === COMMANDS.GENERATE[1];
}

export function isInitCommand(args: Arguments): args is InitArguments {
    return args._[0] === COMMANDS.INIT;
}
