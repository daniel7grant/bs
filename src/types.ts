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
}

export interface BsTemplate {
    name: string;
	namespace?: string;
    aliases: string[];
    parameters?: BsParameter[];
    files: BsFile[];
}

export interface BsConfig {
    templates: BsTemplate[];
}
