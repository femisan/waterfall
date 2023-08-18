#!/usr/bin/env python

# Copyright (c) 2019 Jeppe Ledet-Pedersen
# This software is released under the MIT license.
# See the LICENSE file for further details.

import sys
import json
import argparse


import threading
import json
from time import sleep

# from gnuradio import gr
# from gnuradio import uhd
# from gnuradio.fft import logpwrfft

import numpy as np

from gevent.pywsgi import WSGIServer
from geventwebsocket import WebSocketError
from geventwebsocket.handler import WebSocketHandler

from bottle import request, Bottle, abort, static_file


app = Bottle()
connections = set()
opts = {}


@app.route('/websocket')
def handle_websocket():
    wsock = request.environ.get('wsgi.websocket')
    if not wsock:
        abort(400, 'Expected WebSocket request.')

    connections.add(wsock)
   
    # Send center frequency and span
    wsock.send(json.dumps(opts))
    tb = SenderThread()
    tb.start()
    print('start thread to send')
    while True:
        try:
            wsock.receive()
        except WebSocketError:
            break

    connections.remove(wsock)


@app.route('/')
def index():
    return static_file('index.html', root='.')


@app.route('/<filename>')
def static(filename):
    return static_file(filename, root='.')

def get_spectrum_data():
    # data = np.zeros(4096)
    data = np.random.randint(low=1000, high=2000, size=4096)

    # Set the number of peaks
    num_peaks = 4
    peak_span = 30

    # Generate random indices for the peaks
    peak_indices = np.random.randint(0, 4096, num_peaks)

    # Generate random peak values in the range [300, 65535]
    peak_values = np.random.randint(10000, 40000, num_peaks)

    for i, one_index in enumerate( peak_indices.tolist()):
        left_index = one_index - peak_span if one_index - peak_span >= 0 else 0
        right_index = one_index + peak_span if one_index + peak_span < 4096 else 4096
        data[left_index: one_index] = np.linspace(int(0.2*peak_values[i]), peak_values[i], one_index - left_index)
        data[one_index: right_index] = np.linspace(peak_values[i] , int(0.2*peak_values[i]), right_index - one_index)

    # Assign the peak values to the corresponding indices in the data array
    
    return data


class SenderThread(threading.Thread):
    def __init__(self):
        threading.Thread.__init__(self)
        # self.connections = connections
        self.p = get_spectrum_data()
        # self.connection = ws_conn
        self.stop_event = threading.Event()  # Flag to stop the thread when needed

    def start(self):
        # This method will be called when the thread starts
        # while not self.stop_event.is_set():
        print('start sending data')
        for c in connections:
            try:
                while True:
                    self.p = get_spectrum_data()
                    payload = json.dumps({'s': self.p.tolist()}, separators=(',', ':'))
                    # print('ws payload type', type(payload))
                    c.send(payload)
                    sleep(0.2)
            except Exception:
                connections.remove(c)

    def stop(self):
        # Method to stop the thread
        self.stop_event.set()



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-s', '--sample-rate', type=float, default=40e6)
    parser.add_argument('-f', '--frequency', type=float, default=940e6)

    args = parser.parse_args()

    opts['center'] = args.frequency
    opts['span'] = args.sample_rate

    server = WSGIServer(("0.0.0.0", 8000), app, handler_class=WebSocketHandler)
    print('serving at port', 8000)
    
    try:
        server.serve_forever()
    except Exception:
        sys.exit(0)



if __name__ == '__main__':
    main()
