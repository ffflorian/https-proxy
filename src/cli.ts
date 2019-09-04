#!/usr/bin/env node

import * as program from 'commander';
import * as logdown from 'logdown';

import {HttpsProxy} from './HttpsProxy';

const {description, name, version} = require('../package.json');

const logger = logdown('https-proxy/cli', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

program
  .name(name.replace(/^@[^/]+\//, ''))
  .description(description)
  .option('-c, --challenge', 'ask the client for username and password')
  .option('-p, --password <password>', 'set a password (needs username)')
  .option('-P, --port <port>', 'set the port', 8080)
  .option('-r, --redirect <url>', 'set the redirection URL')
  .option('-u, --username <username>', 'set a username (needs password)')
  .version(version, '-v, --version')
  .parse(process.argv);

if ((program.password && !program.username) || (!program.password && program.username)) {
  logger.error('Username and password are both needed for authentication.');
  program.outputHelp();
  process.exit(1);
}

const httpsProxy = new HttpsProxy({
  ...(program.password &&
    program.username && {
      auth: {
        challenge: !!program.challenge,
        password: program.password,
        username: program.username,
      },
    }),
  ...(program.port && {port: program.port}),
  ...(program.redirect && {redirectUrl: program.redirect}),
  ...(program.username && {username: program.username}),
});

process.on('SIGINT', async () => {
  logger.log(`Received "SIGINT" signal. Exiting.`);
  try {
    await httpsProxy.stop();
  } catch (error) {
    logger.error(error);
  }
  process.exit();
});

process.on('SIGTERM', async () => {
  logger.log(`Received "SIGTERM" signal. Exiting.`);
  try {
    await httpsProxy.stop();
  } catch (error) {
    logger.error(error);
  }
  process.exit();
});

httpsProxy.start().catch(error => logger.error(error));
