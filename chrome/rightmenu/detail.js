var wapPatterns = [];

["m", "waptest", "wapa"].forEach(
    function(x) { ["taobao", "tmall"].forEach(function(y) {
        wapPatterns.push("http://a." + x + "." + y + ".com/i*");
    })
});
//console.log(wapPatterns);
var taobaoPatterns = ["http://detail.tmall.com/item.htm*", "http://detail.daily.tmall.net/item.htm*", "http://item.taobao.com/item.htm*", "http://item.daily.taobao.net/item.htm*"];
//console.log(taobaoPatterns),;

var patterns = [];
wapPatterns.forEach(function(x) {
    patterns.push(x)
});
taobaoPatterns.forEach(function(x) {
    patterns.push(x)
});
//console.log(patterns);
var itemIdPattern = [/i(\d+).htm/, /[\?&]itemId=(\d+)/, /[\?&]id=(\d+)/];

var parent = chrome.contextMenus.create({
    "title": "have a look at ..",
    "documentUrlPatterns": patterns
});

var wap = chrome.contextMenus.create({
    "title": "wap",
    "parentId": parent,
    "documentUrlPatterns": taobaoPatterns,
    "onclick": function(info, tab) {
        var url = tab.url;

        console.log(url);
        var itemId = getItemId(url);
        console.log(itemId);

        if (itemId > 0) {
            var env = url.indexOf("daily") > 0 ? "waptest": "m";
            var cpy = url.indexOf("tmall") > 0 ? "tmall": "taobao";

            var wapUrl = "http://a." + env + "." + cpy + ".com/i" + itemId + ".htm";

            chrome.tabs.update(tab.id, {
                "url": wapUrl
            });
        } else {
            alert("匹配不到itemId");
        }
    }
});

function getItemId(url) {
    var itemId = 0;
    for(index in itemIdPattern){
        if(itemIdPattern[index].exec(url)){ 
            itemId = RegExp.$1;
            break;
        }
    }
    return itemId;
}

var taobao = chrome.contextMenus.create({
    "title": "taobao",
    "parentId": parent,
    "documentUrlPatterns": wapPatterns,
    "onclick": function(info, tab) {
        var url = tab.url;
        console.log(url);
        var itemId = getItemId(url);
        console.log(itemId);
        if (itemId > 0) {
            var isTmall = url.indexOf("tmall") > 0;
            var isDaily = url.indexOf("waptest") > 0;

            var wapUrl = "http://" + (isTmall ? "detail.": "item.") + (isDaily ? "daily.": "") + (isTmall ? "tmall.": "taobao.") + (isDaily ? "net": "com") + "/item.htm?id=" + itemId;

            chrome.tabs.update(tab.id, {
                "url": wapUrl
            });
        } else {
            alert("匹配不到itemId");
        }
    }

});

//http://api.m.taobao.com/rest/api2.do?api=mtop.wdetail.getItemDetail&v=3.0&data={%22itemNumId%22:%2214435405895%22}
var wapDetailRegex = /a.(waptest|wapa|m).(taobao|tmall).com/;
var mtop = chrome.contextMenus.create({
    "title": "mtop v3",
    "parentId": parent,
    "onclick": function(info, tab) {
        goApi(tab, "3.0");
    }

});

function goApi(tab, version) {
    var url = tab.url;
    var itemId = getItemId(url);
    console.log(itemId);
    if (itemId > 0) {
        var env = url.indexOf("daily") > 0 ? "waptest": "m";
        if ("m" == env && wapDetailRegex.exec(url)) {
            env = RegExp.$1;
        }
        var wapUrl = "http://api." + env + ".taobao.com/rest/api2.do?api=mtop.wdetail.getItemDetail&v=" + version + "&data={'itemNumId':" + itemId + "}"
        chrome.tabs.update(tab.id, {
            "url": wapUrl
        });
    } else {
        alert("匹配不到itemId");
    }

}

var mtopV2 = chrome.contextMenus.create({
    "title": "mtop v2",
    "parentId": parent,
    "onclick": function(info, tab) {
        goApi(tab, "2.0");
    }

});

