'use strict';

function strTo16BitArray(hexStr) {
    hexStr = hexStr.toUpperCase().replace(/[^0-9A-F]/g, '');
    if (hexStr.length % 4 !== 0) {
        console.error("String length must be a multiple of 4");
        return [];
    }

    const result = [];
    for (let i = 0; i < hexStr.length; i += 4) {
        // 将每4个字符视为一个16进制数，并转换为10进制数值
        result.push(parseInt(hexStr.substr(i, 4), 16));
    }

    return result;
}

function connectWebSocket(spectrum) {
    var ws = new WebSocket("ws://" + window.location.host + "/websocket");
    ws.onopen = function(evt) {
        console.log("connected!");
    }
    ws.onclose = function(evt) {
        console.log("closed");
        setTimeout(function() {
            connectWebSocket(spectrum);
        }, 1000);
    }
    ws.onerror = function(evt) {
        console.log("error: " + evt.message);
    }
    ws.onmessage = function (evt) {
        // console.log(evt);
        var data = JSON.parse(evt.data);
        if (data.s) {
            spectrum.addData(data.s);
        }else if(data.hex){
            spectrum.addData(strTo16BitArray(data.hex));
        }
         else {
            if (data.center) {
                spectrum.setCenterHz(data.center);
            }
            if (data.span) {
                spectrum.setSpanHz(data.span);
            }
        }
    }
}

function main() {
    // Create spectrum object on canvas with ID "waterfall"
    var spectrum = new Spectrum(
        "waterfall", {
            spectrumPercent: 70
    });

    // Connect to websocket
    connectWebSocket(spectrum);

    // Bind keypress handler
    window.addEventListener("keydown", function (e) {
        spectrum.onKeypress(e);
    });
}

window.onload = main;
