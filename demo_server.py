#!/usr/bin/env python


import sys
import json
import argparse


import threading
import json
from time import sleep


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
    wsock.send(json.dumps(opts))  # Send center frequency and span

    while True:
        try:
            message = wsock.receive()
            if message:
                print(f"Received message: {message}")
        except WebSocketError:
            break

    connections.remove(wsock)


@app.route('/')
def index():
    return static_file('root.html', root='.')


@app.route('/<filename>')
def static(filename):
    return static_file(filename, root='.')

@app.route('/imgs/<filename:re:.*\.png>')
def send_image(filename):
    return static_file(filename, root='imgs', mimetype='image/png')


def broadcast_data():
    while True:
        data = get_spectrum_data()
        payload = json.dumps({'s': data.tolist()}, separators=(',', ':'))
        disconnected_clients = set()

        for client in connections:
            try:
                client.send(payload)
            except Exception:
                disconnected_clients.add(client)

        for client in disconnected_clients:
            connections.remove(client)

        sleep(0.2)

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
        super(SenderThread, self).__init__(daemon=True)

    # define the function to run in the thread
    def run(self):
        broadcast_data()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-s', '--sample-rate', type=float, default=40e6)
    parser.add_argument('-f', '--frequency', type=float, default=940e6)

    args = parser.parse_args()

    opts['center'] = args.frequency
    opts['span'] = args.sample_rate

    tb = SenderThread()
    tb.start()  # Start the thread only once

    server = WSGIServer(("0.0.0.0", 8000), app, handler_class=WebSocketHandler)
    print('serving at port', 8000)
    
    try:
        server.serve_forever()
    except Exception:
        sys.exit(0)

if __name__ == '__main__':
    main()
