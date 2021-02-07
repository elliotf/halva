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
    alert_after_open: 5*minute,
    max_snooze:       30*minute,
  },
  pin_on_time: 250,
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
  sms_recipients: [
    // email addresses
  ],
  email_recipients: [
    // email addresses
  ],
  ddns: {
    hostname: '',
    username: '',
    password: '',
  },
};

module.exports.camera_settings = {
  fps: 24, // divisible by 1,2,3, and 4 for motion subsampling
  encoding: 'JPEG',
  quality: 7,

  // v2 camera x2 binning, compatible with motion because divisible by 8
  width: 1632,
  height: 1232,

  // v1 camera, x2 binning with size divisible by 8 to be compatible with motion
  //width: 1296,
  //height: 960,
};
