define(function (require, exports, module) {

    var defaultData = {
        refer: document.referrer,
        hisStack: [],
        times: -1
    }
    var data = restore() || defaultData;

    exports.add = function (hash) {
        var tmpStack = [];
        var i = 0;
        var hisStack = data.hisStack;
        while (i < hisStack.length) {
            if (hisStack[i].hash == hash) {
                break;
            } else {
                tmpStack.push(hisStack[i])
            }
            i++;
        }
        data.hisStack = tmpStack;
        addHash(hash);
    }

    function addHash(hash, origin) {
        var hisStack = data.hisStack, times = data.times;
        hisStack.push({hash: hash, hisLen: ++times, orignHash: origin ? origin : location.hash,
            isFromBack: function () {
                return  times - this.hisLen === 1;
            }, toString: function () {
                return (this.refer ? this.refer : "") + "|" + (this.hash ? this.hash : "")
                    + "|" + (this.orignHash ? this.orignHash : "") + "|" + (this.hisLen ? this.hisLen : "");
            }});
    }

    exports.back = function () {
        var hisStack = data.hisStack;
//        if (hisStack.length > 0 && "index" == hisStack[hisStack.length - 1].hash) {
//            return true;
//        }
        var prevHash = null;
        if (hisStack.length > 1) {
            prevHash = hisStack[hisStack.length - 2];
        }

        if (prevHash) {
            if (prevHash.isFromBack()) {
                data.times = data.times - 2;
                history.back();
            } else {
                window.location.href = ((prevHash && prevHash.orignHash) ? prevHash.orignHash : "#index");
            }
        } else {
            window.location.href = (function () {
                if (data.refer) {
                    return data.refer;
                }
                if (window.defaultBackPage) {
                    return window.defaultBackPage;
                }
                return "http://m.taobao.com";
            })();
        }
    }


    function store() {
        localStorage.setItem("hisData"+location.pathname, JSON.stringify(data));
    }

    function restore() {
        try {
            return JSON.parse(localStorage.getItem("hisData"+location.pathname));
        } catch (e) {
            return null;
        }
    }

    //restore stack
    restore();
    //compare

    //resume stack  or start a new one


    window.onbeforeunload = function (e) {
        //存储当前
        console.log(e);
        store();
    }

    //===================For test=========================
    exports.getHisStack = function () {
        return data.hisStack;
    }

});