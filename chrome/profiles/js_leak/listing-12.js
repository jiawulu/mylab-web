$("#start_button").click(function(){
  var leakExists = !(
	window["leak"] === null || window["leak"] === undefined
  );
  if(leakExists){
      return;
  }
  leak = new Leaker();
  leak.init("leaker 1", null, registry);
});

$("#destroy_button").click(function(){
    leak.destroy();
    leak = null;
});

registry = new Registry();
registry.init();