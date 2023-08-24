'use strict';

var ws = new WebSocket("ws://" + window.location.host + "/websocket");
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

function sendCommand(cmd) {
	var data = {};
	data["id"] = "cmd";
    data["cmd"] = cmd;
	var json_data = JSON.stringify(data);
	console.log('send json_data to server: ', data);
	ws.send(json_data);
}

function hideSidebarEvent() {
    const toggleButton = document.querySelector('.gg-display-flex');
    const drawer = document.querySelector('.group_3');
    
    // Add click event listener to the toggle button
    toggleButton.addEventListener('click', function() {
        console.log('toggleButton clicked','style.display',drawer.style.display,'classList',drawer.classList);
        if (drawer.style.display === 'none' || !drawer.classList.contains('visible')) {
            drawer.style.display = 'block';
            drawer.classList.add('visible');
          } else {
            drawer.style.display = 'none';
            drawer.classList.remove('visible');
          }
    });
  
}

function startBtnEvent() {
    document.getElementById('start_btn').addEventListener('click', function() {
        console.log('startBtn clicked');
        sendCommand('start');
    });
}

function laserSliderEvent() {
    const laserPowerSlider = document.getElementById('laserPowerSlider');
    const laserPowerValue = document.getElementById('laserPowerValue');
    
    laserPowerSlider.addEventListener('change', function() {
        // Display the current value
        laserPowerValue.textContent = laserPowerSlider.value;
        // convert Voltage to DAC value
        let dacValue = Math.round(laserPowerSlider.value * 256 / 3.3);
        dacValue = dacValue > 192 ? 192 : dacValue;
        sendCommand(`o ${dacValue}`);
    });
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

    hideSidebarEvent();
    startBtnEvent();
    laserSliderEvent();
}

window.onload = main;
