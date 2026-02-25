import {Command, Args, Flags} from '@oclif/core';
import {discoverServices, validateServices, getServicesByNames} from '../lib/services';
import {selectServices} from '../lib/prompt';
import {bumpServicesSequentially} from '../lib/bump';

export default class Bump extends Command {
  static override description = 'Bump @rediredi/* packages to a specified version';

  static override examples = [
    'rr bump 1.2.3',
    'rr bump 1.2.3 --services billing,store',
    'rr bump 1.2.3 -s billing,store',
    'rr bump 1.2.3 --all',
  ];

  static override args = {
    version: Args.string({
      description: 'Version to bump @rediredi/* packages to',
      required: true,
    }),
  };

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
  };

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Bump);

    if (!args.version) {
      this.error('Version argument is required. Usage: rr bump <version>');
    }

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
        selectedServices = await selectServices('Select services to bump:');
      }

      const results = await bumpServicesSequentially(selectedServices, args.version);

      const hasFailures = results.some(result => !result.success);
      if (hasFailures) {
        this.exit(1);
      }
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error));
    }
  }
}