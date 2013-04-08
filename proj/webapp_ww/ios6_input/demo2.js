window.scrollTop = function () {
    if (document.body.clientHeight - window.innerHeight > 0) {
        console.log("scrll top,from clientHeight|innerHeight:" + document.body.clientHeight + "|" + window.innerHeight)
        window.scroll(0, 0);
        return true;
    }
    return false;
}

setTimeout(function () {
    window.scroll(0, 0);
}, 100);

document.addEventListener('touchmove', function (e) {
    e.preventDefault();
}, false);

$("div.cover").on("click", function (e) {
    e && e.preventDefault() && e.stopImmediatePropagation();
    $("div.cover").show();
    var cover = $(e.target).hide();
    var obj = cover.next()[0];
    console.log("focus input!!");

    if (!obj.focus || ("true" == $(obj).data("selected"))) {
        return;
    }
    var i = 0;
    var interval = setInterval(function () {
        if (window.scrollTop()) {
            console.log("input focus , scroll top success>>>" + i);
            i = 1000;
        }
        if (i++ > 100) {
            clearInterval(interval);
        }
    }, 10);
    if (obj.value && undefined != obj.selectionStart) {
        obj.selectionStart = obj.value.length;
    } else {
        obj.focus();
    }

    return false;
},this);



$("input").on("focus", function () {
    console.log("focus");
})

$("input").on("blur", function () {
//    this.timerFoucs && clearInterval(this.timerFoucs);
    console.log("blur");
})