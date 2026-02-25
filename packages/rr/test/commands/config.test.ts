import {runCommand} from '@oclif/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Mock the config module
jest.mock('../../src/lib/config');
const {loadConfig, saveConfig, validateProjectRoot} = require('../../src/lib/config');

describe('config command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('show config', () => {
    it('should show message when no config exists', async () => {
      loadConfig.mockReturnValue(null);

      const {stdout} = await runCommand(['config']);

      expect(stdout).toContain('No configuration found');
      expect(stdout).toContain('rr config set projectRoot');
    });

    it('should show current config when it exists', async () => {
      loadConfig.mockReturnValue({projectRoot: '/path/to/project'});

      const {stdout} = await runCommand(['config']);

      expect(stdout).toContain('Current configuration:');
      expect(stdout).toContain('projectRoot: /path/to/project');
    });
  });

  describe('set config', () => {
    it('should require both key and value for set command', async () => {
      const {error} = await runCommand(['config', 'set']);

      expect(error?.message).toContain('Usage: rr config set <key> <value>');
    });

    it('should require value when only key is provided', async () => {
      const {error} = await runCommand(['config', 'set', 'projectRoot']);

      expect(error?.message).toContain('Usage: rr config set <key> <value>');
    });

    it('should reject unknown configuration keys', async () => {
      const {error} = await runCommand(['config', 'set', 'unknownKey', 'value']);

      expect(error?.message).toContain('Unknown configuration key: unknownKey');
    });

    it('should validate project root path', async () => {
      validateProjectRoot.mockReturnValue({
        valid: false,
        error: 'Path does not exist: /invalid/path',
      });

      const {error} = await runCommand(['config', 'set', 'projectRoot', '/invalid/path']);

      expect(error?.message).toBe('Path does not exist: /invalid/path');
      expect(validateProjectRoot).toHaveBeenCalledWith('/invalid/path');
      expect(saveConfig).not.toHaveBeenCalled();
    });

    it('should save valid project root configuration', async () => {
      validateProjectRoot.mockReturnValue({valid: true});

      const {stdout} = await runCommand(['config', 'set', 'projectRoot', '/valid/path']);

      expect(stdout).toContain('Configuration saved: projectRoot = /valid/path');
      expect(validateProjectRoot).toHaveBeenCalledWith('/valid/path');
      expect(saveConfig).toHaveBeenCalledWith({projectRoot: '/valid/path'});
    });
  });
});