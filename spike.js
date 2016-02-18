#!/usr/bin/env node

'use strict';

var async = require('async');
var Gpio  = require('onoff').Gpio;

var pin_numbers = [2,3,4,17];
var pin_on_time = 250;
var pins        = pin_numbers.map(function(pin_number, index) {
  return new Gpio(pin_number, 'high');
});

async.eachSeries(
  pins,
  function(pin, done) {
    console.log("Turning pin", pin.gpio, "on");
    pin.write(0, function(err) {
      if (err) {
        return done(err);
      }

      setTimeout(function() {
        console.log("Turning pin", pin.gpio, "off");
        pin.write(1, function(err) {
          if (err) {
            return done(err);
          }

          setTimeout(function() {
            return done();
    }, pin_on_time);
  });
      }, pin_on_time);
    });
  },
  function(err) {
    if (err) {
      console.log('ERR:', err);
    }
    pins.forEach(function(pin) {
      console.log("Unexporting");
      pin.unexport();
    });

    //process.exit();
  }
);

/*
var gpio = require('rpi-gpio');
var gpio_pins   = [3,5,7,11];
//var gpio_pins   = [3,5];
var pin_on_time = 125;
async.eachSeries(gpio_pins, function(pin_number, done) {
  gpio.setup(pin_number, gpio.DIR_OUT, gpio.EDGE_NONE, function(err) {
    if (err) {
      console.log("err when opening pin", pin_number, ":", err);
      return done;
    }

    console.log('set up pin', pin_number);

    setTimeout(function() {
      gpio.write(pin_number, false, function(err) {
        if (err) {
          console.log("err when turning on pin", pin_number, ":", err);
          return done;
        }

        console.log('turned pin', pin_number, 'on');

        setTimeout(function() {
          gpio.write(pin_number, true, function(err) {
            if (err) {
              console.log("err when turning off pin", pin_number, ":", err);
              return done;
            }

            console.log('turned pin', pin_number, 'off');
      setTimeout(function() {
              return done();
      }, pin_on_time);
          });
        }, pin_on_time);
      });
    }, pin_on_time);
  });
}, function(err) {
  console.log("final err:", err);
  process.exit(1);
});
*/

/*
var gpio = require('pi-gpio');
var gpio_pins = [7];
async.eachSeries(gpio_pins, function(pin_number, done) {
  gpio.open(pin_number, "input", function(err) {
    if (err) {
      console.log("err when opening pin", pin_number, ":", err);
      return done;
    }

    gpio.write(pin_number, 1, function(err) {
      if (err) {
        console.log("err when turning on pin", pin_number, ":", err);
        return done;
      }

      console.log('turned pin', pin_number, 'on');

      gpio.write(pin_number, 0, function(err) {
        if (err) {
          console.log("err when turning off pin", pin_number, ":", err);
          return done;
        }

        console.log('turned pin', pin_number, 'off');

        gpio.close(pin_number, function(err) {
          if (err) {
            console.log("err when closing pin", pin_number, ":", err);
            return done;
          }

          return done();
        });
      });
    });
  });
}, function(err) {
  console.log("final err:", err);
  process.exit(1);
});
*/
