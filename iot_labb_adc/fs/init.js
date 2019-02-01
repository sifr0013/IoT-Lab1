load('api_timer.js');
load('api_gpio.js');
load('api_adc.js');

let PIN_LEDR = 15; // Red LED
let PIN_LEDG = 32; // Green LED
let PIN_LEDY = 14; // Yellow LED

let PIN_ADC = 36; // Potentiometer

let oneV = 4095/3.3;

GPIO.setup_output(PIN_LEDR, 0);
GPIO.setup_output(PIN_LEDG, 0);
GPIO.setup_output(PIN_LEDY, 0);

ADC.enable(PIN_ADC);

function read_ADC(){
    print(ADC.read(PIN_ADC),'mV');
}

function ADC_lights(){
    if(ADC.read(PIN_ADC) >= 1*oneV){
        GPIO.write(PIN_LEDY, 1);
    } else {
        GPIO.write(PIN_LEDY, 0);
    }
    if(ADC.read(PIN_ADC) >= 2*oneV){
        GPIO.write(PIN_LEDG, 1);
    } else {
        GPIO.write(PIN_LEDG, 0);
    }
    if(ADC.read(PIN_ADC) >= 3*oneV){
        GPIO.write(PIN_LEDR, 1);
    } else {
        GPIO.write(PIN_LEDR, 0);
    }
}

Timer.set(1000, Timer.REPEAT, read_ADC, null);
Timer.set(10, Timer.REPEAT, ADC_lights, null);
