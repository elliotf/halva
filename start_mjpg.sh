#!/bin/sh -xe

exec /usr/local/bin/mjpg_streamer -i "input_uvc.so -r 1280x720 -f 10" -o "output_http.so"
