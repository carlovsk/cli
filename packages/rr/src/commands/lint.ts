import {Command, Flags} from '@oclif/core';
import {discoverServices, validateServices, getServicesByNames} from '../lib/services';
import {selectServices} from '../lib/prompt';
import {runCommandsOnServices} from '../lib/runner';

export default class Lint extends Command {
  static override description = 'Run lint:fix on selected services';

  static override examples = [
    'rr lint',
    'rr lint --services billing,store',
    'rr lint -s billing,store',
    'rr lint --all',
    'rr lint --all --parallel',
  ];

  static override flags = {
    services: Flags.string({
      char: 's',
      description: 'Comma-separated list of service names',
      exclusive: ['all'],
    }),
    all: Flags.boolean({
      char: 'a',
      description: 'Run on all discovered services',
      exclusive: ['services'],
    }),
    parallel: Flags.boolean({
      char: 'p',
      description: 'Run in parallel instead of sequential',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Lint);

    try {
      let selectedServices;

      if (flags.all) {
        selectedServices = discoverServices();
        if (selectedServices.length === 0) {
          this.error('No services found. Make sure your project has services with both package.json and serverless.yml files.');
        }
      } else if (flags.services) {
        const serviceNames = flags.services.split(',').map(s => s.trim()).filter(Boolean);
        const validation = validateServices(serviceNames);

        if (!validation.valid) {
          this.error(`Invalid services: ${validation.invalidServices?.join(', ')}.\nAvailable services: ${validation.availableServices?.join(', ')}`);
        }

        selectedServices = getServicesByNames(serviceNames);
      } else {
        selectedServices = await selectServices('Select services to lint:');
      }

      const results = await runCommandsOnServices(selectedServices, {
        command: 'npm',
        args: ['run', 'lint:fix'],
        description: 'lint:fix',
        parallel: flags.parallel,
      });

      const hasFailures = results.some(result => !result.success);
      if (hasFailures) {
        this.exit(1);
      }
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error));
    }
  }
}