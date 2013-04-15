define(function (require, exports, module) {

    var $ = require('zepto'),
        defaultHisTrace = {
            entrance:document.referrer,
            stack:[],
            index:-1,
            fromBack:function(){
                return this.exit && document.referrer &&
                    this.exit.indexOf(document.referrer) === 0;
            }
        };
        hisTrace = restore() || defaultHisTrace;


    exports.add = function (hash) {
        var tmpStack = [];
        var i = 0;
        var hisStack = hisTrace.stack;
        while (i < hisStack.length) {
            if (hisStack[i].hash == hash) {
                break;
            } else {
                tmpStack.push(hisStack[i])
            }
            i++;
        }
        hisTrace.stack = tmpStack;
        addHash(hash);
    }

    function addHash(hash) {
        var hisStack = hisTrace.stack, index = hisTrace.index;
        hisStack.push({hash:hash, hisLen:++index, orignHash:location.hash,
            isFromBack:function () {
                return  index - this.hisLen === 1;
            }, toString:function () {
                return (this.refer ? this.refer : "") + "|" + (this.hash ? this.hash : "")
                    + "|" + (this.orignHash ? this.orignHash : "") + "|" + (this.hisLen ? this.hisLen : "");
            }});
    }

    exports.back = function () {
        var hisStack = hisTrace.stack;
//        if (hisStack.length > 0 && "index" == hisStack[hisStack.length - 1].hash) {
//            return true;
//        }
        var prevHash = null;
        if (hisStack.length > 1) {
            prevHash = hisStack[hisStack.length - 2];
        }

        if (prevHash) {
            if (prevHash.isFromBack()) {
                hisTrace.times = hisTrace.times - 2;
                history.back();
            } else {
                window.location.href = ((prevHash && prevHash.orignHash) ? prevHash.orignHash : "#index");
            }
        } else {
            window.location.href = hisTrace.entrance || window.defaultBackPage
                || "http://m.taobao.com";
        }
    }

    function store() {
        //localStorage.setItem("hisData"+location.pathname, JSON.stringify(hisTrace));
    }

    function restore() {
        try {
            return JSON.parse(localStorage.getItem("hisData" + location.pathname));
        } catch (e) {
            return null;
        }
    }

    //resume stack  or start a new one
    $(window).on("beforeunload", function (e) {
        //存储当前
        store();
    });

    //===================For test=========================
    exports.getHisStack = function () {
        return hisTrace.stack;
    }

    //compare
    if(!hisTrace.fromBack()){
        hisTrace = defaultHisTrace;
        var hash = location.hash.split("-")[0] || "#index";
        exports.add(hash);
    }

});