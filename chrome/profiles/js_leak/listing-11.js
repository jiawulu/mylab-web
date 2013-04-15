var Leaker = function(){};
Leaker.prototype = {

    init:function(name, parent, registry){
        this._name = name;
        this._registry = registry;
        this._parent = parent;
        this._child = null;
        this.createChildren();
        this.registerCallback();
    },

    createChildren:function(){
        if(this._parent !== null){
            // Only create child if this is the root
            return;
        }
        this._child = new Leaker();
        this._child.init("leaker 2", this, this._registry);
    },

    registerCallback:function(){
        this._registry.add(this);
    },

    destroy: function(){
        this._registry.remove(this);
    }
};