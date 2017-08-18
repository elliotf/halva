#!/usr/bin/env node

'use strict';

var _          = require('lodash');
var bodyParser = require('body-parser');
var config     = require('config');
var express    = require('express');
var fs         = require('fs');
var nunjucks   = require('nunjucks');
var GarageDoor = require('./door');
var mailer     = require('./mailer');

/*
var log        = require('bunyan').createLogger({
  name: 'halva',
});
var methods    = ['log', 'error'];
var originals  = [];
methods.forEach(function(meth) {
  originals[meth] = console[meth];
  console[meth]   = log[meth];
});
*/

var to_notify = {};

var minute        = 60*1000;
var beat_interval = 15*minute;

var doors = config.doors.map(function(attrs) {
  return new GarageDoor(attrs);
});

var doors_by_name = {};
doors.forEach(function(door) {
  doors_by_name[door.name] = door;
});

var alert_time = 0;
function ensureClosed() {
  var now         = Date.now();
  var oldest_open = now;

  doors.forEach(function(door) {
    if (!door.status || door.status === 'Closed') {
      return;
    }

    if (door.updated < oldest_open) {
      console.log(`${door.name} is open`);
      oldest_open = door.updated;
    }
  });

  if (oldest_open === now) {
    // everything is closed, reset state
    alert_time = now + config.left_open_alert.alert_after_open;
  }

  if (now < alert_time) {
    // nothing has been open long enough
    return;
  }

  var open_for = now - oldest_open;

  // fibionacci snooze (10,20,30,50,80) with a limit
  var snooze = Math.min(open_for, config.left_open_alert.max_snooze);
  alert_time = alert_time + snooze;

  var minutes_open   = (open_for / minute).toFixed(0);
  var minutes_snooze = (snooze   / minute).toFixed(0);
  var message = `One or more doors have been open for ${minutes_open} minutes. Will alert again in ${minutes_snooze} minutes if it's still open`;

  mailer.send(message);
}

setInterval(ensureClosed, 10*1000);

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
  res.locals.uptime   = process.uptime();
  res.locals.memory   = JSON.stringify(process.memoryUsage(), null, 2);

  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma:          'no-cache',
    Expires:         0,
  });

  return next();
});

app.get('/', function(req, res, next) {
  return res.render('index.html');
});

app.get('/heartbeat', function(req, res, next) {
  return res.json({});
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
  var door = doors_by_name[req.params.door];

  if (!door) {
    return res.status(404).json({ error: 'door not found' });
  }

  door.getStatus(function(err, status) {
    if (err) {
      return next(err);
    }

    var label = (status) ? 'CLOSED' : 'NOT_CLOSED';

    return res.json({ status: label });
  });
});

var port = process.env.PORT || 3000;

app.listen(port, '127.0.0.1', function(err) {
  console.log('Listening on port 3000', new Date());
});
