#!/usr/bin/env node

'use strict';

var _          = require('lodash');
var async      = require('async');
var config     = require('config');
var express    = require('express');
var nunjucks   = require('nunjucks');
var Gpio       = require('onoff').Gpio;
var bodyParser = require('body-parser');
var Client     = require('node-xmpp-client');

var to_notify = {};

function Chat() {
  if (!config.chat.jid || !config.chat.password) {
    return;
  }
  var self        = this;
  self.configured = true;
  var c           = this.client = new Client(config.chat);

  self.client.connection.socket.setTimeout(0);
  self.client.connection.socket.setKeepAlive(true, 10000)
  self.client.connection.socket.on('error', function(err) {
    console.log('exiting due to error:', err);
    setTimeout(function() {
      process.exit(1);
    }, 100);
  });

  c.on('online', function() {
    c.send(new Client.Element('presence'));
    var roster = new Client.Element('iq', {
      id: 'roster_1',
      type: 'get'
    }).c('query', {
      xmlns: 'jabber:iq:roster'
    });
    c.send(roster);
  });

  c.on('stanza', function(stanza) {
    if (stanza.is('presence')) {
      c.emit('presence', stanza);
    } else if (stanza.is('message')) {
      var error = msg.getChild('error');
      if (error || msg.attrs.type === 'error') {
        c.emit('error', error);
      } else {
        c.emit('message', stanza);
      }
    } else if (stanza.is('iq')) {
      stanza.getChildren('query').forEach(function(child) {
        child.getChildren('item').forEach(function(item) {
          console.log('jid', item.attrs.jid);
          console.log('name', item.attrs.name);
          to_notify[item.attrs.jid] = true;
        });
      });
      console.log('to_notify', to_notify);
    } else {
      console.log('OTHER', JSON.stringify(stanza, null, '  '));
    }
  });

  c.on('error', function(err) {
    console.log('err', err);
  });
}

Chat.prototype.notify = function(text) {
  var self = this;

  var c = this.client;
  Object.keys(to_notify).forEach(function(to_notify) {
    console.log(`Notifying ${to_notify}: ${text}`);

    if (!self.configured) {
      return;
    }
    var message = {
      to:   to_notify,
      type: 'chat',
    };
    var stanza = new Client.Stanza('message', message)
      .c('body').t(text);
    c.send(stanza);
  });
};

var chat = new Chat(config.chat);

function GarageDoor(attrs) {
  this.name     = attrs.name;
  this.button   = new Gpio(attrs.button_pin, 'high');
  this.sensor   = new Gpio(attrs.sensor_pin, 'in', 'both');
  this.status   = '';
  var self      = this;

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

  self.status = new_state;

  var state     = (value)
                ? 'is now closed'
                : 'has been opened';
  var timestamp = new Date().toISOString();
  var message   = `Garage door "${self.name}" ${state} (${timestamp})`;

  if (!prior_state) {
    return;
  }

  chat.notify(message);
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

app.listen('3000', '127.0.0.1', function(err) {
  console.log('Listening on port 3000');
});
