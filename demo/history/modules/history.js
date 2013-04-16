define(function (require, exports, module) {

    var $ = require('zepto'),
        storageKey = "hisTrace" + location.pathname,
        defaultHisTrace = {
            entrance: document.referrer,
            stack: [],
            index: -1
        },
        hisTrace = restore() || defaultHisTrace;

    hisTrace.outerBack = function(){
        return this.exit && document.referrer &&
            document.referrer.indexOf(this.exit.split("#")[0]) >= 0;
    };
    hisTrace.innerBack =  function (hisItem) {
        return  this.index - hisItem.hisLen === 1;
    };
    function addHash() {
        var hash = location.hash.split("-")[0] || "#index",
            tmpStack = [],
            i = 0,
            hisStack = hisTrace.stack;
        while (i < hisStack.length) {
            if (hisStack[i].hash == hash) {
                break;
            } else {
                tmpStack.push(hisStack[i])
            }
            i++;
        }
        hisTrace.stack = tmpStack;

        var hisStack = hisTrace.stack;
        hisStack.push({hash: hash, hisLen: ++hisTrace.index,
            orignHash: location.hash});
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
            if ( hisTrace.innerBack(prevHash)) {
                hisTrace.index = hisTrace.index - 2;
                history.back();
            } else {
                window.location.href = ((prevHash && prevHash.orignHash) ? prevHash.orignHash : "#index");
            }
        } else {
            window.location.href = ( hisTrace.entrance || window.defaultBackPage
                || "http://m.taobao.com");
        }
    }

    function restore() {
        try {
            return JSON.parse(localStorage.getItem(storageKey));
        } catch (e) {
            return null;
        }
    }

    //resume stack  or start a new one
    $(window).on("beforeunload", function () {
        //存储当前
        console.log(hisTrace);
        if (hisTrace.exit) {
            localStorage.setItem(storageKey, JSON.stringify(hisTrace));
        } else {
            localStorage.removeItem(storageKey);
        }
    });

    $(window).on('hashchange', function () {
        addHash();
    });

    console.log(hisTrace);
    //compare
    if (!hisTrace.outerBack()) {
        hisTrace = defaultHisTrace;
        addHash();
    }else{
        //TODO 添加最后一个hash
        if(hisTrace.stack.length){
            var originHash = hisTrace.stack[hisTrace.stack.length-1].orignHash;
            originHash && (window.location.href = originHash) ;
        }
    }

    exports.addExit = function (exit) {
        hisTrace.exit = exit;
    }

    //===================For test=========================
    exports.getHisStack = function () {
        return hisTrace.stack;
    }

});