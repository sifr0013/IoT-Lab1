/** SKA VARA AV TYPEN PUBLISHER */
load('api_timer.js'); // För att skapa loopar i systemet
load('api_gpio.js'); // För att hantera output/input (I det här fallet input)
load('api_mqtt.js'); // Ladda in MQTT
load('api_spi.js'); // Ladda in LCD
load('api_sys.js'); // Ladda in sleepfunktionalitet

/**Brädet är orienterat med Knapp-ESPen till vänster */
let PIN_BTN_ONOFF = 16; // On/Off
let PIN_BTN_DIMMER = 14; // Dimmer
let PIN_LCD = 15; // LCD

let topic_onoff = 'lab2mqtt/onoff';
let topic_dimmer = 'lab2mqtt/dimmer';
let topic_sensor = 'lab2mqtt/sensor';
let topic_larm = 'lab2mqtt/larm';

GPIO.setup_input(PIN_BTN_ONOFF, GPIO.PULL_UP);
GPIO.setup_input(PIN_BTN_DIMMER, GPIO.PULL_UP);
GPIO.setup_output(PIN_LCD, 0);

let spi_h = SPI.get(); // LCD Handler
let spi_param = {cs: 0, mode: 0, freq: 100000, hd: {tx_data: "", rx_len: 0}}; // Parameter för att skicka text till LCD
let sensor_signal = "orörd";
let sensor_limit_signal = "ble";
let larm_signal = -1;
/**
 * Funktion för att publisha ADC värde till MQTT-servern + 1 för på och 0 för av. Print-outen är för debugging,
 * eftersom den bara syns i inkopplat läge.
 */
let onoff_toggle = false; //Toggle boolean for onoff button.
function btn_onoff_pressed(){ // ON/OFF - SKICKAR VÄRDET FRÅN ADC OM KNAPPEN TOGGLAS PÅ, ANNARS 0.
    if(MQTT.isConnected()){
        if(onoff_toggle){
            MQTT.pub(topic_onoff, "0",0,0);
            onoff_toggle = false;
        } else {
            MQTT.pub(topic_onoff, "1",0,0);
            onoff_toggle = true;
        }
    } else {
        print("MQTT not connected. Please try again.");
    }
}

/**
 * Funktion för att publisha 1 eller 0 till MQTT-servern. 1 för att dimmeret ska sättas på, 0 för att dimmeret
 * ska stängas av.
 */
let dimmer_toggle = 1; //Toggle boolean for dimmer button.
function btn_dimmer_pressed(){ // dimmer-KNAPP - SKICKA KNAPP-VÄRDE
    if(MQTT.isConnected()){
        if(dimmer_toggle === 1) {
            MQTT.pub(topic_dimmer, "1", 0, 0);
            dimmer_toggle = 2;
        } else if (dimmer_toggle === 2) {
            MQTT.pub(topic_dimmer, "2", 0, 0);
            dimmer_toggle = 3;
        } else if (dimmer_toggle === 3) {
            MQTT.pub(topic_dimmer, "3", 0, 0);
            dimmer_toggle = 4;
        } else if (dimmer_toggle === 4) {
            MQTT.pub(topic_dimmer, "4", 0, 0);
            dimmer_toggle = 1;
        }
    } else {
        print("MQTT not connected. Please try again.");
    }
}

/**Funktion för att initiera LCD-skärmen. */
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

/**Funktion för att parsa kommandon till LCD skärm */
function lcd_cmd(cmd){
    GPIO.write(PIN_LCD, 0);
    spi_param.hd.tx_data = cmd;
    SPI.runTransaction(spi_h, spi_param);
}

/**Funktion för att parsa text till LCD skärm */
function lcd_write(cmd){
    GPIO.write(PIN_LCD, 1);
    spi_param.hd.tx_data = cmd;
    SPI.runTransaction(spi_h, spi_param);
}

/**Funktion för att ändra position */
function lcd_changePos(pos){
    lcd_cmd(chr(128+pos));
    Sys.usleep(30*1000);
}

/**Funktion för att skriva ut ny information på LCD-skärmen */
function generate_LCD_text(){ // FYLL PÅ GREJER SOM SKA FYLLA LCDN! KOLLA OM VI KAN FÅ LARM-TEXTEN ATT BLINKA.
    let celsius = "\xF2"+"C   ";
    let larm = "      ";
    if(larm_signal === 1){
        larm = "VARMT!";
    }

    lcd_changePos(0);
    lcd_write("TEMP: "+sensor_signal+celsius); //Skriv på rad 1
    lcd_changePos(16);
    lcd_write("LIMIT: "+sensor_limit_signal+celsius); //Skriv på rad 2
    lcd_changePos(32);
    lcd_write(larm); //Skriv på rad 3
}

/**Funktion för att subscriba till förändringar från sensorn. */
function subscribe_to_sensor(){
    MQTT.sub(topic_sensor, function(conn, topic, msg) {
        let temp_signal = msg;
        splitter(temp_signal);
        generate_LCD_text();
      }, null);
}

/**Funktion för att subscriba till larm. */
function subscribe_to_larm(){
    MQTT.sub(topic_larm, function(conn, topic, msg) {
        larm_signal = JSON.parse(msg);
        generate_LCD_text();
      }, null);
}

function splitter(not_yet_splitted){
    let index = not_yet_splitted.indexOf('-');
    sensor_signal = not_yet_splitted.slice(0,index);
    sensor_limit_signal = not_yet_splitted.slice(index+1,not_yet_splitted.length);
}

// -*-*-*-*-*-*-*-*-*-*-*-* KÖR PROGRAMMET *-*-*-*-*-*-*-*-*-*-*-*-*
lcd_init();
subscribe_to_sensor();
subscribe_to_larm();
GPIO.set_button_handler(PIN_BTN_ONOFF, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 10, btn_onoff_pressed, null);
GPIO.set_button_handler(PIN_BTN_DIMMER, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 10, btn_dimmer_pressed, null);
