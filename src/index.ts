#!/usr/bin/env node

import { YeelightService } from "yeelight-service";
const yeelightService = new YeelightService();
import { Command } from "commander";
const program = new Command();

console.info(
  "⚠️  Make sure you enabled the LAN Control option in the Yeelight app."
);

program
  .command("list")
  .description("Show the connected devices")
  .action(() => {
    yeelightService.devices.subscribe((devices) => {
      console.log(devices.map((device) => device.id));
    });
  });

program.parse(process.argv);
