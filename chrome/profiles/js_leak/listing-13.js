destroy: function(){
    if(this._child !== null){
        this._child.destroy();            
    }
    this._registry.remove(this);
}