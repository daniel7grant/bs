import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export async function parseArguments() {
    return yargs(hideBin(process.argv))
        .command('create <template> <names..>', 'Generate new template', (yargs) => {
            // TODO: add dynamic loading for template names and option parameters
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
        .showHelpOnFail(true)
        .demandCommand(1, '')
        .parseAsync();
}
