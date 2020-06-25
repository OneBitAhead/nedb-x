

var extend = function (Datastore) {

    Datastore.prototype.model = function(model){
        this._modelName = model;
        return this;
    }

    /**
     * MODEL ADDON
     */
    Datastore.prototype.__setModelInQuery = function(json){
              
        // Modelname set
        if(json && this._modelName){
            if(Array.isArray(json)){
                for(var x in json){
                    json[x]["_model"] = this._modelName;
                }
            } else {
                json["_model"] = this._modelName;
            }
            this._modelName = undefined;
        }
        return json;
    }

    //=== INSERT
    // Original-version of insert
    var original_insert = Datastore.prototype.insert;
    // Overwrite internal function
    Datastore.prototype.insert = function (newDoc, cb) {
        
        newDoc = this.__setModelInQuery(newDoc);

        var result = original_insert.apply(this,[newDoc, cb]);
        return result;
    };


    //=== COUNT
    // Original count
    var original_count = Datastore.prototype.count
    Datastore.prototype.count = function(query, callback) {        
        query = this.__setModelInQuery(query);
        return original_count.apply(this,[query,callback]);
    };


    //=== FIND
    // Original find method (leave out callback....we don't need it!)
    var original_find = Datastore.prototype.find
    Datastore.prototype.find = function(query, projection) {

        query = this.__setModelInQuery(query);
        var cursor = original_find.apply(this,[query, projection]);        
        // BIND THE MODEL to the cursor (maybe needed for further things...)
        if(query._model !== undefined) cursor._modelName = query._model;        

        return cursor;

    };

    var original_findOne = Datastore.prototype.findOne; 
    Datastore.prototype.findOne = function (query, projection, callback) {
        query = this.__setModelInQuery(query);
        return original_findOne.apply(this,[query, projection, callback]);
    }


    //=== REMOVE
    var original_remove = Datastore.prototype._remove
    Datastore.prototype._remove = function (query, options, cb){
        query = this.__setModelInQuery(query);
        return original_remove.apply(this,[query, options, cb]);
    }

    //=== UPDATE
    var original_update = Datastore.prototype._update;
    Datastore.prototype._update = function (query, updateQuery, options, cb){
        
        if(this._modelName){
            if(query) query["_model"] = this._modelName;
            if(updateQuery) delete updateQuery["_model"];
            this._modelName = undefined;
        }
    
        return original_update.apply(this,[query, updateQuery, options, cb]);
    }


}

exports.extend = extend;





