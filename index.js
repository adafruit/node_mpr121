'use strict';

const i2c = require('i2c-bus'),
      EventEmitter = require('events');

const MPR121_I2CADDR_DEFAULT = 0x5A,
      MPR121_TOUCHSTATUS_L   = 0x00,
      MPR121_TOUCHSTATUS_H   = 0x01,
      MPR121_FILTDATA_0L     = 0x04,
      MPR121_FILTDATA_0H     = 0x05,
      MPR121_BASELINE_0      = 0x1E,
      MPR121_MHDR            = 0x2B,
      MPR121_NHDR            = 0x2C,
      MPR121_NCLR            = 0x2D,
      MPR121_FDLR            = 0x2E,
      MPR121_MHDF            = 0x2F,
      MPR121_NHDF            = 0x30,
      MPR121_NCLF            = 0x31,
      MPR121_FDLF            = 0x32,
      MPR121_NHDT            = 0x33,
      MPR121_NCLT            = 0x34,
      MPR121_FDLT            = 0x35,
      MPR121_TOUCHTH_0       = 0x41,
      MPR121_RELEASETH_0     = 0x42,
      MPR121_DEBOUNCE        = 0x5B,
      MPR121_CONFIG1         = 0x5C,
      MPR121_CONFIG2         = 0x5D,
      MPR121_CHARGECURR_0    = 0x5F,
      MPR121_CHARGETIME_1    = 0x6C,
      MPR121_ECR             = 0x5E,
      MPR121_AUTOCONFIG0     = 0x7B,
      MPR121_AUTOCONFIG1     = 0x7C,
      MPR121_UPLIMIT         = 0x7D,
      MPR121_LOWLIMIT        = 0x7E,
      MPR121_TARGETLIMIT     = 0x7F,
      MPR121_GPIODIR         = 0x76,
      MPR121_GPIOEN          = 0x77,
      MPR121_GPIOSET         = 0x78,
      MPR121_GPIOCLR         = 0x79,
      MPR121_GPIOTOGGLE      = 0x7A,
      MPR121_SOFTRESET       = 0x80;


class MPR121 extends EventEmitter {

  constructor(address, bus, interval, extraSensitive) {

    super();

    this.address = address || MPR121_I2CADDR_DEFAULT;
    this.bus = Number.isInteger(bus) ? bus : 1;
    this.interval = interval || 100;

    this.state = [false, false, false, false, false, false, false, false, false, false, false, false];
    this.device = false;
    this.ready = false;
    this.timer = false;
    this.extraSensitive = extraSensitive||false;

    this.init()
        .then(this.reset.bind(this))
        .then(this.configure.bind(this))
        .then(this.startPolling.bind(this))
        .catch((err) => this.emit('error', err));

  }

  init() {

    return new Promise((resolve, reject) => {

      this.device = i2c.open(this.bus, (err) => {
        if(err) return reject(err);
        resolve();
      });

    });

  }

  reset() {

    return this.writeByte(MPR121_SOFTRESET, 0x63)
      .then(() => {
        return new Promise((resolve, reject) => {
          setTimeout(resolve, 100);
        });
      })
      .then(() => this.writeByte(MPR121_ECR, 0x00));

  }

  configure() {
      let nes = !this.extraSensitive;

      return this.setThresholds(nes?12:3, nes?6:1)
      // Baseline Filtering Control Registers -- RISING
      .then(() => this.writeByte(MPR121_MHDR, 0x01))
      .then(() => this.writeByte(MPR121_NHDR, 0x01))
      .then(() => this.writeByte(MPR121_NCLR, 0x0E))
      .then(() => this.writeByte(MPR121_FDLR, nes?0x00:0x01)) // filter rate. (0-255, 255 is slowest)
      // Baseline Filtering Control Registers -- FALLING
      .then(() => this.writeByte(MPR121_MHDF, 0x01))
      .then(() => this.writeByte(MPR121_NHDF, 0x05))
      .then(() => this.writeByte(MPR121_NCLF, 0x01))
      .then(() => this.writeByte(MPR121_FDLF, nes?0x00:0x40)) // filter rate. (0-255, 255 is slowest, 16-64 seems right for touch through a 1/16" surface)
      // Baseline Filtering Control Registers -- TOUCHED
      .then(() => this.writeByte(MPR121_NHDT, 0x00))
      .then(() => this.writeByte(MPR121_NCLT, 0x00))
      .then(() => this.writeByte(MPR121_FDLT, 0x00)) // filter rate. (0-255, 255 is slowest)
      // --
      .then(() => this.writeByte(MPR121_DEBOUNCE, 0))
      .then(() => this.writeByte(MPR121_CONFIG1, 0x10)) // default, 16uA charge current
      .then(() => this.writeByte(MPR121_CONFIG2, 0x20)) // 0.5uS encoding, 1ms period
      .then(() => this.writeByte(MPR121_ECR, 0x8F)) // start with first 5 bits of baseline tracking
      .then(() => {
        this.ready = true;
        this.emit('ready');
      });

  }

  setThresholds(touch, release) {

    if(touch < 0 || touch > 255) return Promise.reject();
    if(release < 0 || release > 255) return Promise.reject();

    let promises = [];

    for(let i = 0; i <= 12; i++) {
      promises.push(this.writeByte(MPR121_TOUCHTH_0 + 2 * i, touch));
      promises.push(this.writeByte(MPR121_RELEASETH_0 + 2 * i, release));
    }

    return Promise.all(promises);

  }

  startPolling() {

    if(! this.ready) return this.on('ready', this.startPolling);
    if(! this.interval) return;

    this.timer = setInterval(() => {
      this.touched().then(this.updateState.bind(this));
    }, this.interval);

  }

  stopPolling() {

    if(! this.timer) return;

    clearInterval(this.timer);
    this.timer = false;

  }

  updateState(touched) {

    this.state.forEach((previous, i) => {

      const current = (touched & (1 << i)) > 0;

      if(previous === current) return;

      this.state[i] = current;

      // emit pin number for touch and release
      if(current)
        this.emit('touch', i);
      else
        this.emit('release', i);

      // emit state on pin number
      this.emit(i, current);

    });

  }

  filteredData(pin) {
    if(pin < 0 || pin >= 12) return Promise.reject();
    return this.readWord(MPR121_FILTDATA_0L + (pin * 2));
  }

  baselineData(pin) {

    if(pin < 0 || pin >= 12) return Promise.reject();

    return this.readByte(MPR121_BASELINE_0 + pin)
      .then((bl) => {
        return Promise.resolve(bl << 2);
      });

  }

  touched() {
    return this.readWord(MPR121_TOUCHSTATUS_L).then((t) => Promise.resolve(t & 0x0FFF));
  }

  isTouched(pin) {

    if(! this.ready) return false;
    if(pin < 0 || pin >= 12) return false;

    return this.state[pin];

  }

  readByte(reg) {

    return new Promise((resolve, reject) => {

      this.device.readByte(this.address, reg, (err, b) => {
        if(err) return reject(err);
        resolve(b);
      });

    });

  }

  readWord(reg) {

    return new Promise((resolve, reject) => {

      this.device.readWord(this.address, reg, (err, w) => {
        if(err) return reject(err);
        resolve(w);
      });

    });

  }

  writeByte(reg, value) {

    return new Promise((resolve, reject) => {

      this.device.writeByte(this.address, reg, value & 0xFF, (err) => {
        if(err) return reject(err);
        resolve();
      });

    });

  }

}

exports = module.exports = MPR121;
