load('api_pwm.js'); //Ladda in pwm
load('api_gpio.js'); // För att hantera output/input (I det här fallet output)
load('api_mqtt.js'); // Ladda in MQTT


let PIN_FAN = 27;
let FREQ = 25000;
GPIO.setup_output(PIN_FAN, 0);
PWM.set(PIN_FAN, FREQ, 0.02);

let topic_larm = "lab3/larm";

function subscribe_to_larm(){
    MQTT.sub(topic_larm, function(conn, topic, msg) {
        let larm_signal = JSON.parse(msg);
        if(larm_signal === 1){
            PWM.set(PIN_FAN, FREQ, 1);
        } else if (larm_signal === 0){
            PWM.set(PIN_FAN, FREQ, 0.02);
        } else {
            print('Error');
        }
      }, null);
}

// -*-*-*-*-*-*-*-*-*-*-*-* KÖR PROGRAMMET *-*-*-*-*-*-*-*-*-*-*-*-*

subscribe_to_larm();