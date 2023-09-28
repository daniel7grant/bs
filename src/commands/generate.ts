import FileGenerator from '../generators/file.js';
import { findTemplate, getConfigFile } from '../modules/config.js';
import { BsConfig, GenerateArguments } from '../types.js';

export default async function generate(
    config: BsConfig | undefined,
    [, templateName]: (number | string)[],
    { names, force, _, ...params }: GenerateArguments
): Promise<void> {
    if (!config) {
        throw new Error('Config file not found. Create one in the local or homedir.\n');
    }

    const template = findTemplate(config.templates, `${templateName}`);
    if (!template) {
        const configFile = await getConfigFile();
        throw new Error(`Template "${templateName}" not found in ${configFile}.\n`);
    }

    // Collect the steps with the plugins, and validate the config format
    const steps = (
        await Promise.all(
            names.map(async (name) => {
                const results = await Promise.all(
                    template.steps.map(async (step) => {
                        switch (step.type) {
                            case 'file': {
                                return new FileGenerator(step, { name, force, ...params });
                            }
                            default:
                                throw new Error(`There is no plugin for ${step.type}.`);
                        }
                    })
                );
                return results;
            })
        )
    ).flat(1);

    // Prepare the steps (e.g. generate files, test filesystem etc.)
    const prepareResults = await Promise.allSettled(steps.map((step) => step.prepare()));
    const prepareFailed = prepareResults.filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
    );
    if (prepareFailed.length > 0) {
        throw new Error(`Preparation failed: ${prepareFailed.map((r) => r.reason).join(', ')}`);
    }

    // Trigger the steps and finish the generation
    await Promise.all(steps.map((step) => step.generate()));
}
