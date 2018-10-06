# MPR121 Library for Node.js

Access a [MPR121 breakout](https://www.adafruit.com/product/2024) using Node.js from a Raspberry Pi or BeagleBone Black.

## Installation

This library requires [Node.js](https://nodejs.org/) v6.0.0 or higher.

```sh
$ npm install adafruit-mpr121
```

### Detailed Installation for Raspberry Pi

On a Raspberry Pi [configure I2C following these instructions](https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c). E.g.

```sh
sudo apt-get update
sudo apt full-upgrade -y
sudo apt-get install i2c-tools
```

Make sure you follow these [steps to enable autoloading of I2C Kernel module](https://learn.adafruit.com/adafruits-raspberry-pi-lesson-4-gpio-setup/configuring-i2c#installing-kernel-support-with-raspi-config-5-4).

Install Node.js if not yet installed, e.g. to install Node v10:

```sh
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Reboot for above changes to take affect:

```sh
sudo reboot
```

You can check Node version like this:

```sh
node -v
# v10.11.0
```

To install `adafruit-mpr121` in your own Node app:

```sh
mkdir myapp
cd myapp
npm init
npm install adafruit-mpr121 --save
```

To run node in interactive mode on command line:

```sh
node
```

Example code below should now work.

## Example

```js
const MPR121 = require('adafruit-mpr121'),
      mpr121  = new MPR121(0x5A, 1);

// listen for touch events
mpr121.on('touch', (pin) => console.log(`pin ${pin} touched`));

// listen for release events
mpr121.on('release', (pin) => console.log(`pin ${pin} released`));

// listen for changes to the state of a specific pin
mpr121.on(3, (state) => console.log(`pin 3 is ${state ? 'touched' : 'released'}`));

// check the current state of a specific pin synchronously
const state = mpr121.isTouched(2);
console.log(`pin 2 is ${state ? 'touched' : 'released'}`);
```

## License

Copyright (c) 2016 Adafruit Industries. Licensed under the MIT license.
