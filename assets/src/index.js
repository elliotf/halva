var Vue   = require('vue/dist/vue.min.js');
var axios = require('axios/dist/axios.min.js');
//var Vue = require('vue/dist/vue.min.js');
//var axios = require('axios/dist/axios.min.js');

Vue.component('light', {
  template: '<button @click="trigger">Lights {{ title }}</button>',
  props:    ['title'],
  methods:  {
    trigger: function() {
      axios
        .post(`/lights/${this.title}`)
        .then(function (data, status, request) {
        }).catch(function() {
        });
    },
  },
});

Vue.component('door', {
  template: '<button v-bind:class="classObject" @click="toggle">{{ name }} ({{ status }})</button>',
  props:    ['name', 'status', 'is_closed'],
  methods:  {
    toggle: function() {
      axios.post('/toggle', {
        toggle: this.name,
      }).then(function (data, status, request) {
      }).catch(function() {
      });
    },
  },
  computed: {
    classObject: function() {
      var closed = !!this.is_closed;
      return {
        'closed': closed,
        'open':   !closed,
      };
    },
  },
});

function merge(source, destination) {
  var keys = Object.keys(source);
  keys.forEach(function(key) {
    destination[key] = source[key];
  });
}

var data = {
  timestamp:     Date.now(),
  display_video: false,
  doors:         [],
};

merge(app_data, data);

var app = new Vue({
  el: '#app',
  data: data,
  created: function() {
    this.setupStream();
  },
  computed: {
    img_src: function() {
      return "/recent_image.jpg?ts=" + this.timestamp;
    },
    last_refresh: function() {
      return new Date(this.timestamp).toISOString();
    },
  },
  methods: {
    forcePhoto: function() {
      this.display_video = false;
    },
    refreshImage: function() {
      this.timestamp = Date.now();
    },
    refetch: function() {
      console.log('refetching');
      this.timestamp = Date.now();
      axios.get('/data?format=json&ts=' + Date.now(), {
        toggle: this.name,
      }).then(function (res, status, request) {
        merge(res.data, app.$data);
      }).catch(function() {
      });
    },
    setupStream: function() {
      var source = new EventSource('/updates');

      source.addEventListener('message', event => {
        var data;
        try {
          data = JSON.parse(event.data);

          this.timestamp = Date.now(); // trigger an image update if the door has closed.

          this.doors = data.doors;
        } catch(err) {
          console.log('err, err.stack', err, err.stack);
        }
      });

      source.addEventListener('error', event => {
        console.log('error:', event);
      });
    }
  },
});

// if the user focuses away and then comes back, we should fetch fresh state from the server
(function() {
  var hidden, visibilityChange;
  if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
  } else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
  } else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
  }

  var is_hidden = false;
  function handleVisibilityChange(e) {
    var new_status = (document[hidden]) ? true : false;

    if (is_hidden === true && new_status === false) {
      app.refetch();
    }

    is_hidden = new_status;
  }

  window.addEventListener("focus", function() {
    app.refreshImage();
  });
  //window.addEventListener("blur", handleBrowserState.bind(context, false));

  if (typeof document.addEventListener === "undefined") {
    console.log("This demo requires a browser, such as Google Chrome or Firefox, that supports the Page Visibility API.");
  } else {
    // Handle page visibility change
    document.addEventListener(visibilityChange, handleVisibilityChange, false);
  }
}());
