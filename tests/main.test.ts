import * as fs from 'fs-extra';
import {
  getTargetScriptId,
  loadConfig,
  saveConfig,
  isClaspProject,
} from '../src/main';

// Mock fs-extra to avoid file system operations during tests
jest.mock('fs-extra');

// mock process.exit so that we can test for outgoing exit and codes
let mockExit: any;

describe('claspenv functions', () => {
  beforeEach(() => {
    // Clear all mocks before each test case
    jest.clearAllMocks();

    // Spy on process.exit and replace with a mock that throws a string
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`Process.exit called with code: ${code}`);
    });
  });

  afterEach(() => {
    // Restore the original process.exit mock function
    mockExit.mockRestore();
  });

  describe('isClaspProject', () => {
    it('should return true when .clasp.json exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = isClaspProject();

      expect(result).toBe(true);
    });

    it('should return false when .clasp.json does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = isClaspProject();

      expect(result).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('should return empty object when config file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = loadConfig('./nonexistent.json');

      expect(result).toEqual({});
    });

    it('should return parsed config data when file exists and is valid JSON', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        '{"dev": {"script_id": "DEV_SCRIPT_ID"}}',
      );

      const result = loadConfig('./config.json');

      expect(result).toEqual({ dev: { script_id: 'DEV_SCRIPT_ID' } });
    });

    it('should return empty object when JSON parsing fails', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const result = loadConfig('./config.json');

      expect(result).toEqual({});
    });
  });

  describe('saveConfig', () => {
    it('should save config data to file', () => {
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      const configData = { dev: { script_id: 'DEV_SCRIPT_ID' } };

      saveConfig('./config.json', configData);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        './config.json',
        JSON.stringify(configData, null, 2),
        'utf-8',
      );
    });

    it('should handle errors during saveConfig', () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Error Saving Config');
      });

      const configData = { dev: { script_id: 'DEV_SCRIPT_ID' } };

      expect(() => saveConfig('./config.json', configData)).toThrow();
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('getTargetScriptId', () => {
    it('should return script_id for existing environment', () => {
      const configData = {
        dev: { script_id: 'DEV_SCRIPT_ID' },
        stage: { script_id: 'STAGE_SCRIPT_ID' },
        prod: { script_id: 'PROD_SCRIPT_ID' },
      };

      const result = getTargetScriptId('dev', configData);

      expect(result).toBe('DEV_SCRIPT_ID');
    });

    it('should return empty string for non-existent environment', () => {
      const configData = {
        dev: { script_id: 'DEV_SCRIPT_ID' },
      };
      const result = getTargetScriptId('prod', configData);

      expect(result).toBe('');
    });

    it('should return empty string when environment has no script_id', () => {
      const configData = {
        dev: { script_id: '' },
      };

      const result = getTargetScriptId('dev', configData);

      expect(result).toBe('');
    });
  });
});
