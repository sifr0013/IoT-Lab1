load('api_timer.js');
load('api_gpio.js');

let PIN_LEDR = 15; // Red LED
let PIN_LEDG = 32; // Green LED
let PIN_LEDY = 14; // Yellow LED

let PIN_BTN1 = 4; // Button 1
let PIN_BTN2 = 21; // Button 2

GPIO.setup_output(PIN_LEDR, 0);
GPIO.setup_output(PIN_LEDG, 0);
GPIO.setup_output(PIN_LEDY, 0);

GPIO.setup_input(PIN_BTN1, GPIO.PULL_UP);
GPIO.setup_input(PIN_BTN2, GPIO.PULL_UP);

function toggle_ledg(milliseconds){
    GPIO.toggle(PIN_LEDG);
    sleep(milliseconds);
};

function press_btn_1(){
    if(GPIO.read(PIN_BTN1)===0){
        GPIO.blink(PIN_LEDG, 1000, 1000);
        
    } else if(GPIO.read(PIN_BTN1)===1){
        GPIO.blink(PIN_LEDG, 0, 0);
        GPIO.write(PIN_LEDG, 0);
    }
};

let pressed2 = 0;
function press_btn_2_v_2(){
    GPIO.toggle(PIN_LEDY);
    print('Pressed: ',pressed2++);
}

function min_timer_callback(){
    GPIO.toggle(PIN_LEDR);
};

Timer.set(1000, Timer.REPEAT, min_timer_callback, null);
Timer.set(100,Timer.REPEAT, press_btn_1, null);
GPIO.set_button_handler(PIN_BTN2, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 10, press_btn_2_v_2, null);

