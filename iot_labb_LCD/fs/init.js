load('api_timer.js');
load('api_i2c.js');
load('api_gpio.js');
load('api_adc.js');
load('api_pwm.js');
load('api_spi.js');
load('api_sys.js');


let MCP9808_I2CADDR = 0x18;             // 0x0011000 std slave address
let MCP9808_REG_AMBIENT_TEMP = 0x05;    // 0b00000101 temp data reg

let PIN_LEDY = 15; // Yellow LED
let PIN_LEDG = 32; // Green LED
let PIN_LEDR = 14; // Red LED

let PIN_ADC = 36; // Potentiometer

let PIN_PWM = 27; // buzzer

let PIN_LCD = 13; // LCD

GPIO.setup_output(PIN_LEDR, 0);
GPIO.setup_output(PIN_LEDG, 0);
GPIO.setup_output(PIN_LEDY, 0);
GPIO.setup_output(PIN_LCD, 0);

ADC.enable(PIN_ADC);

let templim = 1/30;        // gradescale for potentiometer

/**Following is the first read to let the sensor read the first time, which is
 * incorrect.
*/
let i2c_h = I2C.get();                  // I2C handle
let t = I2C.readRegW(i2c_h, MCP9808_I2CADDR, MCP9808_REG_AMBIENT_TEMP);

let tempC = t & 0x0fff;                 // bitwise AND to strip non-temp bits
tempC = tempC/16.0;                     // convert to decimal

let spi_h = SPI.get();
let spi_param = {cs: 0, mode: 0, freq: 100000, hd: {tx_data: "", rx_len: 0}};

function lcd_init(){
    lcd_cmd("\x39");
    Sys.usleep(30*1000);
    lcd_cmd("\x15");
    Sys.usleep(30*1000);
    lcd_cmd("\x55");
    Sys.usleep(30*1000);
    lcd_cmd("\x6E");
    Sys.usleep(30*1000);
    //lcd_cmd("\x72"); //Contrast C1
    lcd_cmd("\x70"); //Contrast C0
    Sys.usleep(30*1000);
    lcd_cmd("\x38");
    Sys.usleep(30*1000);
    lcd_cmd("\x0C"); //Display on, cursor on, cursor blink on
    //lcd_cmd("\x43"); //Display on, cursor off, cursor blink off
    Sys.usleep(30*1000);
    lcd_cmd("\x01");
    Sys.usleep(30*1000);
    lcd_cmd("\x06");
    Sys.usleep(30*1000);
}

function lcd_cmd(cmd){
    GPIO.write(PIN_LCD, 0);
    spi_param.hd.tx_data = cmd;
    SPI.runTransaction(spi_h, spi_param);
}


function lcd_write(cmd){
    GPIO.write(PIN_LCD, 1);
    spi_param.hd.tx_data = cmd;
    SPI.runTransaction(spi_h, spi_param);
}

lcd_init(); //Initiate the LCD-screen

//lcd_write("B");

function lcd_changePos(pos){
    lcd_cmd(chr(128+pos));
    Sys.usleep(30*1000);
}

function generate_string(temp, tempLimit, larmIsOn){

    let temp_string = JSON.stringify(temp);
    let tempLim_string = JSON.stringify(tempLimit);
    let celsius = "\xF2"+"C   ";

    let larm = "      ";
    if(larmIsOn){
        larm = "VARMT!";
    }

    lcd_changePos(0);
    lcd_write("TEMP: "+temp_string+celsius);
    lcd_changePos(16);
    lcd_write("LIMIT: "+tempLim_string+celsius);
    lcd_changePos(32);
    lcd_write(larm);
}


let lampIsOff = true;
function temp_printer(){
    let i2c_h = I2C.get();                  // I2C handle
    let t = I2C.readRegW(i2c_h, MCP9808_I2CADDR, MCP9808_REG_AMBIENT_TEMP);

    let tempC = t & 0x0fff;                 // bitwise AND to strip non-temp bits
    tempC = tempC/16.0;                     // convert to decimal
    print("Temperature: ", Math.round(tempC));

    let scaledTempLim = Math.round(templim*ADC.read(PIN_ADC));
    print("Temperature limit: ", scaledTempLim);
    
    let larmIsOn = false;
    if(tempC >= scaledTempLim) {
        //SKA LARMA
        larmIsOn = true;
        //SKA LÅTA (IO27)
        PWM.set(PIN_PWM, 200, 0.5);
        //SKA BLINKA
        if(lampIsOff){
            GPIO.write(PIN_LEDR, 1);
            lampIsOff = false;
        } else {
            GPIO.write(PIN_LEDR, 0);
            lampIsOff = true;
        }
    } else {
        PWM.set(PIN_PWM, 200, 0);
        GPIO.write(PIN_LEDR, 0);
    }
    generate_string(Math.round(tempC),scaledTempLim,larmIsOn);
}





Timer.set(1000, Timer.REPEAT, temp_printer, null);