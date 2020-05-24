#!/usr/bin/env node

import * as commander from 'commander';
import * as fs from 'fs';
import * as path from 'path';

import {HttpsProxy} from './HttpsProxy';

const defaultPackageJsonPath = path.join(__dirname, 'package.json');
const packageJsonPath = fs.existsSync(defaultPackageJsonPath)
  ? defaultPackageJsonPath
  : path.join(__dirname, '../package.json');

const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
const {description, name, version}: {description: string; name: string; version: string} = JSON.parse(packageJson);

commander
  .name(name.replace(/^@[^/]+\//, ''))
  .description(`${description}\nIf password and username are not set, no authentication will be required.`)
  .option('-p, --password <password>', 'set the password')
  .option('-P, --port <port>', 'set the port', '8080')
  .option('-t, --target <url>', 'set the target URL to forward users to')
  .option('-u, --username <username>', 'set the username')
  .version(version, '-v, --version')
  .parse(process.argv);

if ((commander.password && !commander.username) || (!commander.password && commander.username)) {
  console.error('Password and username are both required for authentication.');
  commander.outputHelp();
  process.exit(1);
}

new HttpsProxy({
  ...(commander.password && {password: commander.password}),
  ...(commander.port && {port: commander.port}),
  ...(commander.target && {target: commander.target}),
  ...(commander.username && {username: commander.username}),
}).start();
