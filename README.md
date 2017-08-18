# halva
My web-enabled garage door opener, like "Open, Sesame!" but tastier.

This was a quick one that I put together to get around not having a remote for one of my garage doors.

The basic ingredients:
* Raspberry pi
* Sainsmart relay
* powerline networking adapter because the ground is frozen and I can't run ethernet and I don't believe in wireless
* some magnetic reed switches from the local surplus store

## TODO
* alert if garage door has been left open for N minutes
  * every N minutes? exponentially?
  * automatically close after some time (duration or time of day)?
* favicon
* ajax-ify open buttons to improve responsiveness when opening both doors
