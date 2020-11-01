#!/usr/bin/env node

import { YeelightService } from "yeelight-service";
import {
  IYeelight,
  IYeelightDevice,
  IYeelightMethodResponse,
  YeelightMethodStatusEnum,
} from "yeelight-service/lib/yeelight.interface";
const yeelightService = new YeelightService();
import { Command } from "commander";
const program = new Command();

console.info(
  "⚠️  Make sure you enabled the LAN Control option in the Yeelight app."
);

async function getDevices(): Promise<IYeelightDevice[]> {
  let devices: IYeelightDevice[] = [];

  const subscriber = yeelightService.devices.subscribe((foundDevices) => {
    devices = foundDevices;
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  subscriber.unsubscribe();

  return devices;
}

program
  .command("list")
  .description("Show the connected devices")
  .action(async () => {
    const devices = await getDevices();

    console.log(devices.map((device) => device.id));
  });

program
  .command("off")
  .description("Turn off all connected devices")
  .action(async () => {
    const devices = await getDevices();

    console.log(`Turning off ${devices.length} devices.`);

    const responses = await Promise.all(
      devices.map((device) => device.setPower("off", "smooth"))
    );

    if (responses.every((response) => response.status === 200)) {
      console.log("Done with no errors");
      return;
    }

    const errorMessages = responses
      .map((response) => response.errorMessage)
      .filter(Boolean);

    console.log(`Done with errors:\n${errorMessages.join("/n")}`);
  });

program
  .command("on")
  .description("Turn on all connected devices")
  .action(async () => {
    const devices = await getDevices();

    console.log(`Turning on ${devices.length} devices.`);

    const responses = await Promise.all(
      devices.map((device) => device.setPower("on", "smooth"))
    );

    if (responses.every((response) => response.status === 200)) {
      console.log("Done with no errors");
      return;
    }

    const errorMessages = responses
      .map((response) => response.errorMessage)
      .filter(Boolean);

    console.log(`Done with errors:\n${errorMessages.join("/n")}`);
  });

program.parseAsync(process.argv);
