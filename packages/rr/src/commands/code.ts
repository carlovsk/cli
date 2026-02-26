import {Command, Args, Flags} from '@oclif/core';
import {loadConfig, getWorkspaceRoot} from '../lib/config';
import {getProjects, openProjectInVSCode} from '../lib/projects';
import {select} from '@inquirer/prompts';

export default class Code extends Command {
  static override description = 'Open a project in VS Code';

  static override examples = [
    'rr code',                    // Interactive project selection
    'rr code myservice',          // Open specific project
    'rr code myservice --new',    // Open in new VS Code window
  ];

  static override args = {
    projectName: Args.string({
      description: 'Name of the project to open (optional, will show selection if not provided)',
      required: false,
    }),
  };

  static override flags = {
    new: Flags.boolean({
      char: 'n',
      description: 'Open in a new VS Code window',
      default: false,
    }),
    list: Flags.boolean({
      char: 'l',
      description: 'List available projects',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Code);

    // Load workspace root from configuration
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) {
      this.error('No workspace configuration found. Run "rr config set projectRoot <workspace-path>" to get started.\n' +
                 'The workspace path should point to the directory containing your projects (e.g., ~/www/rediredi).');
    }

    try {
      const projects = getProjects(workspaceRoot);

      if (projects.length === 0) {
        this.error(`No projects found in ${workspaceRoot}`);
      }

      // List projects mode
      if (flags.list) {
        this.log('Available projects:');
        projects.forEach(project => {
          this.log(`  - ${project.name} (${project.path})`);
        });
        return;
      }

      let selectedProject: string;

      if (args.projectName) {
        // Specific project requested
        const project = projects.find(p => p.name === args.projectName);
        if (!project) {
          this.error(`Project "${args.projectName}" not found. Available projects: ${projects.map(p => p.name).join(', ')}`);
          return;
        }
        selectedProject = project.name;
      } else {
        // Interactive selection
        if (projects.length === 1) {
          selectedProject = projects[0].name;
          this.log(`Opening only available project: ${selectedProject}`);
        } else {
          try {
            selectedProject = await select({
              message: 'Select a project to open in VS Code:',
              choices: projects.map(project => ({
                name: `${project.name} (${project.path})`,
                value: project.name,
              })),
            });
          } catch (error) {
            if (error instanceof Error && error.name === 'ExitPromptError') {
              this.log('Operation cancelled by user.');
              return;
            }
            throw error;
          }
        }
      }

      // Find the selected project
      const projectToOpen = projects.find(p => p.name === selectedProject)!;

      // Open in VS Code
      this.log(`Opening ${projectToOpen.name} in VS Code...`);
      await openProjectInVSCode(projectToOpen.path, flags.new);
      this.log(`✓ Opened ${projectToOpen.name} in VS Code`);

    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to open project: ${error.message}`);
      } else {
        this.error(`Failed to open project: ${error}`);
      }
    }
  }
}