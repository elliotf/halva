
exports.ImageStream = class ImageStream {
  constructor() {
    this.subscribers = [];
  }

  subscribe(fn) {
    this.subscribers.push(fn);

    //console.log('CONNECT: this.subscribers.length', this.subscribers.length);
  }

  unsubscribe(fn_to_remove) {
    const i = this.subscribers.indexOf(fn_to_remove);
    if (i < 0) {
      return;
    }

    this.subscribers.splice(i, 1);
    //console.log('DISCONNECT: this.subscribers.length', this.subscribers.length);
  }

  publish(data) {
    try {
      this.subscribers.forEach((fn) => {
        setImmediate(() => {
          try {
            fn(data);
          } catch (e) {
            console.log(e);
          }
        });
      });
    } catch (e) {
      console.log(e);
    }
  }
};
