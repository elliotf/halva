const config     = require('config');
const Moment     = require('moment');
const nodemailer = require('nodemailer');
const uuid       = require('uuid');
const _          = require('lodash');
const axios = require('axios');

class Mailer {
  constructor({ getImage }) {
    this._imageGetter = getImage;
  }

  async send(msg, input) {
    const mailer = nodemailer.createTransport(config.smtp);
    const timestamp = Moment().format('YYYY-MM-DD ddd h:mm:ss a');
    const image = await this._imageGetter();
    const start_sms = Date.now();

    const id = `unique-halva-${uuid.v1()}`;

    // send to sms first for lowest latency and because a subject
    // renders in an ugly way for SMS
    const sms_message = {
      from:         config.smtp.auth.user,
      to:           config.sms_recipients,
      text:         `${msg} ${timestamp}`,
      attachments:  [
        {
          filename: 'garage_door.jpg',
          content:  image,
          cid:      id,
        },
      ],
    };

    await mailer.sendMail(sms_message);
    const start_email = Date.now();

    const email_message = {
      ...sms_message,
      to: config.email_recipients,
      subject: msg,
      html: `<h1>${msg} ${timestamp}</h1><img src="cid:${id}">`,
    };
    delete email_message.text;

    await mailer.sendMail(email_message);
  }
}

exports.Mailer = Mailer;
