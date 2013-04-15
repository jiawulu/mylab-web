seajs.config({
    alias: {
        'underscore': 'http://a.tbcdn.cn/mw/base/libs/underscore/1.3.3/underscore',
        'zepto': 'http://a.tbcdn.cn/mw/base/libs/zepto/1.0.0/zepto',
        'mustache': 'http://a.tbcdn.cn/mw/base/libs/mustache/0.5.0/mustache'
    }
});

define(function (require, exports, module) {

    var history = require('./history.js'),
         _ = require('underscore'),
        $ = require('zepto'),
        mustache = require('mustache');

    var tmp = "<ul>{{#.}}<li>{{info}}</li>{{/.}}</ul>";

//    addHash();

    $(window).on('hashchange', function(e){
        updateStackInfo();
    });

    document.getElementById("back").onclick = function(){
        history.back();
    }

    function updateStackInfo(){
        var stacks = history.getHisStack();

        stacks.info = function () {
            return (this.refer ? this.refer : "") + "|" + (this.hash ? this.hash : "")
                + "|" + (this.orignHash ? this.orignHash : "") + "|" + (this.hisLen ? this.hisLen : "");
        }
        var result = mustache.render(tmp,stacks);

        //console.log(result);
        $("#hisStack").html(result);
    }

    setTimeout(function(){updateStackInfo()},200)


});