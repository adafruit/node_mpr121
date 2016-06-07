# MPR121 Library for Node.js

Access a [MPR121 breakout](https://www.adafruit.com/product/2024) using Node.js from a Raspberry Pi or BeagleBone Black.

## Installation

This library requires [Node.js](https://nodejs.org/) v6.0.0 or higher.

```sh
$ npm install adafruit-mpr121
```

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
