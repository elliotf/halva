const axios = require('axios');
const config = require('config');

class Updater {
  constructor(username, password, hostname) {
    this._last_ip = null;
    this._interval = null;

    this._username = username;
    this._password = password;
    this._hostname = hostname;
    this._failures = [];
  }

  async start(input) {
    const interval_seconds = input || 60*60; // default to refreshing once an hour

    if (this._interval) {
      // clear the current interval if we already have one, in case it's called multiple times
      clearInterval(this._interval);
    }

    // delay the first call, so we don't DoS if we're in a crash loop
    this._interval = setInterval(() => {
      this.check();
    }, interval_seconds * 1000);
  }

  static getBasicHeaders() {
    return {
      'User-Agent': 'halva-ddns-client-v0.0.01',
    };
  }

  async check() {
    try {
      const actual_ip = await this.fetchip();

      // all is the same, so no-op
      if (actual_ip === this._last_ip) {
        console.log('ip unchanged from', this._last_ip);
        return;
      }

      console.log('updating ip to', actual_ip);

      await this.update(actual_ip);

      this._last_ip = actual_ip;
    } catch(e) {
      this.handleError(e);
    }
  }

  async fetchip() {
    const response = await axios.request({
      method: 'get',
      url: 'https://domains.google.com/checkip',
      headers: Updater.getBasicHeaders(),
    });

    return response.data;
  }

  async update(ip) {
    const response = await axios.request({
      method: 'post',
      url: `https://domains.google.com/nic/update?hostname=${this._hostname}&myip=${ip}`,
      auth: {
        username: this._username,
        password: this._password,
      },
      headers: Updater.getBasicHeaders(),
    });

    this.handlePostResponse(response.data);
  }

  async handlePostResponse(response) {
    switch (response) {
      case 'nohost':   // Error: The hostname does not exist, or does not have Dynamic DNS enabled.
      case 'badauth':  // Error: The username / password combination is not valid for the specified host.
      case 'notfqdn':  // Error: The supplied hostname is not a valid fully-qualified domain name.
      case 'badagent': // Error: Your Dynamic DNS client is making bad requests. Ensure the user agent is set in the request, and that you’re only attempting to set an IPv4 address. IPv6 is not supported.
      case 'abuse':    // Error: Dynamic DNS access for the hostname has been blocked due to failure to interpret previous responses correctly.
        console.error(`Stopping DDNS updates due to fatal error: "${response}"`);
        clearInterval(this._interval);
      case '911':      // Error: An error happened on our end. Wait 5 minutes and retry.
        return;
      default:
        // good 1.2.3.4  Success The update was successful. Followed by a space and the updated IP address. You should not attempt another update until your IP address changes.
        // nochg 1.2.3.4 Success The supplied IP address is already set for this host. You should not attempt another update until your IP address changes.
        if (/^(good|nochg) /.test(response)) {
          return;
        }

        throw new Error(`Unrecognized response: ${response}`);
    }
  }

  async handleError(err) {
    console.error(`Stopping DDNS updates due to unexpected error: "${err}"`);
    clearInterval(this._interval);
  }
}

(function() {
  const username = config.ddns.username;
  const password = config.ddns.password;
  const hostname = config.ddns.hostname;

  if (!username || !password || !hostname) {
    console.log("DDNS not configured, not enabling");
    return;
  }
  console.log(`Enabling DDNS for hostname ${hostname}`);

  const updater = new Updater(username, password, hostname);
  updater.start();
}());
