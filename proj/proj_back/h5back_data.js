window.backData = (window.backData || {});
var exceptRegs = window.backData.exceptRegs = [];
var backNames = window.backData.backNames = [];
var regs = window.backData.regs = [];
var href = window.location.href;
if (href.match('a.html')) {
	exceptRegs.push('b.htm', 'a.html');
	backNames.push('shop', 'search', 'index');
	regs.push('shop.html', 's.html', 'index.html');
} else if (href.match('s.html')) {
	exceptRegs.push('b.htm', 'search.html');
	backNames.push('detail', 'index');
	regs.push('a.html', 'index.html');

} else if (href.match('shop.html')) {
	exceptRegs.push('b.htm', 'shop.html');
	backNames.push('detail', 'other');
	regs.push('a.html', '*');

} else if (href.match('b.html')) {

} else if (href.match('index.html')) {

}

var _refer = document.referrer;
if (_refer) {
	for (var i = 0; i < exceptRegs.length; i++) {
		if (_refer.match(exceptRegs[i])) {
			_refer = null;
			break;
		}
	}
}
var back_btn = window.backData.backBtn = $("#h5_back");
var nofresh = window.backData.nofresh = true;
window.backData.refer = _refer;
var _index = window.backData.index = "http://m.taobao.com";

