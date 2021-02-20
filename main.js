#!/usr/bin/env node

const _ = require('lodash');
const bodyParser = require('body-parser');
const config = require('config');
const express = require('express');
const fs = require('fs');
const os = require('os');
const ip_checker = require('./ip-subnet-check');
const nunjucks = require('nunjucks');
const GarageDoor = require('./door');
const Broadcaster = require('./broadcaster');
const { Mailer } = require('./mailer');
const assets = require('./webpack-assets');
const ddns = require('./ddns');
const camera = require('raspberry-pi-camera-native');
const { ImageStream } = require('./image_stream');
const sharp = require('sharp');
const Gpio   = require('onoff').Gpio;
const Bluebird = require('bluebird');

const minute = 60*1000;
const broadcaster = new Broadcaster();

let previously_all_closed = true;
function getData(req_data) {
  let all_closed = true;
  var door_data = doors.map(function(door) {
    if (!door.is_closed) {
      all_closed = false;
    }

    return {
      name:      door.name,
      status:    door.status,
      is_closed: door.is_closed,
    };
  });

  var data = {
    all_closed,
    doors:         door_data,
    display_video: req_data.from_lan,
    timestamp:     Date.now(),
    video_url:     config.mjpeg_url,
  };

  if (all_closed && !previously_all_closed) {
    // doors closed, so turn the lights off
    press_light_button('off')
      .catch((err) => {
        console.log(err);
      });
  }

  if (!all_closed && previously_all_closed) {
    // doors opened, so turn the lights on
    press_light_button('on')
      .catch((err) => {
        console.log(err);
      });
  }

  previously_all_closed = all_closed;

  return data;
}

function onDoorChange() {
  var data = getData({});

  if (!data.all_closed) {
  }

  broadcaster.publish(data);
}

const image_stream = new ImageStream();
let current_image;
camera.on('frame', function(image_data) {
  current_image = image_data;
  image_stream.publish(image_data);
});
camera.start(config.camera_settings);

mailer = new Mailer({
  getImage: function() {
    return current_image;
  },
});

var doors = config.doors.map(function(attrs) {
  attrs.mailer = mailer;
  return new GarageDoor(attrs, onDoorChange);
});

var alert_time = Date.now() - 1; // alert on boot
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

  // ~fibionacci snooze (5,5,10,20,30,50,80) with a limit
  var snooze = Math.min(Math.max(open_for, config.left_open_alert.alert_after_open), config.left_open_alert.max_snooze);
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

nunjucks.configure({
  autoescape: true,
  express:    app,
});

app.get('/heartbeat', function(req, res, next) {
  return res.json({});
});

app.use(function(req, res, next) {
  res.locals.from_lan = false;
  res.locals.assets   = assets;
  var client_ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'];

  if (req.query.force_img) {
    res.locals.from_lan = false;
  } else {
    if (!client_ip || ip_checker.isLocalAddress(client_ip)) {
      res.locals.from_lan = true;
    }
  }

  return next();
});

app.get('/', function(req, res, next) {
  res.locals.app_data = JSON.stringify(getData(res.locals), null, 2);
  return res.render('index.html');
});

app.get('/data', function(req, res, next) {
  var data = getData(res.locals);
  var to_return = JSON.stringify(data);
  if (req.query.format !== 'json') {
    to_return = `window.app_data = ${to_return};`;
  }

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

const lights = {
  on: new Gpio(2, 'high'),
  off: new Gpio(3, 'high'),
};

async function press_light_button(button_name) {
  const button = lights[button_name];

  if (!button) {
    throw new Error(`No such light button: ${button_name}`);
  }

  await button.write(0);
  await Bluebird.delay(config.pin_on_time);
  await button.write(1);

  await Bluebird.delay(200);

  onDoorChange();
}

app.post('/lights/:state', function(req, res, next) {
  press_light_button(req.params.state)
    .then(function() {
      res.send('ok');
    })
    .catch(next);
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

app.get('/video.mjpeg', function(req, res, next) {
  const consumer = function(bytes) {
    if (!bytes) {
      return;
    }

    const bytes_to_write = bytes.length;
    //const MAX_BUFFER_AMOUNT = 1000000;
    //const buffering_too_much = req.socket.writableLength > MAX_BUFFER_AMOUNT;
    const MAX_FRAMES_TO_BUFFER = 1;
    const MAX_BUFFER_AMOUNT = bytes_to_write * MAX_FRAMES_TO_BUFFER;
    const buffering_too_much = req.socket.writableLength > MAX_BUFFER_AMOUNT;
    if (buffering_too_much) {
      // Node will keep buffering data to a client that can't consume quickly enough.
      // Avoid blowing out memory by dropping frames.

      return;
    }

    res.write('--' + boundary + '\r\n');
    res.write('Content-Type: image/jpeg\r\n');
    res.write(`Content-Length: ${bytes.length}\r\n`);
    res.write('\r\n');
    res.write(Buffer.from(bytes), 'binary');
    res.write('\r\n');
  };

  req.on('close', function() {
    //console.log('CLOSE');
    image_stream.unsubscribe(consumer);
  }.bind(this));
  req.on('timeout', function() {
    //console.log('TIMEOUT');
    image_stream.unsubscribe(consumer);
  }.bind(this));
  req.on('disconnect', function() {
    //console.log('DISCONNECT');
    image_stream.unsubscribe(consumer);
  }.bind(this));
  req.on('abort', function() {
    //console.log('ABORT');
    image_stream.unsubscribe(consumer);
  }.bind(this));

  // Write headers
  const boundary = '3b9014c1235e4e99b686136faf5ebaac';
  res.removeHeader('Transfer-Encoding');
  res.writeHead(200, {
    Server: 'MJPG-streamer?',
    'Content-Type':      `multipart/x-mixed-replace;boundary=${boundary}`,
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  image_stream.subscribe(consumer);
});

app.get('/recent_image.jpg', function(req, res, next) {
  const test = () => {
    return !!current_image;
  };

  retry(10, 10, test, function(err, available) {
    if (available) {
      const {
        width,
        height,
      } = req.query;

      res.type('image/jpeg');

      // future usage for motion detection.
      // It's more CPU efficient to resize images than motion check larger images.
      const no_resizing_for_now = true;

      if (no_resizing_for_now || !width || !height) {
        return res.send(current_image);
      }

      sharp(current_image)
        .resize({
          width: Number(width),
          height: Number(height),
          kernel: sharp.kernel.nearest,
        })
        .toBuffer()
        .then(function(data) {
          res.send(data);
        }, next);
    } else {
      res.status(409);
      return res.send('camera not available');
    }
  });
});

app.use('/public', express.static('public', {
  immutable: true,
  maxAge: '1y',
}))

var port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', function(err) {
  console.log('Listening on port 3000', new Date());
});

function retry(sleep, tries_left, test, done) {
  if (!tries_left) {
    return done(null, false);
  }
  if (test()) {
    return done(null, true);
  }
  return setTimeout(function() {
    retry(sleep*2, tries_left - 1, test, done);
  }, sleep);
}
