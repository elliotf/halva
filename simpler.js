#!/usr/bin/env node

"use strict";

var fs      = require('fs');
var request = require('request');

var url = 'http://halva.lan/video.mpjpeg';

class Goat {
  constructor(uri, done) {
    this.uri  = uri;
    this.done = done;

    var megabyte  = 8*1000*1000;
    this.max_data = 2*megabyte;
    this.boundary = null;
    this.data     = new Buffer('');
  }

  static getFrame(host, path, done) {
    // keep reading until we get a frame, then stop reading
    var goat = new Goat(host, path, done);
    goat.start();
  }

  start() {
    var req = request(this.uri, (err, response, body) => {
      if (err) {
        return this.done(err);
      }
    });

    req.on('response', (response) => {
      this.response = response;

      var content_type = response.headers['content-type'];
      this.boundary = this.getBoundaryString(content_type);

      if (!this.boundary) {
        return this.done(new Error("Could not parse a boundary from content type:", content_type));
      }

      response.on('data', (chunk) => {
        this.handleResponse(chunk);
      });
    });
  }

  finalize(err) {
    this.response.destroy();
    if (err) {
      return this.done(err);
    }

    return this.done(null, this.data);
  }

  handleResponse(chunk) {
    if (this.data.length > this.max_data) {
      return this.finalize(new Error(`something is awry.  We have read ${this.data.length} bytes without an image`));
    }

    var header_index = chunk.indexOf('\r\n\r\n');
    if (header_index !== -1 && 0 === this.data.length) {
      this.data = chunk.slice(header_index + 4);
      return;
    }

    var eoi = new Buffer(2);
    eoi.writeUInt16LE(0xd9ff, 0);

    var image_end_index = chunk.indexOf(eoi);

    if (image_end_index === -1) {
      this.data = Buffer.concat([this.data, chunk]);
      return;
    }

    this.data = Buffer.concat([this.data, chunk.slice(0, image_end_index)]);

    return this.finalize(null, this.data);
  }

  getBoundaryString(type) {
    var match = type.match(/multipart\/x-mixed-replace;\s*boundary=(.+)/);
    if (match && match.length > 1) {
      return '--' + match[1];
    }
  }
}

Goat.getFrame(url, function(err, data) {
  if (err) {
    console.log('err', err);
    return;
  }

  fs.writeFileSync('image.jpg', data);
});
