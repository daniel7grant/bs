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

export interface BaseBsTemplate {
    name: string;
    namespace: string;
    aliases: string[];
    description?: string;
    parameters?: BsParameter[];
}

export interface BsFilesTemplate extends BaseBsTemplate {
    files: BsFile[];
}

export interface BsIncludesTemplate extends BaseBsTemplate {
    includes: string[];
}

export type BsTemplate = BsFilesTemplate | BsIncludesTemplate;

export interface BsConfig {
    templates: BsTemplate[];
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

export type BsArguments = CreateArguments | GenerateArguments | InitArguments;

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

export function isCreateCommand(args: BsArguments): args is CreateArguments {
    return args._[0] === COMMANDS.CREATE;
}

export function isGenerateCommand(args: BsArguments): args is GenerateArguments {
    return args._[0] === COMMANDS.GENERATE[0] || args._[0] === COMMANDS.GENERATE[1];
}

export function isInitCommand(args: BsArguments): args is InitArguments {
    return args._[0] === COMMANDS.INIT;
}
