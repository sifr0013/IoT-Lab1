/** SKA VARA AV TYPEN SUBSCRIBER */
load('api_timer.js'); // För att skapa loopar i systemet
load('api_gpio.js'); // För att hantera output/input (I det här fallet output)
load('api_mqtt.js'); // Ladda in MQTT
load('api_i2c.js'); // Ladda in paketet för temperatursensorn

/**Brädet är orienterat med Knapp-ESPen till vänster */
let PIN_LEDR = 33;
let PIN_LEDY1 = 15;
let PIN_LEDY2 = 14;
let PIN_LEDG = 32;

let MCP9808_I2CADDR = 0x18;             // 0x0011000 std slave address
let MCP9808_REG_AMBIENT_TEMP = 0x05;    // 0b00000101 temp data reg
let templim = 1/30;        // Gradskala för potentiometer

/**Följande är den första läsningen av sensorns data. Detta för att första läsningen
 * är av signal 3,3V och ska bortses från.
*/
let i2c_h = I2C.get();                  // I2C handle
let t = I2C.readRegW(i2c_h, MCP9808_I2CADDR, MCP9808_REG_AMBIENT_TEMP);

let tempC = t & 0x0fff;                 // bitwise AND to strip non-temp bits
tempC = tempC/16.0;                     // convert to decimal

let topic_onoff = 'lab2mqtt/onoff';
let topic_dimmer = 'lab2mqtt/dimmer';
let topic_larm = 'lab2mqtt/larm';
let topic_sensor = 'lab2mqtt/sensor';

let tempLimit = 27; // Variabel för att ändra larmets temperaturgräns.

GPIO.setup_output(PIN_LEDR, 0);
GPIO.setup_output(PIN_LEDY1, 0);
GPIO.setup_output(PIN_LEDY2, 0);
GPIO.setup_output(PIN_LEDG, 0);

let dimmer_signal = 1;
let onoff_signal = 0;
let larm_signal = 0;

/**Funktion för att subscriba till topic onoff samt slå av och på lamporna
 * beroende på signal från MQTT.
 */
function subscribe_to_onoff(){
    MQTT.sub(topic_onoff, function(conn, topic, msg) {
        onoff_signal = JSON.parse(msg);
        if(onoff_signal === 0){
            toggle_larm();
            turn_off_lamps();
        } else if (onoff_signal === 1){
            turn_on_lamps();
            toggle_larm();
        }
      }, null);
}

/**Funktion för att subscriba till topic dimmer samt ändra dimmerns
 * inställning beroende på signal från MQTT.
*/
function subscribe_to_dimmer(){
    MQTT.sub(topic_dimmer, function(conn, topic, msg) {
        dimmer_signal = JSON.parse(msg);
        if(onoff_signal === 1){
            turn_on_lamps();
            toggle_larm();
        }
      }, null);
}

/**Funktion för att subscriba till topic larm samt slå av och på larm
 * beroende på signal från MQTT
*/
function subscribe_to_larm(){
    MQTT.sub(topic_larm, function(conn, topic, msg) {
        larm_signal = JSON.parse(msg);
        toggle_larm();
      }, null);
}

/**Funktion för att sätta på lamporna. Vilka lampor som tänds beror på dimmer_signal.
 * Kallas även av dimmer för att uppdatera vilka lampor som lyser.
 */
function turn_on_lamps(){
    if (dimmer_signal === 1){
        GPIO.write(PIN_LEDR, 1);
        GPIO.write(PIN_LEDY1, 0);
        GPIO.write(PIN_LEDY2, 0);
        GPIO.write(PIN_LEDG, 0);
    } else if (dimmer_signal === 2){
        GPIO.write(PIN_LEDR, 1);
        GPIO.write(PIN_LEDY1, 1);
        GPIO.write(PIN_LEDY2, 0);
        GPIO.write(PIN_LEDG, 0);
    } else if (dimmer_signal === 3){
        GPIO.write(PIN_LEDR, 1);
        GPIO.write(PIN_LEDY1, 1);
        GPIO.write(PIN_LEDY2, 1);
        GPIO.write(PIN_LEDG, 0);
    } else if (dimmer_signal === 4){
        GPIO.write(PIN_LEDR, 1);
        GPIO.write(PIN_LEDY1, 1);
        GPIO.write(PIN_LEDY2, 1);
        GPIO.write(PIN_LEDG, 1);
    }
}

