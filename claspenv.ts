#!/usr/bin/env node

/**
 * This tool helps manage multiple environments (local, dev, stage, prod) for Google Apps Script projects
 * using the clasp tool.
 */

import * as fs from 'fs-extra';
import * as process from 'process';
import * as child_process from 'child_process';
import arg from 'arg';
import * as readline from 'readline';

// Define types for better code clarity
type ConfigData = {
  [key: string]: {
    script_id: string;
  };
};

type ClaspData = {
  scriptId?: string;
};

/**
 * Load configuration from JSON file
 * @param configFilePath Path to the configuration file
 * @returns Configuration data or empty object if file doesn't exist
 */
function loadConfig(configFilePath: string): ConfigData {
  try {
    if (!fs.existsSync(configFilePath)) {
      return {};
    }
    const fileContent = fs.readFileSync(configFilePath, 'utf-8');
    return JSON.parse(fileContent) || {};
  } catch (error) {
    console.error(`Error loading config from ${configFilePath}:`, error);
    return {};
  }
}

/**
 * Save configuration to JSON file
 * @param configFilePath Path to the configuration file
 * @param configData Configuration data to save
 */
function saveConfig(configFilePath: string, configData: ConfigData): void {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(configData, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error saving config to ${configFilePath}:`, error);
    process.exit(1);
  }
}

/**
 * Get the target script ID based on environment
 * @param environment Environment name (local, dev, stage, prod)
 * @param configData Configuration data
 * @returns Script ID for the environment or empty string if not found
 */
function getTargetScriptId(environment: string, configData: ConfigData): string {
  const envConfig = configData[environment];
  return envConfig?.script_id || '';
}

/**
 * Initialize the configuration files with blank values
 */
async function initConfigFiles(): Promise<void> {
  // Check if this is a clasp project by verifying .clasp.json exists
  const claspJsonPath = '.clasp.json';
  if (!fs.existsSync(claspJsonPath)) {
    console.error(
      'Error: .clasp.json file not found. This is not a clasp project. Please run this command in a clasp project directory.'
    );
    process.exit(1);
  }

  // Check if this is a git repository
  let isGitRepo = false;
  try {
    // Check if .git directory exists
    if (fs.existsSync('.git')) {
      isGitRepo = true;
    }
  } catch (error) {
    // Ignore errors
  }

  // Check for existing clasp configuration files
  const configFiles = [
    '.claspenv.config.json',
    '.claspenv.config.local.json',
  ];

  const existingFiles = configFiles.filter(f => fs.existsSync(f));

  if (existingFiles.length > 0) {
    console.log('Warning: Existing claspenv configuration files detected.');
    const response = await promptUser('Do you want to overwrite previous configuration? (y/N): ');
    if (!response.toLowerCase().startsWith('y')) {
      console.log('Initialization cancelled.');
      process.exit(0);
    }
  }

  // Create the base config file
  const baseConfig = {
    dev: { script_id: '' },
    stage: { script_id: '' },
    prod: { script_id: '' },
  };

  saveConfig('.claspenv.config.json', baseConfig);

  // Create the local example file
  const exampleConfig = {
    local: {
      script_id: 'Put the id for your \'local\' version of the apps script project here and rename to .claspenv.config.local.json',
    },
  };

  saveConfig('.claspenv.config.local.example.json', exampleConfig);

  // If this is a git repository, check for dev, stage, and prod branches
  if (isGitRepo) {
    console.log('This is a git repository. Checking for required branches...');
    const requiredBranches = ['dev', 'stage', 'prod'];
    const existingBranches: string[] = [];

    try {
      // Get all local branches
      const result = child_process.spawnSync('git', ['branch', '--list'], {
        encoding: 'utf-8',
      });

      if (result.status === 0) {
        for (const line of result.stdout.split('\n')) {
          const branch = line.trim().replace(/\* /, '').trim();
          if (branch && !['master', 'main'].includes(branch)) {
            existingBranches.push(branch);
          }
        }
      }

      // Get all remote branches
      try {
        const result = child_process.spawnSync('git', ['branch', '-r'], {
          encoding: 'utf-8',
        });
        if (result.status === 0) {
          for (const line of result.stdout.split('\n')) {
            if (line.includes('origin/')) {
              const branch = line.trim().replace('origin/', '').trim();
              if (branch && !['master', 'main'].includes(branch)) {
                existingBranches.push(branch);
              }
            }
          }
        }
      } catch (error) {
        console.log('Problem with git when getting remote branches')
      }

      // Check which required branches are missing
      const missingBranches = requiredBranches.filter(b => !existingBranches.includes(b));

      if (missingBranches.length > 0) {
        console.log(`Missing branches: ${missingBranches.join(', ')}`);
        const response = await promptUser('Do you want to create these branches? (y/N): ');
        if (response.toLowerCase().startsWith('y')) {
          for (const branch of missingBranches) {
            console.log(`Creating branch: ${branch}`);
            try {
              const result = child_process.spawnSync('git', ['checkout', '-b', branch], {
                encoding: 'utf-8',
              });
              if (result.status === 0) {
                console.log(`Branch '${branch}' created successfully`);
              } else {
                console.error(`Error creating branch '${branch}': ${result.stderr}`);
              }
            } catch (error) {
              console.error(`Error creating branch '${branch}': ${error}`);
            }
          }

          // Push new branches to remote
          console.log('Pushing new branches to remote repository...');
          try {
            const result = child_process.spawnSync(
              'git',
              ['push', '--set-upstream', 'origin', 'dev', 'stage', 'prod'],
              { encoding: 'utf-8' }
            );
            if (result.status === 0) {
              console.log('Branches pushed to remote successfully');
            } else {
              console.error(`Warning: Could not push branches to remote: ${result.stderr}`);
            }
          } catch (error) {
            console.error(`Warning: Could not push branches to remote: ${error}`);
          }
        } else {
          console.log('Branch creation cancelled.');
        }
      } else {
        console.log('All required branches (dev, stage, prod) already exist.');
      }
    } catch (error) {
      console.error(`Error checking branches: ${error}`);
    }

    // After creating branches, ask for script IDs for dev, stage, and prod
    console.log('\nPlease enter the script IDs for your environments:');
    const devScriptId = await promptUser('Dev environment script ID: ');
    const stageScriptId = await promptUser('Stage environment script ID: ');
    const prodScriptId = await promptUser('Prod environment script ID: ');

    // Load existing config data to update it
    let configData: ConfigData = {};
    const baseConfigPath = '.claspenv.config.json';
    if (fs.existsSync(baseConfigPath)) {
      configData = loadConfig(baseConfigPath);
    }

    // Update the config with the provided script IDs
    const devConfig = configData['dev'] || { script_id: '' };
    devConfig.script_id = devScriptId;
    configData['dev'] = devConfig;

    const stageConfig = configData['stage'] || { script_id: '' };
    stageConfig.script_id = stageScriptId;
    configData['stage'] = stageConfig;

    const prodConfig = configData['prod'] || { script_id: '' };
    prodConfig.script_id = prodScriptId;
    configData['prod'] = prodConfig;

    // Save the updated config
    saveConfig(baseConfigPath, configData);
    console.log('Script IDs have been saved to .claspenv.config.json');

    // Ask user if they want to make a configuration commit
    console.log('\nConfiguration files have been initialized with script IDs.');
    const response = await promptUser('Do you want to make a configuration commit? (y/N): ');
    if (response.toLowerCase().startsWith('y')) {
      try {
        // Switch to dev branch
        console.log('Switching to dev branch...');
        const result = child_process.spawnSync('git', ['checkout', 'dev'], {
          encoding: 'utf-8',
        });
        if (result.status === 0) {
          console.log('Switched to dev branch.');
        } else {
          console.error(`Error switching to dev branch: ${result.stderr}`);
          process.exit(1);
        }

        // Add configuration file
        console.log('Adding configuration file to commit...');
        const addResult = child_process.spawnSync('git', ['add', '.claspenv.config.json'], {
          encoding: 'utf-8',
        });
        if (addResult.status !== 0) {
          console.error(`Error adding file: ${addResult.stderr}`);
          process.exit(1);
        }

        // Commit with a message indicating claspenv initialization
        const commitMessage = 'Initialized claspenv configuration';
        console.log(`Committing with message: ${commitMessage}`);
        const commitResult = child_process.spawnSync(
          'git',
          ['commit', '--allow-empty', '-m', commitMessage],
          { encoding: 'utf-8' }
        );
        if (commitResult.status === 0) {
          console.log('Configuration commit created successfully.');
        } else {
          console.error(`Error during commit: ${commitResult.stderr}`);
          process.exit(1);
        }

        // Push to remote
        console.log('Pushing to remote repository...');
        const pushResult = child_process.spawnSync('git', ['push', 'origin', 'dev'], {
          encoding: 'utf-8',
        });
        if (pushResult.status === 0) {
          console.log('Configuration pushed to remote successfully.');
        } else {
          console.error(`Error pushing to remote: ${pushResult.stderr}`);
          process.exit(1);
        }
      } catch (error) {
        console.error(`Error during git operations: ${error}`);
        console.log('Configuration commit was not completed.');
        process.exit(1);
      }
    }
  }

  // Update .gitignore if it exists and the local config isn't already present
  const gitignorePath = '.gitignore';
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

    const localConfigFile = '.claspenv.config.local.json';
    if (!gitignoreContent.includes(localConfigFile)) {
      fs.appendFileSync(gitignorePath, `\n# Clasp Local Environment Files\n${localConfigFile}\n`);
      console.log('Updated .gitignore with local config file');
    }
  }

  console.log(
    "Initialized configuration"
  );
}

