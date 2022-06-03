import { constants } from 'fs';
import { readFile, access, mkdir, writeFile } from 'fs/promises';
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
        .command('create <template> [name]', 'Generate new template', (yargs) => {
            return yargs
                .positional('template', {
                    describe: 'the template to create',
                    type: 'string',
                    demandOption: true,
                })
                .positional('name', {
                    describe: '(optional) the parameter of the template',
                    type: 'string',
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

async function checkFile(filename: string): Promise<boolean> {
    if (await exists(filename)) {
        return false;
    }
    const filepath = path.parse(filename);
    const dirs = filepath.dir.split(path.sep);
    await dirs.reduce(async (fullDirPromise, dir) => {
        return fullDirPromise.then(async (fullDir) => {
            const newFullDir = path.join(fullDir, dir);
            if (!(await exists(newFullDir))) {
                await mkdir(newFullDir);
            }
            return newFullDir;
        });
    }, Promise.resolve(''));
    return true;
}

async function create(template: BsTemplate, params: Record<string, any>) {
    const existingFiles = await Promise.all(template.files.map((f) => f.name).filter(checkFile));

    if (existingFiles.length > 0) {
        console.warn(`Files already exist: ${existingFiles.join(', ')}.`);
        process.exit(0);
    }

    return Promise.all(
        template.files.map(async (file) => {
            if (isFileWithContent(file)) {
                await writeFile(file.name, file.content);
            }
        })
    );
}

async function main() {
    const filename = './bsconfig.yaml';
    const config = await loadConfig(filename);
    const { template: templateName, name } = await parseArguments();
    const template = findTemplate(config.templates, templateName);
    if (!template) {
        console.error(`Template "${templateName}" not found in ${filename}.`);
        process.exit(1);
    }
    await create(template, { name });
}

main().catch((err) => console.error(err));
