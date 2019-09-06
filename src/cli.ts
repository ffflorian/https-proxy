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
  .description(description)
  .option('-p, --password <password>', 'set the password', 'password')
  .option('-P, --port <port>', 'set the port', 8080)
  .option('-t, --target <url>', 'set the target URL')
  .option('-u, --username <username>', 'set the username', 'username')
  .version(version, '-v, --version')
  .parse(process.argv);

new HttpsProxy({
  ...(program.password && {password: program.password}),
  ...(program.port && {port: program.port}),
  ...(program.target && {target: program.target}),
  ...(program.username && {username: program.username}),
}).start();
