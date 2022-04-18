#! /usr/bin/env node

import { Command } from "commander";
import { SolidClient } from "./SolidClient";
import { SolidOidcOnlyAuthenticator } from "./SolidOidcOnlyAuthenticator";
import { statSync, mkdirSync } from "fs";
import { homedir } from "os";

//import * as process from 'process';
const program = new Command();
const home = homedir();
const tokenDir = `${home}/.solcli`;
try {
  statSync(tokenDir);
} catch (err) {
  mkdirSync(tokenDir);
}

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
    const solidClient = new SolidClient(tokenDir);
    const { body } = await solidClient.get(url);
    process.stdout.write(body);
  });

program
  .command('login-pod')
  .description('login to a specific solid pod')
  .argument('<url>', 'the pod URL to login for')
  .action((url) => {
    const solidClient = new SolidClient(tokenDir);
    solidClient.get(url);
  });

program
  .command('login-oidc')
  .description('choose and login to a solid pod by first authenticating with a SOLID OIDC server')
  .argument('<url>', 'the SOLID OIDC URL to login with')
  .action((url) => {
    throw new Error("login-oidc unimplemented");
    //const authenticator = new SolidOidcOnlyAuthenticator(url);
  });

program
  .command('login-webid')
  .description('choose and login to a solid pod by first retrieving a WebID')
  .argument('<url>', 'the WebID URL to pick SOLID pods from')
  .action((url) => {
    throw new Error("login-webid unimplemented");
    //const authenticator = new SolidOidcOnlyAuthenticator(url);
  });

program.parse();