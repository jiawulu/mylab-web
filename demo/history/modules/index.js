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

    var tmp = "<ul>{{#.}}<li>{{toString}}</li>{{/.}}</ul>";


    function addHash(){
        var hash = location.hash.split("-")[0];
        history.add(hash);
        updateStackInfo();
    }

    addHash();

    window.onhashchange = function(e){
        addHash();
    }

    document.getElementById("back").onclick = function(){
        history.back();
    }


    function updateStackInfo(){

        var stacks = history.getHisStack();

        var result = mustache.render(tmp,stacks);

        console.log(result);

        $("#hisStack").html(result);



    }




});