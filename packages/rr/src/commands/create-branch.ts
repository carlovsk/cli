import {Command, Args, Flags} from '@oclif/core';
import {execSync} from 'child_process';
import {select, input} from '@inquirer/prompts';

export default class CreateBranch extends Command {
  static override description = 'Create a new git branch from main or the latest tag';

  static override examples = [
    'rr create-branch',
    'rr create-branch --branch-name feature/new-feature',
    'rr create-branch --from-main',
    'rr create-branch --from-tag',
  ];

  static override flags = {
    'branch-name': Flags.string({
      char: 'b',
      description: 'Name of the new branch to create',
    }),
    'from-main': Flags.boolean({
      description: 'Create branch from main (default behavior)',
      exclusive: ['from-tag'],
    }),
    'from-tag': Flags.boolean({
      description: 'Create branch from the latest tag',
      exclusive: ['from-main'],
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(CreateBranch);

    try {
      // Determine source for branch creation
      let fromSource: 'main' | 'tag';

      if (flags['from-main']) {
        fromSource = 'main';
      } else if (flags['from-tag']) {
        fromSource = 'tag';
      } else {
        // Ask user to choose
        fromSource = await select({
          message: 'Create branch from:',
          choices: [
            { name: 'main branch', value: 'main' },
            { name: 'latest tag', value: 'tag' },
          ],
        });
      }

      // Get branch name
      let branchName = flags['branch-name'];
      if (!branchName) {
        branchName = await input({
          message: 'Enter the new branch name:',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Branch name is required';
            }
            // Basic branch name validation
            if (!/^[a-zA-Z0-9/_-]+$/.test(input)) {
              return 'Branch name can only contain letters, numbers, hyphens, underscores, and forward slashes';
            }
            return true;
          },
        });
      }

      // Check for staged changes that could prevent checkout
      try {
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        if (status.trim()) {
          this.error('You have uncommitted changes. Please commit or stash them before creating a new branch.');
        }
      } catch (error) {
        this.error('Failed to check git status. Make sure you are in a git repository.');
      }

      // Get the source commit/tag
      let sourceRef: string;
      if (fromSource === 'main') {
        sourceRef = 'main';
        this.log(`Creating branch "${branchName}" from main...`);
      } else {
        // Get the latest tag
        try {
          sourceRef = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
          this.log(`Creating branch "${branchName}" from latest tag "${sourceRef}"...`);
        } catch (error) {
          this.error('Failed to find latest tag. Make sure your repository has tags.');
        }
      }

      // Checkout to the source ref
      try {
        execSync(`git checkout ${sourceRef}`, { stdio: 'inherit' });
      } catch (error) {
        this.error(`Failed to checkout to ${sourceRef}. ${error instanceof Error ? error.message : String(error)}`);
      }

      // Create and checkout the new branch
      try {
        execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
        this.log(`✅ Successfully created and switched to branch "${branchName}"`);
      } catch (error) {
        this.error(`Failed to create branch "${branchName}". ${error instanceof Error ? error.message : String(error)}`);
      }

    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error));
    }
  }
}