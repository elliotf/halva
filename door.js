"use strict";

var _      = require('lodash');
var config = require('config');
var mailer = require('./mailer');
var Gpio   = require('onoff').Gpio;

function GarageDoor(attrs, onChange) {
  this.name      = attrs.name;
  this.button    = new Gpio(attrs.button_pin, 'high');
  this.sensor    = new Gpio(attrs.sensor_pin, 'in', 'both');
  this.status    = '';
  this.is_closed = false;
  this.updated   = Date.now();
  this.onChange  = onChange;
  var self       = this;

  this.sensor.watch(_.debounce(function(err, value) {
    if (err) {
      return;
    }

    self.setStatus(value);
  }, 100));

  setInterval(function() {
    self.getStatus(function() {});
  }, 1*1000);
}

GarageDoor.prototype.toggle = function(done) {
  var self = this;

  self.button.write(0, function(err) {
    if (err) {
      return done(err);
    }

    setTimeout(function() {
      self.button.write(1, function(err) {
        if (err) {
          return done(err);
        }

        return done();
      });
    }, config.pin_on_time);
  });
};

GarageDoor.prototype.setStatus = function(value) {
  var self        = this;
  var prior_state = self.status;
  var new_state   = (value) ? 'Closed' : 'Not Closed';

  if (prior_state === new_state) {
    return;
  }

  self.status    = new_state;
  self.is_closed = value;
  self.updated   = Date.now();

  var state     = (value)
                ? 'is now closed'
                : 'has been opened';
  var message   = `Garage door "${self.name}" ${state}`;

  this.onChange();

  if (!prior_state) {
    return;
  }

  mailer.send(message);
};

GarageDoor.prototype.getStatus = function(done) {
  var self = this;

  self.sensor.read(function(err, value) {
    if (err) {
      return done(err);
    }

    self.setStatus(value);

    return done(null, value);
  });
};

module.exports = GarageDoor;
