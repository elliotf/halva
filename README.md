# halva
My web-enabled garage door opener, like "Open, Sesame!" but [tastier](https://en.wikipedia.org/wiki/Halva "information about halva").

# Features
* multiple door support
* opening/closing garage door from any browser, mostly your phone
* see live video stream of your garage, or images if connecting remotely
* open/close status when it's too dark to see the webcam image
* sms/email notification of door events (with picture from camera)
* automatic sms/email reminders if doors are left open
* access from anywhere over ssl

# TODO
* favicon
* ajax-ify open buttons
  * to open doors without reloading video feed
  * to have door status auto-update
* document the setup/installation
* integration motion library to record video
* send pictures of open door rather than always sending pictures of closed doors
  * so that I can see who/what was going on when it was open
  * when opening, immediately send notification, then send an image after delay (once open)
  * when closing, immediately send image, then notification once closed

# Installation and setup
* hardware
  * raspberry pi 3
  * relays
  * camera
  * magnetic switches
  * container
  * network access (powerline / home av adapters)
* node.js
* mjpgstreamer
* nginx
* golang
* oauth2_proxy
  * compile
  * config
* supervisor
  * halva
  * mjpgstreamer
  * oauth2_proxy
* ssl via letsencrypt
  * https://certbot.eff.org/all-instructions/#debian-9-stretch-nginx
  * https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-16-04
* recommendations
  * static ip
  * port forward
  * dynamic dns client
