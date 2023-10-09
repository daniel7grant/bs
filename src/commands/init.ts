import path from 'path';
import { initConfig, saveConfig } from '../modules/config.js';
import { exists } from '../modules/utils.js';
import { Config, InitArguments } from '../types.js';

export default async function init(
    config: Config | undefined,
    _: (number | string)[],
    params: InitArguments
) {
    const { directory, force } = params;
    const configFile = path.join(directory, '.bsconfig.yaml');

    if (!force && (await exists(configFile))) {
        throw new Error('Config file already exist, add --force to overwrite.\n');
    }

    const newConfig = initConfig();
    await saveConfig(newConfig, configFile);

    process.stdout.write(`Config file "${configFile}" initalized.\n`);
}
