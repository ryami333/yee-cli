#!/usr/bin/env node

import { Yeelight } from "ts-node-yeelight";
import { Command } from "commander";
const program = new Command();
const yeelight = new Yeelight();

program
  .command("list")
  .description("Show the connected devices")
  .action(() =>
    yeelight.discover().then(() => {
      console.log(yeelight.devices);
    })
  );
