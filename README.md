# claspenv

A command-line utility for managing Google Apps Script environments.

## Use at your own risk!

This utility is in early development!

Using this utility incorrectly on an existing project could lead to data loss!

Always back up your existing project first!

No warrantees or guarantees expressed or implied.

Documentation is evolving.

## Description

This tool helps manage multiple environments (currently local, dev, stage, prod) for Google Apps Script projects using the `clasp` tool.

## Installation

### Installing clasp

This project requires `clasp`: https://github.com/google/clasp

```bash
npm install -g @google/clasp
clasp auth login
```

You will be guided through authenticating with Google Drive to allow `clasp` to push and pull code.

### Installing claspenv

Currently this utility must be installed from source:

```bash
git clone https://github.com/GSA-APS/claspenv.git
cd claspenv
npm install
npm run build && npm install -g .
```

## Setting up a Project to use `claspenv`

### GitHub Repository

For a new project, create a new GitHub repository for your project, clone this new repository to your local machine and `cd` to its folder.

Otherwise, start in the repository folder for the project you wish to manage with `claspenv`

### Create Google Apps Script Projects

Ensure you have three separate copies of your project, development, stage, and production. It doesn't matter what they are named or if they are in folders, only the Script IDs matter.

It is recommended to prefix the project names with `DEV_`, `STAGE_`, and `PROD_` as sometimes the end of the project name can be truncated in the UI.

### Gather Script IDs

The Script IDs for these projects can be found under the "Project Settings" gear icon in the project, under the IDs section.

### Initialize Project

Make sure `clasp` is installed. See above.

If you have not cloned your project to the repository, perform:

```bash
clasp clone {Script ID for dev project}
```

Before using `claspenv`, initialize the configuration files:

```bash
claspenv --init
```

First, the git repository is checked for `dev`, `stage` and `prod` branches.

If these branches do not exist, the user is prompted to ask if they want to create them.

Then the user is prompted for the Script IDs for the dev, stage and prod Google Apps Script Projects.

Once those are configured, it prompts the user to create an initialization commit for the new configuration which is then pushed to the remote GitHub repository.

## Setting up to Develop

### Create "Local" copy of Google Apps Script Project

Copy the 'dev' version of the Google Apps Script project to your own Google Drive. Suggest prefixing it "LOCAL_" or something similar.

Find the Script ID under Project Preferences.

### Initialize Local Configuration

```bash
claspenv --local-init
```
This prompts the user for the ID for their local Google Apps Script project.

### Development

Create a branch with git based on `dev`. Make any changes, and push to your `local` environment with `claspenv push local` and deploy as necessary.

When ready, commit with git as normal.

### Code Reviews

Checkout/pull a co-developer's branch and push to `local` to deploy `locally' and test.

### Pushing to Development Environment

Merge your branch into `dev` per team policy, then switch to the `dev` branch and `claspenv push dev` and deploy.

### Pushing to Staging Environment

When `dev` is ready, merge `dev` branch into `stage` branch and `claspenv push stage` and deploy to staging for approval.

### Pushing to Production Environment

When `stage` is approved, merge `stage` into `prod` and create a release branch (e.g. `release-0.1.0`), then switch to this release branch and `claspenv push prod`, then deploy to customer facing environment.

## Deployment

To keep URL consistency, this utility targets a deployment named `claspenv-active`. That way the URL will not change on redeployment.

To deploy to an environment, use `deploy` in the following format:

```bash
claspenv deploy <environment>
```

To push the current branch and deploy to an environment in a single command, use `deploy --pre-push` or `deploy -p` in the following format:

```bash
claspenv deploy --pre-push <environment>
claspenv deploy -p <environment>
```

If no deployments exist, a deployment named `claspenv-active` will be created.

If a deployment named `claspenv-active` exists, it will be redeployed with the currently pushed code. NOTE: This is not the current code on the developer's machine or in the current git branch. The desired environment's updated code must be pushed with `claspenv push <environment>` first.

If deployments exist, but none of them are named `claspenv-active`, a new `claspenv-active` will be created. If you have a currently viewer-facing deployment you would rather use, rename it `claspenv-active` and archive or rename the current `claspenv-active` deployment.

## Manual Procedures

### Manually Configure Environments

Edit `.claspenv.config.json` to set your script IDs for each environment:

```json
{
  "dev": {
    "script_id" : "your-dev-script-id"
  },
  "stage": {
    "script_id" : "your-stage-script-id"
  },
  "prod": {
    "script_id" : "your-prod-script-id"
  }
}
```

Copy `.claspenv.config.local.example.json` to `.claspenv.config.local.json` and edit it to set your script IDs for each environment:

```json
{
  "local": {
    "script_id": "your-local-script-id"
  }
}
```

## Usage Examples

```bash
# Pull from dev environment
claspenv pull dev

# Push to prod environment
claspenv push prod

# Initialize configuration
claspenv --init
```

## Requirements

- `npm`
- [clasp](https://github.com/google/clasp) - Google Apps Script command-line tool
