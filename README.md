# halva
My web-enabled garage door opener, like "Open, Sesame!" but tastier.

This was a quick one that I put together to get around not having a remote for one of my garage doors.

The basic ingredients:
* Raspberry pi
* Sainsmart relay
* powerline networking adapter because the ground is frozen and I can't run ethernet and I don't believe in wireless
* some magnetic reed switches from the local surplus store
* cheap usb webcam or raspberry pi camera

Features so far:
* multiple door support
* opening/closing garage door from any browser
* open/close status when it's too dark to see the webcam image
* sms/email notification of door events (with picture from usb webcam)
* automatic sms/email reminders if doors are left open

## TODO
* favicon
* ajax-ify open buttons to have door status auto-update
