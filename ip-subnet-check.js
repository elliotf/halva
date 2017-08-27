#!/usr/bin/env node

var ip = require('ip');
var os = require('os');

'use strict';

function isLocalAddress(input_ip) {
  var ifaces = os.networkInterfaces();

  if (!ip.isPrivate(input_ip)) {
    return false; // short circut since we're not publicly exposed
  }

  var ips = [];
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }

      ips.push(iface);
    });
  });

  var local_subnet;
  var input_subnet;
  for(var i = 0; i < ips.length; ++i) {
    if (ip.subnet(ips[i].address, ips[i].netmask).contains(input_ip)) {
      return true;
    }
  }

  return false;
}

exports.isLocalAddress = isLocalAddress;

if (__filename === process.argv[1]) {
  (function() {
    var ip = process.argv[2];
    console.log(`is ${ip} a local address: ${isLocalAddress(ip)}`);
  })();
}
