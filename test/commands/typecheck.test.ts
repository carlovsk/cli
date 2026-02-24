import {runCommand} from '@oclif/test';

// Mock dependencies
jest.mock('../../src/lib/services');
jest.mock('../../src/lib/runner');

const {discoverServices, validateServices, getServicesByNames} = require('../../src/lib/services');
const {runCommandsOnServices} = require('../../src/lib/runner');

describe('typecheck command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('--all flag', () => {
    it('should run typecheck on all services', async () => {
      const mockServices = [
        {name: 'billing', path: '/path/to/billing'},
        {name: 'store', path: '/path/to/store'},
      ];
      discoverServices.mockReturnValue(mockServices);
      runCommandsOnServices.mockResolvedValue([
        {service: 'billing', success: true, duration: 1.5},
        {service: 'store', success: true, duration: 2.0},
      ]);

      await runCommand(['typecheck', '--all']);

      expect(discoverServices).toHaveBeenCalled();
      expect(runCommandsOnServices).toHaveBeenCalledWith(mockServices, {
        command: 'npm',
        args: ['run', 'typecheck'],
        description: 'typecheck',
        parallel: false,
      });
    });

    it('should error when no services found with --all', async () => {
      discoverServices.mockReturnValue([]);

      const {error} = await runCommand(['typecheck', '--all']);

      expect(error?.message).toContain('No services found');
    });

    it('should run in parallel when --all --parallel flags are used', async () => {
      const mockServices = [{name: 'billing', path: '/path/to/billing'}];
      discoverServices.mockReturnValue(mockServices);
      runCommandsOnServices.mockResolvedValue([
        {service: 'billing', success: true, duration: 1.5},
      ]);

      await runCommand(['typecheck', '--all', '--parallel']);

      expect(runCommandsOnServices).toHaveBeenCalledWith(mockServices, {
        command: 'npm',
        args: ['run', 'typecheck'],
        description: 'typecheck',
        parallel: true,
      });
    });
  });

  describe('--services flag', () => {
    it('should run typecheck on specified services', async () => {
      const mockServices = [
        {name: 'billing', path: '/path/to/billing'},
        {name: 'store', path: '/path/to/store'},
      ];
      validateServices.mockReturnValue({valid: true});
      getServicesByNames.mockReturnValue(mockServices);
      runCommandsOnServices.mockResolvedValue([
        {service: 'billing', success: true, duration: 1.5},
        {service: 'store', success: true, duration: 2.0},
      ]);

      await runCommand(['typecheck', '--services', 'billing,store']);

      expect(validateServices).toHaveBeenCalledWith(['billing', 'store']);
      expect(getServicesByNames).toHaveBeenCalledWith(['billing', 'store']);
      expect(runCommandsOnServices).toHaveBeenCalledWith(mockServices, {
        command: 'npm',
        args: ['run', 'typecheck'],
        description: 'typecheck',
        parallel: false,
      });
    });

    it('should handle comma-separated services with spaces', async () => {
      validateServices.mockReturnValue({valid: true});
      getServicesByNames.mockReturnValue([]);
      runCommandsOnServices.mockResolvedValue([]);

      await runCommand(['typecheck', '--services', ' billing , store , user ']);

      expect(validateServices).toHaveBeenCalledWith(['billing', 'store', 'user']);
    });

    it('should error when invalid services are specified', async () => {
      validateServices.mockReturnValue({
        valid: false,
        invalidServices: ['invalid'],
        availableServices: ['billing', 'store'],
      });

      const {error} = await runCommand(['typecheck', '--services', 'billing,invalid']);

      expect(error?.message).toContain('Invalid services: invalid');
      expect(error?.message).toContain('Available services: billing, store');
    });
  });

  describe('exit codes', () => {
    it('should exit with code 0 when all services pass', async () => {
      const mockServices = [{name: 'billing', path: '/path/to/billing'}];
      discoverServices.mockReturnValue(mockServices);
      runCommandsOnServices.mockResolvedValue([
        {service: 'billing', success: true, duration: 1.5},
      ]);

      const {error} = await runCommand(['typecheck', '--all']);

      expect(error).toBeUndefined();
    });

    it('should exit with code 1 when any service fails', async () => {
      const mockServices = [{name: 'billing', path: '/path/to/billing'}];
      discoverServices.mockReturnValue(mockServices);
      runCommandsOnServices.mockResolvedValue([
        {service: 'billing', success: false, duration: 1.5},
      ]);

      const {error} = await runCommand(['typecheck', '--all']);

      expect(error?.oclif?.exit).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors from service discovery', async () => {
      discoverServices.mockImplementation(() => {
        throw new Error('Config not found');
      });

      const {error} = await runCommand(['typecheck', '--all']);

      expect(error?.message).toBe('Config not found');
    });
  });
});