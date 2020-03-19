#!/usr/bin/env node

import * as program from 'commander';
import * as fs from 'fs';
import * as path from 'path';

import {HttpsProxy} from './HttpsProxy';

const defaultPackageJsonPath = path.join(__dirname, 'package.json');
const packageJsonPath = fs.existsSync(defaultPackageJsonPath)
  ? defaultPackageJsonPath
  : path.join(__dirname, '../package.json');

const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
const {description, name, version}: {description: string; name: string; version: string} = JSON.parse(packageJson);

program
  .name(name.replace(/^@[^/]+\//, ''))
  .description(`${description}\nIf password and username are not set, no authentication will be required.`)
  .option('-p, --password <password>', 'set the password')
  .option('-P, --port <port>', 'set the port', '8080')
  .option('-t, --target <url>', 'set the target URL to forward users to')
  .option('-u, --username <username>', 'set the username')
  .version(version, '-v, --version')
  .parse(process.argv);

if ((program.password && !program.username) || (!program.password && program.username)) {
  console.error('Password and username are both required for authentication.');
  program.outputHelp();
  process.exit(1);
}

new HttpsProxy({
  ...(program.password && {password: program.password}),
  ...(program.port && {port: program.port}),
  ...(program.target && {target: program.target}),
  ...(program.username && {username: program.username}),
}).start();
