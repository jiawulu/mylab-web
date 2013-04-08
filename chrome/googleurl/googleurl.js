var googlePatterns = ["http://www.google.com.hk/search\?*"];

var parent = chrome.contextMenus.create({
    "title": "open tab url",
    "documentUrlPatterns": googlePatterns,
    "contexts":["link"],
    "onclick": function(info, tab) {
        var url = info.linkUrl;

        console.log(url);
        var querydata = new QueryData(url);

        if(querydata.url){
        
        

        chrome.tabs.create( {
            "url": querydata.url,
            "selected":true
        });
        }else{
            alert("no google search url");
        }
    }
});
