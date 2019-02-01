load('api_timer.js');
load('api_i2c.js');
load('api_gpio.js');
load('api_adc.js');
load('api_pwm.js');


let MCP9808_I2CADDR = 0x18;             // 0x0011000 std slave address
let MCP9808_REG_AMBIENT_TEMP = 0x05;    // 0b00000101 temp data reg

let PIN_LEDY = 15; // Yellow LED
let PIN_LEDG = 32; // Green LED
let PIN_LEDR = 14; // Red LED

let PIN_ADC = 36; // Potentiometer

let PIN_PWM = 27; // buzzer

GPIO.setup_output(PIN_LEDR, 0);
GPIO.setup_output(PIN_LEDG, 0);
GPIO.setup_output(PIN_LEDY, 0);

ADC.enable(PIN_ADC);

let templim = 1/30;        // gradescale for potentiometer

/**Following is the first read to let the sensor read the first time, which is
 * incorrect.
*/
let i2c_h = I2C.get();                  // I2C handle
let t = I2C.readRegW(i2c_h, MCP9808_I2CADDR, MCP9808_REG_AMBIENT_TEMP);

let tempC = t & 0x0fff;                 // bitwise AND to strip non-temp bits
tempC = tempC/16.0;                     // convert to decimal


let lampIsOff = true;
function temp_printer(){
    let i2c_h = I2C.get();                  // I2C handle
    let t = I2C.readRegW(i2c_h, MCP9808_I2CADDR, MCP9808_REG_AMBIENT_TEMP);

    let tempC = t & 0x0fff;                 // bitwise AND to strip non-temp bits
    tempC = tempC/16.0;                     // convert to decimal
    print("Temperature: ", Math.round(tempC));

    let scaledTempLim = Math.round(templim*ADC.read(PIN_ADC));
    print("Temperature limit: ", scaledTempLim);

    if(tempC >= scaledTempLim) {
        //SKA LARMA
        print("VARMT!");
        //SKA LÅTA (IO27)
        PWM.set(PIN_PWM, 50, 1);
        //SKA BLINKA
        if(lampIsOff){
            GPIO.write(PIN_LEDR, 1);
            lampIsOff = false;
        } else {
            GPIO.write(PIN_LEDR, 0);
            lampIsOff = true;
        }
    } else {
        PWM.set(PIN_PWM, 50, 0);
        GPIO.write(PIN_LEDR, 0);
    }
}

Timer.set(1000, Timer.REPEAT, temp_printer, null);