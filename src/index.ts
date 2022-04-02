#! /usr/bin/env node

import { Command } from "commander";
import { SolidClient } from "./SolidClient";
import { SolidOidcOnlyAuthenticator } from "./SolidOidcOnlyAuthenticator";
//import * as process from 'process';
const program = new Command();

program
  .name('solcli')
  .version('0.0.1')
  .description('A SOLID CLI app that can login via OIDC and interact with a SOLID server')
  .usage('[options] [command] <argument>');

program
  .command('get')
  .description('get a resource')
  .argument('<url>', 'the resource URL to retrieve')
  .action(async (url) =>  {
    console.log('get', url);
    const solidClient = new SolidClient("abc", "def");
    const { body } = await solidClient.get(url);
    process.stdout.write(body);
  });

program
  .command('login-pod')
  .description('login to a specific solid pod')
  .argument('<url>', 'the pod URL to login for')
  .action((url) => {
    console.log('login', url);
    const solidClient = new SolidClient();
    solidClient.get(url);
  });

program
  .command('login-oidc')
  .description('choose and login to a solid pod by first authenticating with a SOLID OIDC server')
  .argument('<url>', 'the pod URL to login for')
  .action((url) => {
    console.log('login', url);
    const authenticator = new SolidOidcOnlyAuthenticator(url);
  });

program
  .command('login-webid')
  .description('choose and login to a solid pod by first retrieving a WebID')
  .argument('<url>', 'the pod URL to login for')
  .action((url) => {
    console.log('login', url);
    const authenticator = new SolidOidcOnlyAuthenticator(url);
  });

program.parse();