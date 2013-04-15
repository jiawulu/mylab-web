//$('#main').css({'height':1000});
//$("#sub1").css({height:600});
//alert($(document.body).height())

window.scrollTop = function () {
    if (document.body.clientHeight - window.innerHeight > 0) {
        console.log("scrll top,from clientHeight|innerHeight:" + document.body.clientHeight + "|" + window.innerHeight)
        window.scroll(0, 0);
        return true;
    }
    return false;
}

setTimeout(function(){
    window.scroll(0,0);
},100);


window.scroll(0,0);

document.addEventListener('touchmove', function (e) {
    e.preventDefault();
}, false);

$("input").on("focus",function(){
    this.timerFoucs && clearInterval(this.timerFoucs) && (this.timerFoucs = null);
    var i = 0;
    console.log("focus");
    this.timerFoucs = setInterval(function(){
        i++;
        if( window.webApp.scrollTop()){
            console.log(i);
        }
    },10);
})

$("input").on("blur",function(){
//    this.timerFoucs && clearInterval(this.timerFoucs);
    console.log("blur");
})