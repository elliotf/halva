#!/usr/bin/env node

'use strict';

var _          = require('lodash');
var async      = require('async');
var express    = require('express');
var nunjucks   = require('nunjucks');
var Gpio       = require('onoff').Gpio;
var bodyParser = require('body-parser');

var config = {
  doors: [
    {
      name:       'Hers',
      button_pin: 2,
      sensor_pin: 17,
    },
    {
      name:       'His',
      button_pin: 3,
      sensor_pin: 27,
    },
  ],
  pin_on_time: 250,
};

function GarageDoor(attrs) {
  this.name     = attrs.name;
  this.button   = new Gpio(attrs.button_pin, 'high');
  this.sensor   = new Gpio(attrs.sensor_pin, 'in', 'both');
  this.status   = '';
  var self      = this;

  this.sensor.watch(_.debounce(function(err, value) {
    console.log(self.name, ' event err,value', err, value);
  }, 100));

  setInterval(function() {
    self.getStatus(function(err, value) {
    });
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

GarageDoor.prototype.getStatus = function(done) {
  var self = this;
  self.sensor.read(function(err, value) {
    if (err) {
      return done(err);
    }
    self.status = (value) ? 'Closed' : 'Not Closed';

    return done(null, value);
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

app.get('/door/:door', function(req, res, next) {
  var door = doors_by_name[to_toggle];

  door.getStatus(function(err, status) {
    if (err) {
      return next(err);
    }

    return res.json({ status: status });
  });
});

app.listen('3000', '127.0.0.1', function(err) {
  console.log('Listening on port 3000');
});
