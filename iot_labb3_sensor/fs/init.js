load('api_i2c.js'); //Ladda in i2c
load('api_gpio.js'); // För att hantera output/input (I det här fallet output)
load('api_mqtt.js'); // Ladda in MQTT
load('api_timer.js'); // För att skapa loopar i systemet

let MCP9808_I2CADDR = 0x18;             // 0x0011000 std slave address
let MCP9808_REG_AMBIENT_TEMP = 0x05;    // 0b00000101 temp data reg

let topic_temp = "lab3/temp"; //Topic för mqtt

/**Följande är den första läsningen av sensorns data. Detta för att första läsningen
 * är av signal 3,3V och ska bortses från.
*/
let i2c_h = I2C.get();                  // I2C handle
let t = I2C.readRegW(i2c_h, MCP9808_I2CADDR, MCP9808_REG_AMBIENT_TEMP);

let tempC = t & 0x0fff;                 // bitwise AND to strip non-temp bits
tempC = tempC/16.0;                     // convert to decimal


function temp_publisher(){
    t = I2C.readRegW(i2c_h, MCP9808_I2CADDR, MCP9808_REG_AMBIENT_TEMP);
    tempC = t & 0x0fff;                 // bitwise AND to strip non-temp bits
    tempC = Math.round(tempC/16.0);         // convert to decimal and round
    
    if(MQTT.isConnected()){
        MQTT.pub(topic_temp, JSON.stringify(tempC), 0, 0); // Publish sensor info
    }
}

// -*-*-*-*-*-*-*-*-*-*-*-* KÖR PROGRAMMET *-*-*-*-*-*-*-*-*-*-*-*-*
Timer.set(1000, Timer.REPEAT, temp_publisher, null);