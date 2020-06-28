

var extend = function (Datastore) {

    Datastore.prototype.model = function(){
        this.__original.model.apply(this.__original, arguments)		
        return this;        
    }


    // A helper for showing trees
    Datastore.prototype.logTree = function(data, identifier, debug){

        identifier = identifier || "name";
      
        for(var x in data){

            var pad = "";
            if(!data[x].__meta) data[x].__meta = {};

            for(var i = 0; i < data[x].__meta.__level;i++) pad += "  ";
            if(data[x].__meta.__level > 0) pad += "└─ ";    
    
            if(data[x].__meta && data[x].__meta.__criteriaMatch === false){
                var color = '\x1b[30m%s\x1b[0m';
            } else {
                var color = '';
            }    

            if(typeof identifier == "function"){
                var name = identifier.apply(this,[data[x]]);
            } else {
                var name = (data[x][identifier]!==undefined) ? data[x][identifier] : `-unknown attribute '${identifier}'-`;
            }

            console.log(color,`${pad}${name}`);   
        }  
    }

}

exports.extend = extend;





