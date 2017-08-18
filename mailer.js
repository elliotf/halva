var config     = require('config');
var Moment     = require('moment');
var nodemailer = require('nodemailer');
var Sampler    = require('./simpler');
var uuid       = require('uuid');
var _          = require('lodash');

function getUniqueId() {
  var id = uuid.v1();

  return `unique-halva-${id}`;
}

var recent_image;
function getRecentImage(done) {
  if (recent_image) {
    setImmediate(function() {
      done(null, recent_image);
    });
    return;
  }

  populateRecentImage(done);
}

function populateRecentImage(input) {
  var done = (input || function() {});

  Sampler.getFrame(config.mjpeg_url, function(err, data) {
    if (data) {
      recent_image = data;
    }

    done(err, data);
  });
}

setInterval(populateRecentImage, 1000);

function send(msg, input) {
  var done   = input || function() {};
  var before = Date.now();
  var mailer = nodemailer.createTransport(config.smtp);

  var timestamp = Moment().format('YYYY-MM-DD ddd h:mm:ss a');

  getRecentImage(function(err, data) {
    if (err) {
      console.error(err, err.stack);
      return done(err);
    }

    var id        = getUniqueId();
    var start_sms = Date.now();

    // send to sms first for lowest latency and because a subject
    // renders in an ugly way for SMS
    var message = {
      from:         config.smtp.auth.user,
      to:           config.sms_recipients,
      text:         `${msg} ${timestamp}`,
      attachments:  [
        {
          filename: 'garage_door.jpg',
          content:  data,
          cid:      id,
        },
      ],
    };

    mailer.sendMail(message, function(err, result) {
      if (err) {
        console.error(err, err.stack);
        return done(err);
      }

      var start_email = Date.now();

      message.to      = config.email_recipients;
      message.subject = msg;
      message.html    = `<h1>${msg} ${timestamp}</h1><img src="cid:${id}">`;
      delete message.text;

      mailer.sendMail(message, function(err, result) {
        if (err) {
          console.error(err, err.stack);
          return done(err);
        }

        var now        = Date.now();
        var times = {
          time_sms: start_email - start_sms,
          time_email: now - start_email,
          time_total: now - start_sms,
        };

        console.log('message sending times:', times);

        return done();
      });
    });
  });
}

exports.send = send;