/**Funktion för att stänga av alla lampor. Kallas av onoff funktionen. */
function turn_off_lamps(){
    GPIO.write(PIN_LEDR, 0);
    GPIO.write(PIN_LEDY1, 0);
    GPIO.write(PIN_LEDY2, 0);
    GPIO.write(PIN_LEDG, 0);
}

/**Funktion för att toggla larmet. */
function toggle_larm(){
    if (larm_signal === 1 && onoff_signal === 1){ // Om larmet är på och lamporna är på
        if (dimmer_signal === 1){
            GPIO.blink(PIN_LEDR, 1000,1000);
            GPIO.blink(PIN_LEDY1, 0,0);
            GPIO.blink(PIN_LEDY2, 0,0);
            GPIO.blink(PIN_LEDG, 0,0);
        } else if (dimmer_signal === 2){
            GPIO.blink(PIN_LEDR, 1000,1000);
            GPIO.blink(PIN_LEDY1, 1000,1000);
            GPIO.blink(PIN_LEDY2, 0,0);
            GPIO.blink(PIN_LEDG, 0,0);
        } else if (dimmer_signal === 3){
            GPIO.blink(PIN_LEDR, 1000,1000);
            GPIO.blink(PIN_LEDY1, 1000,1000);
            GPIO.blink(PIN_LEDY2, 1000,1000);
            GPIO.blink(PIN_LEDG, 0,0);
        } else if (dimmer_signal === 4){
            GPIO.blink(PIN_LEDR, 1000,1000);
            GPIO.blink(PIN_LEDY1, 1000,1000);
            GPIO.blink(PIN_LEDY2, 1000,1000);
            GPIO.blink(PIN_LEDG, 1000,1000);
        }
    } else {
        GPIO.blink(PIN_LEDR, 0,0);
        GPIO.blink(PIN_LEDY1, 0,0);
        GPIO.blink(PIN_LEDY2, 0,0);
        GPIO.blink(PIN_LEDG, 0,0);
        turn_on_lamps();
    }
}


let published_larm_from_limit = false;
/**Funktion som ska kallas av en Timer. Publishar sensorns data till topic_sensor. */
function temp_publisher(){
    let t = I2C.readRegW(i2c_h, MCP9808_I2CADDR, MCP9808_REG_AMBIENT_TEMP);
    let tempC = t & 0x0fff;                 // bitwise AND to strip non-temp bits
    tempC = Math.round(tempC/16.0);         // convert to decimal and round

    if(MQTT.isConnected()){
        MQTT.pub(topic_sensor, JSON.stringify(tempC)+"-"+ JSON.stringify(tempLimit), 0, 0); // Publish sensor info
        if (tempC >= tempLimit && !published_larm_from_limit){
            MQTT.pub(topic_larm, '1', 0, 0); //Skicka ut ett larm om sensorn överstiger limiten.
            published_larm_from_limit = true; //Gör så att loopen bara publishar en gång
        } else if (tempC < tempLimit && published_larm_from_limit){ //Publisha en avstängningssignal från loopen en gång
            MQTT.pub(topic_larm, '0', 0, 0);
            published_larm_from_limit = false;
        }
    } else {
        print("MQTT not connected. Please try again.");
    }
}

// -*-*-*-*-*-*-*-*-*-*-*-* KÖR PROGRAMMET *-*-*-*-*-*-*-*-*-*-*-*-*
subscribe_to_onoff();
subscribe_to_dimmer();
subscribe_to_larm();
Timer.set(1000, Timer.REPEAT, temp_publisher, null);