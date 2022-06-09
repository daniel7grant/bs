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
