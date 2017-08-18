var minute = 60*1000;

module.exports = {
  doors: [
    {
      name:       'door 1',
      button_pin: 3,
      sensor_pin: 27,
    },
    {
      name:       'door 2',
      button_pin: 2,
      sensor_pin: 17,
    },
  ],
  left_open_alert: {
    alert_after_open: 10*minute,
    max_snooze:       30*minute,
  },
  pin_on_time: 250,
  chat: {
    jid:       process.env.JID,
    password:  process.env.PASSWORD,
    host:      "talk.google.com",
    port:      5222,
  },
  mjpeg_url: 'http://your-url-here:port/path.cgi',
  smtp: {
    service: "Gmail",
    //host:            "smtp.gmail.com",
    //port:            465,
    //secure:          true,
    pool:            true,
    maxConnections:  2,
    auth:            {
      user:  process.env.JID,
      pass:  process.env.PASSWORD,
    },
  },
  sms_recipients: [],
  email_recipients: [],
};
