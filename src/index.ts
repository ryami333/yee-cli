import { YeelightService } from "yeelight-service";
import {
  IYeelightDevice,
  IYeelightMethodResponse,
} from "yeelight-service/lib/yeelight.interface";
import { Command } from "commander";
import chalk from "chalk";
import { filter, first, timeout, retry } from "rxjs/operators";
import inquirer from "inquirer";
import { rgb } from "polished";

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
    .pipe(timeout(500))
    .pipe(retry(5))
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
      devices.map((device) =>
        attemptDeviceCommand(() => device.setPower("off", "smooth"))
      )
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

async function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function attemptDeviceCommand(
  fn: () => Promise<IYeelightMethodResponse>
): Promise<IYeelightMethodResponse> {
  const response = await fn();

  if (response.status === 410) {
    console.log(response.status);
    await sleep(200);
    return attemptDeviceCommand(fn);
  }

  return response;
}

program
  .command("on")
  .description("Turn on all connected devices")
  .action(async () => {
    const devices = await getDevices();

    console.log(`Turning on ${devices.length} devices…`);
    const responses = await Promise.all(
      devices.map((device) =>
        attemptDeviceCommand(() => device.setPower("on", "smooth"))
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

type DeviceOperationCallback = (
  device: IYeelightDevice
) => Promise<IYeelightMethodResponse>[];

program
  .command("preset")
  .description("Set devices to the chosen preset")
  .action(async () => {
    const { preset } = await inquirer.prompt<{
      preset: DeviceOperationCallback;
    }>([
      {
        name: "preset",
        type: "list",
        message: "Choose preset",
        choices: [
          // https://andi-siess.de/rgb-to-color-temperature/
          {
            name: "4271K - Neutral",
            value: (device: IYeelightDevice) => [
              device.setPower("on", "smooth"),
              device.setColorTemperature(4271),
              device.setBrightness(100),
            ],
          },
          {
            name: "2985K - Warm",
            value: (device: IYeelightDevice) => [
              device.setPower("on", "smooth"),
              device.setColorTemperature(2985),
              device.setBrightness(100),
            ],
          },
          {
            name: "1700K - Warm",
            value: (device: IYeelightDevice) => [
              device.setPower("on", "smooth"),
              device.setRgb(rgb(255, 121, 0)),
              device.setBrightness(100),
            ],
          },
        ],
      },
    ]);

    const devices = await getDevices();

    console.log(`Updating ${devices.length} devices…`);

    const responses = await Promise.all(
      devices
        .map((device): Promise<IYeelightMethodResponse>[] => preset(device))
        .flat()
    );

    console.log(responses);

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
      devices
        .map((device): Promise<IYeelightMethodResponse>[] => {
          return [
            attemptDeviceCommand(() => device.setColorTemperature(4271)),
            attemptDeviceCommand(() => device.setBrightness(100)),
          ];
        })
        .flat()
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
            attemptDeviceCommand(() => device.setRgb("#FF7900")),
            attemptDeviceCommand(() => device.setBrightness(100)),
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
