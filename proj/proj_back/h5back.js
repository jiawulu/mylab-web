document.addEventListener("DOMContentLoaded",function() {
    function filterRefer(refer, exceptRegs) {
        if (refer) {
            if (!refer.match('^http[s]?://[^/]*\\.(taobao|tmall|etao|alibaba|alipay|aliyun)\\.com/')) {
                return null;
            }
            if(backData.whiteRegs){
                for (var i = 0; i < backData.whiteRegs.length; i++) {
                    if (refer.match(backData.whiteRegs[i])) {
                        return refer;
                    }
                }
            }
            for (var i = 0; i < exceptRegs.length; i++) {
                if (refer.match(exceptRegs[i])) {
                   return null;
                }
            }
        }
        return refer;
    }
    function writeAndBack(regs, backNames) {
        //put it in localstorage
        for (var i = 0; i < regs.length; i++) {
            if (_refer.match(regs[i])) {
                back_nick.innerHTML = backNames[i];
                var _refers = {
                    refer: _refer,
                    hisLen: history.length,
                    name: backNames[i]
                };
                //add refer info to localstorage
                localStorage.setItem(key, JSON.stringify(_refers));
                back_btn.onclick=function() {
                    _refers.skip = true;
                    localStorage.setItem(key, JSON.stringify(_refers));
                    if(location.hash){
                        window.location.href = _refers.refer;
                    }else{
                        history.back();
                    }
                    return false;
                };
                return true;
            }
        };
        return false;
    }

    function readAndJump() {
        var _refers = window.localStorage.getItem(key);
        if (_refers) {
            _refers = JSON.parse(_refers);
            console.log(_refers);
            var historyLength = history.length;
            var num = _refers.hisLen - historyLength - 1;
            if (nofresh) {
                back_btn.onclick=function() {
                    if(location.hash){
                        window.location.href = _refers.refer;
                    }else{
                        history.go(num);
                    }
                    return false;
                };
                back_nick.innerHTML = _refers.name;
            } else {
                //check 死循环
                if (!_refers.skip) {
                    back_btn.onclick=function() {
                        _refers.skip = true;
                        localStorage.setItem(key, JSON.stringify(_refers));
                        window.location.href = _refers.refer;
                    };
                    back_nick.innerHTML = _refers.name;
                } else {
                    goIndex();
                }
            }
        } else {
            goIndex();
        }
    }
    function goIndex() {
        back_nick.innerHTML = "首页";
        back_btn.onclick =  function() {
            window.location.href = _index;
            return false;
        };
    }
    var backData = window.backData;
    var key = backData.key;
    var back_btn = document.getElementById(backData.backBtn);
    var back_nick = document.getElementById(backData.backNick);
    var nofresh = backData.nofresh;
    var backNames = backData.backNames;
    var regs = backData.regs;
    var _refer = filterRefer(document.referrer,backData.exceptRegs);
    var _index = window.backData.index;
    console.log("refer is :" + _refer);
    if (_refer) {
        writeAndBack(regs, backNames);
    } else {
        readAndJump();
    }
},false);
