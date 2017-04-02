#!/usr/bin/env node

"use strict";

var fs      = require('fs');
var request = require('request');

var url;
url = 'http://webcam.ci.schaumburg.il.us/axis-cgi/mjpg/video.cgi';
url = 'http://halva.lan';
url = 'http://halva.lan/video.mpjpeg';

// taken from https://github.com/rodowi/Paparazzo.js/blob/master/src/paparazzo.coffee
class Goat {
  constructor(uri, done) {
    this.uri  = uri;
    this.done = done;

    this.min_working_buffer = 512;
    this.have_read_headers  = false;
    this.boundary           = null;
    this.data               = '';
    this.first_packet       = true;
  }

  static getFrame(host, path, done) {
    // keep reading until we get a frame, then stop reading
    var goat = new Goat(host, path, done);
    goat.start();
  }

  start() {
    console.log('fetching this.uri:', this.uri);

    var req = request(this.uri, (err, response, body) => {
      if (err) {
        return this.done(err);
      }
    });

    req.on('response', (response) => {
      response.setEncoding('binary');
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

  removeHeaders() {
    // find a ^M remove up to and including
    // if indexOf ^M === 0, remove it and move on
  }

  handleResponse(chunk) {
    if (this.data.length < this.min_working_buffer) {
      this.data += chunk;
      return;
    }

    var boundary_index = chunk.indexOf(this.boundary);

    // read data into buffer until we have at least N
    // once we have at least N (which *should* include headers)
    // if we have not yet read headers
    // remove the headers from the buffer
    // read until we've found the next boundary

    if (!this.have_read_headers) {
      this.removeHeaders();
    }

    if (boundary_index === -1) {
      this.data += chunk;
      return;
    }

    if (this.data === '--') {
      this.data = '';

      //console.log(`chunk.toString(): '${chunk.toString()}'`);

      //console.log('chunk.length', chunk.length);
      //console.log('this.boundary.length', this.boundary.length);
      if (chunk.length == this.boundary.length + 2) {
        console.log('empty packet.');

        return;
      }
    }

    if (this.data.length) {
      this.response.destroy();
      return this.done(null, this.data);
    }

    var remaining   = chunk.substring(boundary_index);
    var typeMatches = remaining.match(/Content-Type:\s+image\/jpeg\s+/);
    var content_len = remaining.match(/Content-Length:\s+(\d+)\s+/);
    var timestamp   = remaining.match(/X-Timestamp: \S+\s+/);
    var header      = remaining.match(/\r\n/);

    if (remaining.match(/\r\n/)) {
      console.log('yes!');
    }

    if (timestamp && timestamp.length > 1) {
      console.log('timestamp');
      var new_image_index = remaining.indexOf(timestamp[0]) + timestamp[0].length;
      console.log('timestamp:', timestamp[0].length);
      this.data += remaining.substring(new_image_index);
    } else if (content_len && content_len.length > 1) {
      var new_image_index = remaining.indexOf(content_len[0]) + content_len[0].length
      console.log('content_len:', content_len[1]);
      this.data += remaining.substring(new_image_index);
    } else if (typeMatches) {
      console.log('type match');
      var new_image_index = remaining.indexOf(typeMatches[0]) + typeMatches[0].length;
      this.data += remaining.substring(new_image_index);
    } else if (first_packet) {
      //console.log('first chunk', chunk.toString());
      // first packet seems to always be just the boundary
    } else {
      this.response.destroy();
      return this.done(new Error('Could not find beginning of next image'));
    }

    // otherwise, get what's after the boundary
  }

  getBoundaryString(type) {
    var match = type.match(/multipart\/x-mixed-replace;\s*boundary=(.+)/);
    if (match && match.length > 1) {
      return match[1];
    }
  }
}

Goat.getFrame(url, function(err, data) {
  if (err) {
    console.log('err', err);
    return;
  }

  fs.writeFileSync('image.jpg', data);

  console.log('data', data.length);
});

// fetch stream
// listening to data
// getting index of the boundary
// buffering while we look for the boundary
