#!/usr/bin/env node

'use strict';

var _           = require('lodash');
var bodyParser  = require('body-parser');
var config      = require('config');
var express     = require('express');
var fs          = require('fs');
var os          = require('os');
var ip_checker  = require('./ip-subnet-check');
var nunjucks    = require('nunjucks');
var GarageDoor  = require('./door');
var Broadcaster = require('./broadcaster');
var mailer      = require('./mailer');

var minute = 60*1000;

var broadcaster = new Broadcaster();

function getData(req_data) {
  var door_data = doors.map(function(door) {
    return {
      name:      door.name,
      status:    door.status,
      is_closed: door.is_closed,
    };
  });
  var data = {
    doors:         door_data,
    display_video: req_data.from_lan,
    video_url:     config.mjpeg_url,
  };

  return data;
}

function onDoorChange() {
  var data = getData({});

  broadcaster.publish(data);
}

var doors = config.doors.map(function(attrs) {
  return new GarageDoor(attrs, onDoorChange);
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

  // fibionacci snooze (10,10,20,30,50,80) with a limit
  var snooze = Math.min(open_for, config.left_open_alert.max_snooze);
  alert_time = alert_time + snooze;

  var minutes_open   = (open_for / minute).toFixed(0);
  var minutes_snooze = (snooze   / minute).toFixed(0);
  var message = `One or more doors have been open for ${minutes_open} minutes. Will alert again in ${minutes_snooze} minutes if it's still open`;

  mailer.send(message);
}

setInterval(ensureClosed, 10*1000);

var doors_by_name = {};
doors.forEach(function(door) {
  doors_by_name[door.name] = door;
});

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

nunjucks.configure('views', {
  autoescape: true,
  express:    app,
});

app.get('/heartbeat', function(req, res, next) {
  return res.json({});
});

app.use(function(req, res, next) {
  res.locals.from_lan = false;
  var client_ip = req.headers['x-real-ip'];

  if (!client_ip || ip_checker.isLocalAddress(client_ip)) {
    res.locals.from_lan = true;
  }
  if (req.query.force_img) {
    res.locals.from_lan = false;
  }

  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma:          'no-cache',
    Expires:         0,
  });

  return next();
});

app.get('/', function(req, res, next) {
  return res.sendFile(__dirname + '/index.html');
});

app.get('/data', function(req, res, next) {
  var data = getData(res.locals);
  var to_return = `
    window.app_data = ${JSON.stringify(data)};
  `;

  res.setHeader('Content-type', 'application/json');
  return res.send(to_return);
});

app.get('/toggle', function(req, res, next) {
  return res.redirect('/');
});

app.get('/updates', function(req, res, next) {
  broadcaster.register(req, res);
});

app.post('/toggle', function(req, res, next) {
  var to_toggle = req.body.toggle;
  if (!to_toggle || !doors_by_name[to_toggle]) {
    return res.end();
  }
  var door = doors_by_name[to_toggle];

  door.toggle(function(err) {
    if (err) {
      return next(err);
    }

    return res.end();
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

app.get('/recent_image.jpg', function(req, res, next) {
  mailer.getRecentImage(function(err, img_data) {
    if (err) {
      return next(err);
    }

    res.type('jpeg');
    res.end(img_data, 'binary');
  });
});

var port = process.env.PORT || 3000;

app.listen(port, '127.0.0.1', function(err) {
  console.log('Listening on port 3000', new Date());
});
