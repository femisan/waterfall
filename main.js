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
        afterConnected();
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

function writeOneReg(reg_addr, reg_value) {
    let sendStr = `w ${reg_addr}:${reg_value}`;
    sendCommand(sendStr);
}

function uint32_to_MSB_LSB(value) {
    let LSB = value & 0xFF;
    let MSB = (value >> 8) & 0xFF;
    return [MSB, LSB];
}

function setExposureTime(exp_time_ms_text) {
    // real exp time will be 200ns * (48+SENSOR_EXP_TIME)
    // if ms smaller than 0.0108 ms, return 0.0108 ms
    let exp_time_ms = parseFloat(exp_time_ms_text);
    exp_time_ms = exp_time_ms < 0.0108 ? 0.0108 : exp_time_ms;

    let exp_time_ns = Math.floor((exp_time_ms * 1.0e6 / 200) - 48);
    // exp_time_ns should not smaller than 6, if smaller than 6, set to 6 and return ms value 
    console.log('setExposureTime', exp_time_ms, exp_time_ns);
    let [EXP_TIME_MSB, EXP_TIME_LSB] = uint32_to_MSB_LSB(exp_time_ns);
    writeOneReg(9, EXP_TIME_LSB);
    writeOneReg(10, EXP_TIME_MSB);
    return exp_time_ms;
}

// function hideSidebarEvent() {
//     const toggleButton = document.getElementById('fullscreen_toggle');
//     const drawer = document.querySelector('.group_3');
    
//     // Add click event listener to the toggle button
//     toggleButton.addEventListener('click', function() {
//         console.log('toggleButton clicked','style.display',drawer.style.display,'classList',drawer.classList);
//         if (drawer.style.display === 'none' || !drawer.classList.contains('visible')) {
//             drawer.style.display = 'block';
//             drawer.classList.add('visible');
//           } else {
//             drawer.style.display = 'none';
//             drawer.classList.remove('visible');
//           }
//     });
  
// }

function hideSidebarEvent() {
    const toggleButton = document.getElementById('fullscreen_toggle');
    const drawer = document.querySelector('.group_3');
    
    // Add click event listener to the toggle button
    toggleButton.addEventListener('click', function() {
        console.log('toggleButton clicked', 'style.display', drawer.style.display, 'classList', drawer.classList);
        
        // Check the current state of the drawer
        if (drawer.style.display === 'none' || !drawer.classList.contains('visible')) {
            // If drawer is hidden, display it
            drawer.style.display = 'block';
            drawer.classList.add('visible');
            
            // // Set the toggleButton class to gg-maximize-alt as drawer is visible
            // toggleButton.classList.remove('gg-minimize-alt');
            // toggleButton.classList.add('gg-maximize-alt');
        } else {
            // If drawer is visible, hide it
            drawer.style.display = 'none';
            drawer.classList.remove('visible');
            
            // Set the toggleButton class to gg-minimize-alt as drawer is hidden
            // toggleButton.classList.remove('gg-maximize-alt');
            // toggleButton.classList.add('gg-minimize-alt');
        }
    });
}



function pauseToggleEvent(spectrum) {
    const pauseToggle = document.getElementById('pause_toggle');
    pauseToggle.addEventListener('click', function() {
        console.log('pauseToggle clicked', pauseToggle.checked);
        
        // Toggle paused state
        spectrum.togglePaused();

        // Toggle the icon class
        if (pauseToggle.classList.contains('gg-play-pause-r')) {
            pauseToggle.classList.remove('gg-play-pause-r');
            pauseToggle.classList.add('gg-play-button-r');
        } else {
            pauseToggle.classList.remove('gg-play-button-r');
            pauseToggle.classList.add('gg-play-pause-r');
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

function afterConnected(){
    const expoTime = localStorage.getItem("input_expotime_value");
    if(expoTime){
        setExposureTime(expoTime);
    }
    // set laser power to 0 every time connected
    sendCommand(`o 0`);
}

function exposureTimeEvent(){

    const inputElement = document.getElementById('input_expotime');

    if(localStorage.getItem("input_expotime_value")) {
        console.log('input_expotime_value', localStorage.getItem("input_expotime_value"));
        inputElement.value = localStorage.getItem("input_expotime_value");
    }

   
    inputElement.addEventListener('change', function() {
        // 获取输入值, ms float
        localStorage.setItem("input_expotime_value", inputElement.value);
        // 检查value是否是有效的数字
        if (!isNaN(value)) {
            console.log('set sepcturm average value', value);// 调用spectrum对象的setAveraging方法
            setExposureTime(inputElement.value);
        }
    });
}

function averageInputEnvet(spectrum) {
   
    const inputElement = document.getElementById('input_average');

    // 添加输入事件监听器
    inputElement.addEventListener('change', function() {
        // 获取输入值
        const value = parseInt(inputElement.value, 10);
        
        // 检查value是否是有效的数字
        if (!isNaN(value)) {
            console.log('set sepcturm average value', value);
            // 调用spectrum对象的setAveraging方法
            spectrum.setAveraging(value);
        }
    });
}

function recordDarkSpecturmEvent(spectrum) {
    const darkBtn = document.getElementById('btn_record_dark');
    darkBtn.addEventListener('click', function() {
        console.log('btn_dark clicked');
        spectrum.resetAll()
        console.log('spectrum data length', spectrum.dataHistory.length);
        // forbid to set laser slider and set laser power to 0
        sendCommand(`o 0`);
       
        spectrum.recordAvg((avg_data)=>{
            console.log('avg_data', avg_data);
            alert('dark spectrum recorded for 100 times, please click "OK" to continue');
        })
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

    pauseToggleEvent(spectrum);
    averageInputEnvet(spectrum);
    recordDarkSpecturmEvent(spectrum);

    hideSidebarEvent();
    // startBtnEvent();
    laserSliderEvent();
    exposureTimeEvent();
    document.getElementById('btn_download').addEventListener('click', function() {
        spectrum.downloadCSV();
    });

    // document.getElementById('btn_clip')?.addEventListener('click', function() {
    //     spectrum.initClippingBox();
    // });
}

window.onload = main;

