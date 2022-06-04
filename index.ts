import { constants } from 'fs';
import { readFile, access, mkdir, writeFile } from 'fs/promises';
import { compile } from 'handlebars';
import { load } from 'js-yaml';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

interface BsFileWithContent {
    name: string;
    content: string;
}

type BsFile = BsFileWithContent;

interface BsParameter {}

interface BsTemplate {
    name: string;
    aliases: string[];
    parameters: BsParameter[];
    files: BsFile[];
}

interface BsConfig {
    templates: BsTemplate[];
}

async function loadConfig(filename: string): Promise<BsConfig> {
    try {
        const content = await readFile('./.bsconfig.yaml', 'utf8');
        const config = load(content) as BsConfig;
        return config;
    } catch (error: any) {
        console.error(`Loading config "${filename}" failed: ${error.getMessage()}`);
        process.exit(1);
    }
}

async function parseArguments() {
    return yargs(hideBin(process.argv))
        .command('create <template> <names..>', 'Generate new template', (yargs) => {
            return yargs
                .positional('template', {
                    describe: 'the template to create',
                    type: 'string',
                    demandOption: true,
                })
                .positional('names', {
                    describe: 'the name or path to pass to the template',
                    type: 'string',
                    demandOption: true,
                    array: true,
                });
        })
        .parseAsync();
}

function findTemplate(templates: BsTemplate[], name: string): BsTemplate | undefined {
    return templates.find((t) => t.name === name || t.aliases.includes(name));
}

function isFileWithContent(file: BsFile): file is BsFileWithContent {
    return !!file.content;
}

async function exists(filename: string): Promise<boolean> {
    return access(filename, constants.F_OK).then(
        () => {
            return true;
        },
        () => {
            return false;
        }
    );
}

function subdirs(filename: string): string[] {
    const { dir } = path.parse(filename);
    if (dir.startsWith('/')) {
        console.warn('Paths starting with "/" will be converted to local path.');
    }
    return dir.split('/').reduce<string[]>((subdirs, newDir) => {
        const last = subdirs[subdirs.length - 1];
        return last ? [...subdirs, path.join(last, newDir)] : [newDir];
    }, []);
}

async function renderFile(file: BsFile, params: Record<string, any>): Promise<BsFile> {
    if (isFileWithContent(file)) {
        return {
            name: compile(file.name)(params),
            content: compile(file.content)(params),
        };
    }

    throw new Error();
}

async function create(template: BsTemplate, names: string[]): Promise<BsFile[]> {
    const renderedFiles = await Promise.all(
        names.flatMap((name) => template.files.map((f) => renderFile(f, { name })))
    );

    const existingFiles = await Promise.all(renderedFiles.map((f) => f.name).map(exists));
    if (existingFiles.some((f) => f === true)) {
        console.warn(`Files already exist, add --force to overwrite.`);
        process.exit(0);
    }

    const dirsToCreate = renderedFiles
        .map((f) => subdirs(f.name))
        .reduce((set, dirs) => dirs.reduce((set, dir) => set.add(dir), set), new Set<string>());
    await Array.from(dirsToCreate).reduce<Promise<void>>(
        (previousCreate, dir) => previousCreate.then(() => mkdir(dir)),
        Promise.resolve()
    );

    return Promise.all(
        renderedFiles.map(async (file) => {
            if (isFileWithContent(file)) {
                await writeFile(file.name, file.content);
            }

            return file;
        })
    );
}

async function main() {
    const filename = './bsconfig.yaml';
    const config = await loadConfig(filename);
    const { template: templateName, names } = await parseArguments();
    const template = findTemplate(config.templates, templateName);
    if (!template) {
        console.error(`Template "${templateName}" not found in ${filename}.`);
        process.exit(1);
    }
    const createdFiles = await create(template, names);
    createdFiles.flat().forEach((file) => {
        console.log(`File "${file.name}" created.`);
    });
}

main().catch((err) => console.error(err));