/**
 * Initialize local configuration with script ID
 */
async function localInit(): Promise<void> {
  // Check if this is a clasp project by verifying .clasp.json exists
  const claspJsonPath = '.clasp.json';
  if (!fs.existsSync(claspJsonPath)) {
    console.error(
      'Error: .clasp.json file not found. This is not a clasp project. Please run this command in a clasp project directory.'
    );
    process.exit(1);
  }

  // Check if the example config file exists
  const exampleConfigPath = '.claspenv.config.local.example.json';
  if (!fs.existsSync(exampleConfigPath)) {
    console.error(
      'Error: Initial configuration files not found. Please run \'claspenv --init\' first to create them.'
    );
    process.exit(1);
  }

  // Ask user for the local script ID
  const scriptId = await promptUser('Enter the script ID for your local project: ');
  if (!scriptId) {
    console.error('Error: Script ID cannot be empty.');
    process.exit(1);
  }

  // Copy the example config file to the local config file
  const localConfigPath = '.claspenv.config.local.json';
  try {
    fs.copySync(exampleConfigPath, localConfigPath);
    console.log(`Copied ${exampleConfigPath} to ${localConfigPath}`);
  } catch (error) {
    console.error(`Error copying example config file: ${error}`);
    process.exit(1);
  }

  // Update the local script ID in the copied config file
  try {
    // Load the config file
    let configData = loadConfig(localConfigPath);

    // Update the local script ID
    const localConfig = configData['local'] || { script_id: '' };
    localConfig.script_id = scriptId;
    configData['local'] = localConfig;

    // Save the updated config
    saveConfig(localConfigPath, configData);
    console.log(`Updated local script ID to: ${scriptId}`);
  } catch (error) {
    console.error(`Error updating config file: ${error}`);
    process.exit(1);
  }

  console.log('Local configuration initialized successfully.');
}

