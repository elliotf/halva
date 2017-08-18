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

function send(msg) {
  var before = Date.now();
  var mailer = nodemailer.createTransport(config.smtp);

  var timestamp = Moment().format('YYYY-MM-DD ddd h:mm:ss a');

  Sampler.getFrame(config.mjpeg_url, function(err, data) {
    if (err) {
      console.error(err, err.stack);
      return;
    }

    var id = getUniqueId();

    // send to sms first for lowest latency
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
        return;
      }

      // then send to email recipients
      message.to      = config.email_recipients;
      message.subject = msg;
      message.html    = `<h1>${msg} ${timestamp}</h1><img src="cid:${id}">`;
      delete message.text;

      mailer.sendMail(message, function(err, result) {
        if (err) {
          console.error(err, err.stack);
          return;
        }
      });
    });
  });
}

exports.send = send;
