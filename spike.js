#!/usr/bin/env node

'use strict';

var express    = require('express');
var nunjucks   = require('nunjucks');
var Gpio       = require('onoff').Gpio;
var bodyParser = require('body-parser');

var config = {
  doors: [
    {
      name:     'left',
      gpio_pin: 2,
    },
    {
      name:     'right',
      gpio_pin: 3,
    },
  ],
  pin_on_time: 250,
};

function GarageDoor(attrs) {
  this.gpio_pin = attrs.gpio_pin;
  this.name     = attrs.name;
  this.gpio     = new Gpio(this.gpio_pin, 'high');
}

GarageDoor.prototype.toggle = function(done) {
  var self = this;
  self.gpio.write(0, function(err) {
    if (err) {
      return done(err);
    }

    setTimeout(function() {
      self.gpio.write(1, function(err) {
        if (err) {
          return done(err);
        }

        return done();
      });
    }, config.pin_on_time);
  });
};

var doors = config.doors.map(function(attrs) {
  return new GarageDoor(attrs);
});

var doors_by_name = {};
doors.forEach(function(door) {
  doors_by_name[door.name] = door;
});

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));

nunjucks.configure('views', {
  autoescape: true,
  express:    app,
});

app.use(function(req, res, next) {
  res.locals.doors    = doors;
  // read off session flash storage, tuck into res.locals
  res.locals.messages = [];

  return next();
});

app.get('/', function(req, res, next) {
  return res.render('index.html');
});

app.post('/toggle', function(req, res, next) {
  var to_toggle = req.body.toggle;
  if (!to_toggle || !doors_by_name[to_toggle]) {
    res.locals.messages.push({
      text: 'Could not toggle ' + to_toggle,
    });

    return res.render('index.html');
  }
  var door = doors_by_name[to_toggle];

  door.toggle(function(err) {
    if (err) {
      return next(err);
    }

    // tuck into session flash storage
    res.locals.messages.push({
      text: 'toggled ' + to_toggle + '!',
    });

    return res.redirect('/');
  });
});

app.listen('3000', '127.0.0.1', function(err) {
  console.log('Listening on port 3000');
});
