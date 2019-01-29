
load('api_timer.js');
let second = 0;
let minute = 0;
let hour = 0;
/*let now = Timer.now();
let format = Timer.fmt("Now it's %R.", now);*/

function min_timer_callback(){
    if(second===59){
        second = 0;
        if(minute===59){
            minute = 0;
            hour++;
        } else{
            minute++;
        }
    } else {
        second++;
    }
    
    
    print('Time since started: ', hour,':', minute, ':', second);
}

Timer.set(1000, Timer.REPEAT, min_timer_callback, null);