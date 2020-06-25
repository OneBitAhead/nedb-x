

var extend = function (Datastore) {

    Datastore.prototype.model = function(){
        this.__original.model.apply(this.__original, arguments)		
        return this;        
    }


    // A helper for showing trees
    Datastore.prototype.logTree = function(data){


        for(var x in data){

            var pad = "";
            for(var i = 0; i < data[x].__meta.__level;i++) pad += "   ";
            if(data[x].__meta.__level > 0) pad += "└─ ";    
    
            if(data[x].__meta && data[x].__meta.__criteriaMatch === false){
                var color = '\x1b[30m%s\x1b[0m';
            } else {
                var color = '';
            }    
            console.log(color, `${pad}${data[x].name.padStart(pad)} (${data[x].id || ""})`);   
        }  
    }

}

exports.extend = extend;





