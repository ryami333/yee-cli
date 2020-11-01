#!/usr/bin/env node

import { Yeelight } from "ts-node-yeelight";

const yeelight = new Yeelight();

yeelight.discover().then(() => {
  console.log(yeelight.devices);
});
