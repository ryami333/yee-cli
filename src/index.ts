import { YeelightService } from "yeelight-service";
import {
  IYeelightDevice,
  IYeelightMethodResponse,
} from "yeelight-service/lib/yeelight.interface";
import { Command } from "commander";
import chalk from "chalk";
import { filter, first } from "rxjs/operators";

const yeelightService = new YeelightService();
const program = new Command();

/*
 * ⚠️ Make sure you enabled the LAN Control option in the Yeelight app.
 */

async function getDevices(): Promise<IYeelightDevice[]> {
  const devices = await yeelightService.devices
    .asObservable()
    .pipe(filter((devices) => devices.length === 4))
    .pipe(first())
    .toPromise();

  return devices;
}

program
  .command("list")
  .description("Show the connected devices")
  .action(async () => {
    const devices = await getDevices();

    console.log(
      devices.map((device) => ({
        id: device.id,
        colorTemperature: device.colorTemperature.value,
        rgb: device.rgb.value,
        brightness: device.brightness.value,
      }))
    );

    process.exit(1);
  });

program
  .command("off")
  .description("Turn off all connected devices")
  .action(async () => {
    const devices = await getDevices();

    console.log(`Turning off ${devices.length} devices…`);

    const responses = await Promise.all(
      devices.map((device) => device.setPower("off", "smooth"))
    );

    if (responses.every((response) => response.status === 200)) {
      console.log(chalk.green("Done with no errors"));
      process.exit(1);
      return;
    }

    const errorMessages = responses
      .map((response) => response.errorMessage)
      .filter(Boolean);

    console.log(chalk.red(`Done with errors:\n${errorMessages.join("\n")}`));
    process.exit(2);
  });

program
  .command("on")
  .description("Turn on all connected devices")
  .action(async () => {
    const devices = await getDevices();

    console.log(`Turning on ${devices.length} devices…`);

    const responses = await Promise.all(
      devices.map((device) => device.setPower("on", "smooth"))
    );

    if (responses.every((response) => response.status === 200)) {
      console.log(chalk.green("Done with no errors"));
      process.exit(1);
    }

    const errorMessages = responses
      .map((response) => response.errorMessage)
      .filter(Boolean);

    console.log(chalk.red(`Done with errors:\n${errorMessages.join("\n")}`));

    process.exit(2);
  });

program
  .command("neutral")
  .description("Set devices to neutral white light")
  .action(async () => {
    const devices = await getDevices();

    console.log(`Updating ${devices.length} devices…`);

    const responses = await Promise.all(
      devices.reduce(
        (
          carry: Promise<IYeelightMethodResponse>[],
          device
        ): Promise<IYeelightMethodResponse>[] => {
          return [
            ...carry,
            device.setColorTemperature(4271),
            device.setBrightness(100),
          ];
        },
        []
      )
    );

    if (responses.every((response) => response.status === 200)) {
      console.log(chalk.green("Done with no errors"));
      process.exit(1);
    }

    const errorMessages = responses
      .map((response) => response.errorMessage)
      .filter(Boolean);

    console.log(chalk.red(`Done with errors:\n${errorMessages.join("\n")}`));
    process.exit(2);
  });

program
  .command("warm")
  .description("Set devices to warm white light")
  .action(async () => {
    const devices = await getDevices();

    console.log(`Updating ${devices.length} devices…`);

    const responses = await Promise.all(
      devices.reduce(
        (
          carry: Promise<IYeelightMethodResponse>[],
          device
        ): Promise<IYeelightMethodResponse>[] => {
          return [
            ...carry,
            device.setRgb("#FF7900"),
            device.setBrightness(100),
          ];
        },
        []
      )
    );

    if (responses.every((response) => response.status === 200)) {
      console.log(chalk.green("Done with no errors"));
      process.exit(1);
    }

    const errorMessages = responses
      .map((response) => response.errorMessage)
      .filter(Boolean);

    console.log(chalk.red(`Done with errors:\n${errorMessages.join("\n")}`));
    process.exit(2);
  });

program.parseAsync(process.argv);
