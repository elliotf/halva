var uuid = require('uuid');

'use strict';

class Broadcaster {
  constructor() {
    this.connections = [];
  }

  register(req, res) {
    var self = this;
    var client = {
      req: req,
      res: res,
      id:  uuid.v1(),
    };
    this.connections.push(client);

    console.log('client.id', client.id);
    console.log('this.connections.length', this.connections.length);

    req.socket.setTimeout(0);
    req.on('close', function() {
      var i = this.connections.indexOf(client);

      this.connections.splice(i, 1);

      console.log('removing', client.id);
      console.log('this.connections.length', this.connections.length);
    }.bind(this));

    // Write headers needed for sse
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('\n');
  }

  publish(data) {
    for (var i = 0; i < this.connections.length; i++) {
      this.connections[i].res.write('data: ' + JSON.stringify(data) + '\n\n');
    }
  }
}

module.exports = Broadcaster;
