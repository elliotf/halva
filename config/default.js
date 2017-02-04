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
  pin_on_time: 250,
  chat: {
    jid:       process.env.JID,
    password:  process.env.PASSWORD,
    host:      "talk.google.com",
    port:      5222,
  },
};
