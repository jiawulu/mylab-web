window.onpageshow = function(event){
    console.log(event);
    //alert("pageshow persisted is " + event.persisted);
    persisted = event.persisted;
};

$(document).ready(function() {

    //alert("history.length=" + history.length + "||" +  localStorage.getItem("history_length"));

    var back_btn = $('#h5_back');
	var _refer = document.referrer;
	console.log("refer is :" + _refer);

	var href = window.location.href;
	//TODO 
	if (href.match('a.html')) {

		var exceptRegs = ['b.htm','a.html'];
		if (_refer) {
			for (var i = 0; i < exceptRegs.length; i++) {
				if (_refer.match(exceptRegs[i])) {
					_refer = null;
					break;
				}
			}
		}

		if (_refer) {
			//put it in localstorage
            localStorage.setItem("h5_backurl",_refer);
            localStorage.setItem("history_length",history.length);
			var backNames = ['shop', 'search', 'index'];
			var regs = ['shop.html', 's.html'];
			for (var i = 0; i < regs.length; i++) {
				if (_refer.match(regs[i])) {
                    back_btn.html(backNames[i]);
                    back_btn.on('click',function(){
                        history.back();
                    });
                    return;
				}
			};

		}else{        
            _refer = window.localStorage.getItem("h5_backurl");

			var backNames = ['shop', 'search', 'index'];
			var regs = ['shop.html', 's.html'];
			for (var i = 0; i < regs.length; i++) {
				if (_refer.match(regs[i])) {
                    back_btn.html(backNames[i]);
                    var historyLength =  history.length;
                    var num = localStorage.getItem("history_length") - historyLength -1;
                    
                    //alert("need go back " + num);
                    back_btn.on('click',function(){
                        alert("go back num " + num);
                        //判断是否是返回回来的,通过刷新机制的？
                        //alert("history.length=" + history.length + "||" + historyLength );
                        if (persisted || history.length == historyLength) {
                            history.go(num);
                        }else{
                           alert("go back by url");
                           window.location.href = _refer;
                        }
                    });
                    return;
				}
			};

        }

	} else if (href.match('s.html')) {

	} else if (href.match('shop.html')) {

	} else if (href.match('b.html')) {

	} else if (href.match('index.html')) {

	}
	/*
     *if (_refer) {
	 *    var backNames = ['']
	 *    //                      detail       wass           share       login
	 *    var exceptRegs = ['^http://a\\.', '^http://b\\.', '/snsshare/', 'welcome.htm'];
	 *    for (var i = 0; i < exceptRegs.length; i++) {
	 *        if (_refer.match(exceptRegs[i])) {
	 *            _refer = null;
	 *            break;
	 *        }
	 *    }
	 *}
     */
});


/*
 *window.onpagehide = function(event){
 *    console.log(event);
 *    alert("pagehide persisted is " + event.persisted);
 *}
 *window.onpopstate = function(event) {
 *    alert("popstate persisted is " + event.persisted);
 *    console.log(event);
 *}
 */
