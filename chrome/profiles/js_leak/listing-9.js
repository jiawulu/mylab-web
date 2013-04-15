var Registry = function(){};

Registry.prototype = {
    init:function(){
        this._subscribers = [];
    },

    add:function(subscriber){
        if(this._subscribers.indexOf(subscriber) >= 0){
            // Already registered so bail out
            return;
        }
        this._subscribers.push(subscriber);
    },

    remove:function(subscriber){
        if(this._subscribers.indexOf(subscriber) < 0){
            // Not currently registered so bail out
            return;
        }
              this._subscribers.splice(
                  this._subscribers.indexOf(subscriber), 1
              );
    }
};