import { YeelightService } from "yeelight-service";
import {
  IYeelightDevice,
  IYeelightMethodResponse,
} from "yeelight-service/lib/yeelight.interface";
import { Command } from "commander";
import chalk from "chalk";
import { filter, first, timeout, retry } from "rxjs/operators";

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