/**
 * Prompt user for input (async function to handle stdin)
 * @param question Question to ask user
 * @returns User input
 */
async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Main function that handles command line arguments and executes appropriate actions
 */
async function main(): Promise<void> {
  // Parse command line arguments using arg library
  const args = arg({
    '--init': Boolean,
    '--local-init': Boolean,
    '--help': Boolean,
    '-h': '--help',
    '--version': Boolean,
    '-v': '--version',
  }, {
    permissive: true,
  });

  // Handle version flag
  if (args['--version']) {
    console.log('0.1.0');
    return;
  }

  // Handle help flag
  if (args['--help']) {
    console.log(`
Usage: claspenv [options] [action] [environment]

Manage Google Apps Script environments

Options:
  --init          Initialize configuration files
  --local-init    Initialize local configuration with script ID
  --help, -h      Show this help message
  --version, -v   Show version

Actions:
  push            Push to environment
  pull            Pull from environment

Environments:
  local           Local environment
  dev             Development environment
  stage           Staging environment
  prod            Production environment

Examples:
  claspenv --init
  claspenv --local-init
  claspenv pull dev
  claspenv push prod
    `);
    return;
  }

  // Handle init command
  if (args['--init']) {
    await initConfigFiles();
    return;
  }

  // Handle local-init command
  if (args['--local-init']) {
    await localInit();
    return;
  }

  // Get action and environment from remaining arguments
  const action = args._[0];
  const environment = args._[1];

  // Validate arguments
  if (!action || !environment) {
    console.error('Error: Action and environment are required');
    console.log('Use --help for usage information');
    process.exit(1);
  }

  // Validate action
  if (action !== 'push' && action !== 'pull') {
    console.error("Error: Action must be 'push' or 'pull'");
    process.exit(1);
  }

  // Validate environment
  if (!['local', 'dev', 'stage', 'prod'].includes(environment)) {
    console.error("Error: Environment must be 'local', 'dev', 'stage', or 'prod'");
    process.exit(1);
  }

  // Read original scriptId from .clasp.json
  const claspJsonPath = '.clasp.json';
  if (!fs.existsSync(claspJsonPath)) {
    console.error('Error: .clasp.json file not found');
    process.exit(1);
  }

  const claspData: ClaspData = fs.readJSONSync(claspJsonPath);

  // Store original script id
  const originalScriptId = claspData.scriptId || '';

  // Load configuration data
  let configData: ConfigData = {};

  // Load local config if it exists
  const localConfigPath = '.claspenv.config.local.json';
  if (fs.existsSync(localConfigPath)) {
    configData = { ...configData, ...loadConfig(localConfigPath) };
  }

  // Load base config if it exists
  const baseConfigPath = '.claspenv.config.json';
  if (fs.existsSync(baseConfigPath)) {
    configData = { ...configData, ...loadConfig(baseConfigPath) };
  }

  // If no config files found, warn the user
  if (Object.keys(configData).length === 0) {
    console.error(
      'Warning: No configuration files found. Please run \'claspenv --init\' to create them.'
    );
    process.exit(1);
  }

  // Get the target scriptId based on environment
  const targetScriptId = getTargetScriptId(environment, configData);

  if (!targetScriptId) {
    console.error(`Error: No scriptId found for ${environment} environment`);
    process.exit(1);
  }

  // Add confirmation for dev, stage, and prod environments on push actions only
  let shouldContinue = true;
  if (['dev', 'stage', 'prod'].includes(environment) && action === 'push') {
    const confirmation = await promptUser(
      `Are you sure you want to ${action} to the ${environment} environment? (y/N): `
    );
    if (!confirmation.toLowerCase().startsWith('y')) {
      console.log(`Cancelled ${action} to ${environment} environment.`);
      shouldContinue = false;
    }
  }

  // Only proceed with changes and clasp command if we should continue
  if (shouldContinue) {
    console.log(
      `Setting up for ${environment} environment scriptId: ${targetScriptId}`
    );

    // Update .clasp.json with target scriptId only if user confirmed
    console.log(`Updating .clasp.json with scriptId: ${targetScriptId}`);
    claspData.scriptId = targetScriptId;
    fs.writeJSONSync(claspJsonPath, claspData, { spaces: 2 });

    // Run the clasp command
    console.log(`Running clasp ${action}...`);
    try {
      const result = child_process.spawnSync('clasp', [action], {
        stdio: 'inherit',
      });
      if (result.status !== 0) {
        console.error(`Error running clasp ${action}: ${result.stderr}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error running clasp ${action}: ${error}`);
      console.error('Error: clasp command not found. Please install clasp with \'npm install -g @google/clasp\'');
      process.exit(1);
    }

    // Reset .clasp.json back to original scriptId (always run this cleanup)
    console.log(`Resetting .clasp.json back to original scriptId: ${originalScriptId}`);
    claspData.scriptId = originalScriptId;
    fs.writeJSONSync(claspJsonPath, claspData, { spaces: 2 });

    console.log(`Completed ${action} for ${environment} environment`);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
