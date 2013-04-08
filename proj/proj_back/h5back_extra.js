window.backData = (window.backData || {});
window.backData.readAndJump = function(back_btn) {
	var _refers = window.localStorage.getItem("referinfo_" + location.pathname);
	if (_refers) {

		_refers = JSON.parse(_refers);
		console.log(_refers);
		var historyLength = history.length;
		var num = _refers.hisLen - historyLength - 1;
		if (noflash) {
			back_btn.on('click', function() {
				history.go(num);
			});
			back_btn.html(_refers.name);
		} else {
			//check 死循环
			if (!_refers.skip) {
				_refers.skip = true;
				localStorage.setItem("referinfo_" + location.pathname, JSON.stringify(_refers));
				back_btn.on('click', function() {
					window.location.href = _refers.refer;
				});
				back_btn.html(_refers.name);
			} else {
				window.backData.goIndex(back_btn);
			}
		}
	} else {
		window.backData.goIndex(back_btn);
	}
}

window.backData.goIndex = function(back_btn) {
	back_btn.html("首页");
	back_btn.on('click', function() {
		window.location.href = "index.html";
	});
}

