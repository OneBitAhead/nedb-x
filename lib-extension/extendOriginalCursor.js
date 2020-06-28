
var model = require('./../lib/model')

var modelSplitCharacter = ":";

var extend = function (Cursor) {

    /**
     * Extension for aggregate building (group by and aggregates) 
     * 
     */
    Cursor.prototype.aggregates = function (aggregates) {
        this._aggregates = aggregates;
        return this;
    }

    // Extension: internal aggregate function
    Cursor.prototype._computeAggregates = function (data, aggregates, records) {

        // Run over all records to compute the aggregate(s)
        var count = records.length;

        for (var r in records) {

            var rec = records[r];

            for (var a in aggregates) {

                var op = aggregates[a][0];
                var attr = aggregates[a][1];
                var value = parseFloat(rec[attr]);
              
                switch (op) {
                    case "sum": (data[a] == undefined) ? data[a] = value : data[a] += value; break;
                    case "avg": (data[a] == undefined) ? data[a] = value : data[a] += value; break; // later divided
                    case "min":
                        if (data[a] == undefined) data[a] = value;
                        else if (value < data[a]) data[a] = value;
                        break;
                    case "max":
                        if (data[a] == undefined) data[a] = value;
                        else if (value > data[a]) data[a] = value;
                        break;
                    case "count": break;
                    case "median": break;
                    default: throw new Error("NoAggregateFunction: ", o[0]);
                }
            }
        }

        for (var a in aggregates) {
            var op = aggregates[a][0];
            var attr = aggregates[a][1];

            if (op == "avg") data[a] = data[a] / count;
            else if (op == "count") data[a] = count;
            else if (op == "median") data[a] = median(records, attr);
        }

        return data;

    }

    // Helper for median computation
    function median(data, attribute) {

        var values = [];
        for (var x in data) {
            values.push(data[x][attribute]);
        }


        if (values.length === 0) return 0;

        values.sort(function (a, b) {
            return a - b;
        });

        var half = Math.floor(values.length / 2);

        if (values.length % 2)
            return values[half];

        return (values[half - 1] + values[half]) / 2.0;
    }

    Cursor.prototype.groupBy = function (attribute) {
        this._groupByAttribute = attribute;
        return this;
    }

    Cursor.prototype.withRollup = function(){
        this._withRollup = true;
        return this;
    }


    Cursor.prototype._groupBy = function (data) {

        var attribute = this._groupByAttribute;

        // Add groupBy // and having :)
        // console.log("Original set: ", attribute, data);

        var aggregates = this._aggregates || [];

        // 1. Build the groups (with arrays of records)
        var groups = {};
        for (var x in data) {
            if (groups[data[x][attribute]] == undefined) groups[data[x][attribute]] = [];
            groups[data[x][attribute]].push(data[x]);
        }

        // 2. Projection....what is needed (the group by attribute ist automatically added (is needed anyway :))
        var a = [];
        for (var x in groups) {
            // Records by group
            var record = { [attribute]: x };

            // Projections (aggregate functions!)
            record = this._computeAggregates(record, aggregates, groups[x]);

            //a.push({name: x, count: groups[x]});
            a.push(record);
        }

        // Add a rollup?
        if(this._withRollup === true){
            var record = {[attribute]: null, __meta:{"rollupRow":true}};
            // Projections (aggregate functions!)
            this._rollupRecord = this._computeAggregates(record, aggregates, data);
        }

        return a;
    }

    /**
     * Externalized the sort function (and prepared for field names with dot "tableA.testAttribute")
     */
    Cursor.prototype._sortFunc = function (res) {

        var self = this;
        var keys, key;

        // Sort object existing?
        if(this._sortObj[this._modelName]){
            sort = this._sortObj[this._modelName];
        } else {
            sort = this._sort;
        }

        keys = Object.keys(sort);

        // Sorting
        var criteria = [];
        for (i = 0; i < keys.length; i++) {
            key = keys[i];
            criteria.push({ key: key, direction: sort[key] });
        }

        res.sort(function (a, b) {
            var criterion, compare, i;
            for (i = 0; i < criteria.length; i++) {
                criterion = criteria[i];
             
                compare = criterion.direction * model.compareThings(model.getDotValue(a, criterion.key), model.getDotValue(b, criterion.key), self.db.compareStrings);
                if (compare !== 0) {
                    return compare;
                }
            }
            return 0;
        });
           

        return res;

    }

    Cursor.prototype._limitAndOffset = function(res){

        // Applying limit and skip
        var limit = this._limit || res.length
            , skip = this._skip || 0;

        res = res.slice(skip, skip + limit);

        return res;

    }



    Cursor.prototype._asyncGetCandidates = async function(query){

        return new Promise((resolve, reject)=>{
            
            this.db.getCandidates(query, function (err, candidates) {

                var res = [];

                if (err) { return reject(err); }
                try {
                    for (var i = 0; i < candidates.length; i += 1) {                   
                        if (model.match(candidates[i], query)) res.push(candidates[i]);
                    }              
                    resolve(res);
                } catch (err) {
                    return reject(err);
                }
            });
        });

    }

    Cursor.prototype._addModelNameToAttributes = function(records, modelName){

        var data = model.deepCopy(records);

        for(var x in data){
            for(var y in data[x]){
                if(y == "__meta")continue;
                data[x][modelName+modelSplitCharacter+y] = data[x][y];
                delete data[x][y];
            }
        }

        return data;

    }


    Cursor.prototype._prepareQueryDataForJoin = function(query){

        // First split the query elements to match the models
        var queryObj = {};
        var query = query || this._query;

        for(var x in query){
            var splitted = x.split(":");
            if(splitted.length !== 2)continue;

            if(queryObj[splitted[0]]==undefined)queryObj[splitted[0]]={};
            
            if(splitted[0] == this._modelName){
                // add the base model constraints like "attribute": ...
                queryObj[splitted[0]][splitted[1]] = query[x];
            }else {
                // add the join where constraints like "model:attribute": ....
                queryObj[splitted[0]][x] = query[x];
            }
        }
        // Add the model name if we have a model given....
        if(this._modelName) {
            if(queryObj[this._modelName] == undefined) queryObj[this._modelName] = {};
            queryObj[this._modelName]["_model"] = this._modelName; 
        }

        this._queryObj = queryObj;

        // Split the SORT by model
        this._sortObj = {};

        for(var x in this._sort){

            var splitted = x.split(":");            
            if(splitted.length !== 2)continue;

            if(this._sortObj[splitted[0]]==undefined)this._sortObj[splitted[0]]={};
            
            if(splitted[0] == this._modelName){
                // add the base model constraints like "attribute": ...
                this._sortObj[splitted[0]][splitted[1]] = this._sort[x];
            }else {
                // add the join where constraints like "model:attribute": ....
                this._sortObj[splitted[0]][x] = this._sort[x];
            }
        }

    }


    /**
     * Fetch data
     * 
     * 
     * @param {*} query 
     */
    Cursor.prototype._getData = async function(query){

        var data = [];


        if(this._leftJoin) this._prepareQueryDataForJoin(query);

        // Build the tree      
        if(this._asTree === true) {

            if(this._projection){
                // Always add meta...
                this._projection.__meta = 1;                
            }

            query = (this._queryObj) ? this._queryObj[this._modelName] : query;

            // Check a given query: if the tree is queried with more than the model
            // then we maybe need to add some higher level nodes too!
            var keyCount = Object.keys(query).length;  
                       
            if((query._model !== undefined && keyCount > 1) || keyCount > 1){
                // fetch nodes starting with the query (and then build the tree from ther up to the root)
                var nodes = await this._asyncGetCandidates(query);
                var foundIds = nodes.map((node)=> node._id);
              
                data = await this._getTreeDataFromNodeUp(query, nodes);
                
                // 1. Mark the matching elements (if the array is given....so a search took place)            
                for(var x in data){
                    if(!data[x].__meta)data[x].__meta = {};
                    data[x].__meta.__criteriaMatch = (foundIds.indexOf(data[x]._id) !== -1) ? true: false;
                }

                // Now sort by the tree hierarchy
                data = this._sortListAsTree(data);                    

            } else {              
                // get the data as a tree model           
                data = await this._getTreeDataFromTop(query);
            }

        }
                
        // Model with left join
        if(this._modelName && this._leftJoin){

            // if not a tree query...fetch the candidates
            if(!this._asTree){
                // Then get the base model data
                // Query for that model
                var query = Object.assign({}, this._queryObj[this._modelName]||{}, {"_model": this._modelName});
                data = await this._asyncGetCandidates(query);
            }        
           
            // Add the ":" names
            data = this._addModelNameToAttributes(data, this._modelName);
                       
            // Run through all LEFT JOINS
            for(var x in this._leftJoin){
                data = await this._leftJoinData(data, this._leftJoin[x], this._queryObj);
            }

            // Maybe the SORT is by a joined element?!
            // Now sort by the tree hierarchy
            if(this._asTree) {
                this._treeId = this._modelName+":"+this._treeId;
                this._treeParentId = this._modelName+":"+this._treeParentId;
                data = this._sortListAsTree(data); 
            }
            

        } 

        if(!this._leftJoin && !this._asTree){
            // default get data 
            data = await this._asyncGetCandidates(query);
        }


        return data;

    }


    Cursor.prototype._sortListAsTree = function(nodes){
        

        // 1. Sort by parent as object....after that organize as tree...
        var byParent = {};
        for(var x in nodes){
            var p = nodes[x][this._treeParentId];
            if(p == undefined || p == null) p = null;
            if(byParent[p]==undefined) byParent[p]=[];
            byParent[p].push(nodes[x]);
        }

        // 2. Sort the groups independetly
        if(this._sort){
            // Sort within the groups
            for(var x in byParent){
                byParent[x] = this._sortFunc(byParent[x]);
            }
        }
    
        // 3. Build the tree....
        var data = this._addRecursively("null", byParent);
        return data;

    }

    /**
     * Add nodes recursively
     * 
     * @param {*} id 
     * @param {*} byParent 
     * @param {*} level 
     */
    Cursor.prototype._addRecursively = function(idValue, byParent, level){
        
        var data = [];
        var level = level || 0;

        var childRecords = byParent[idValue] || [];
        for(var x in childRecords){
            var rec = childRecords[x];
            if(!rec.__meta)rec.__meta = {};
            rec.__meta.__level = level;       
            data.push(rec);
            data = data.concat(this._addRecursively(rec[this._treeId], byParent, level+1));
        }
        return data;

    }


    /**
     * Get three data recursively (starting from root nodes)
     */
    Cursor.prototype._getTreeDataFromTop = async function(query, parent, level){

        var data = []
        var parent = parent || undefined;
        var level = (level == undefined) ? 0: level+1;

        var treeParentId = this._treeParentId;
     
        if(!parent) query['$where'] = function(){ 
            return (!this[treeParentId]);
        }
        else {
            delete query["$where"];
            query[this._treeParentId] = parent;
        }
               
        var records = await this._asyncGetCandidates(query);

        // Sort it internally per group
        if(this._sort){
            records = this._sortFunc(records);
        }


        for(var x in records){
            // Add the record to the result...
            if(!records[x].__meta) records[x].__meta = {};
            records[x].__meta.__level = level;
            data.push(records[x]);
            // Check for children....
            if(records[x][this._treeId]){
                // Check openTreeIds
                if(this._openAll === true || this._openTreeIds.indexOf(records[x][this._treeId])!==-1){
                    data = data.concat(await this._getTreeDataFromTop(query, records[x][this._treeId], level));
                }
            }
        }

        return data;

    }


     /**
     * Get three data recursively
     */
    Cursor.prototype._getTreeDataFromNodeUp = async function(query, records, existingIds){

        // These records are added ....
        var data = [].concat(records);

        // At first round the existingIds need to be computed (do NOT take the ones computed above....they are used for match criteria marking!!)
        if(!existingIds) existingIds = data.map((node)=> node._id);

        // Get the parent
        for(var x in records){
            var rec = records[x];
            //Get a parent (if any)
            if(rec[this._treeParentId]){                
                var parentQuery = {}
                if(query._model) parentQuery._model = query._model;
                parentQuery.id = rec[this._treeParentId];              
                var parent = await this._asyncGetCandidates(parentQuery);
                if(parent.length == 1){
                    // check if these parent are already fetched (e.g. from another children node in the path)
                    if(existingIds.indexOf(parent[0]._id)==-1){               
                        existingIds.push(parent[0]._id);
                        data = data.concat(await this._getTreeDataFromNodeUp(query, parent, existingIds));
                    }
                }
            }
        
        }

        return data;

    }


    Cursor.prototype._leftJoinData = async function(data, joinData, queryObj){
             
        var to = joinData.to.split(modelSplitCharacter);
     
        var keys = [];
        // Array of keys
        for(var x in data){
            if(data[x][joinData.from]!==undefined && keys.indexOf(data[x][joinData.from])==-1) keys.push(data[x][joinData.from]);
        }

        // Fetch the data of the join model via the keys
        var joinRecords = await this._asyncGetCandidates({"_model":to[0]});
        // Add the model name first
        joinRecords = this._addModelNameToAttributes(joinRecords, to[0]);
                
        // Data by JOIN id
        var records = {};
        for(var x in joinRecords){
            records[joinRecords[x][joinData.to]] = joinRecords[x];
        }

        // JOIN THE DATA TOGETHER
        for(var x in data){
            var id = data[x][joinData.from];
            if(records[id]) data[x] = Object.assign({},data[x],records[id]);
            else {
                data[x][to[0]]=null;
            }
        }

        // Now that the base data is joined with the corresponding data....we can 
        // reduce the complete data by WHERE constraints
        
        // Query for that model
        if(queryObj[to[0]]!==undefined){
            // Reduce....
            var query = queryObj[to[0]];
            var rec = [];

            for (var i = 0; i < data.length; i += 1) {                   
                if (model.match(data[i], query)) rec.push(data[i]);
            }              
            return rec;
        }

       
        return data;
    }
    


    /**
     * Overwrite the internal EXEC function
     * 
     * Get all matching elements
     * Will return pointers to matched elements (shallow copies), returning full copies is the role of find or findOne
     * This is an internal function, use exec which uses the executor
     *
     * @param {Function} callback - Signature: err, results
     */
    Cursor.prototype._exec = async function (_callback) {


        var res = [], self = this, error = null, i;

        function callback(error, res) {
            if (self.execFn) {
                return self.execFn(error, res, _callback);
            } else {
                return _callback(error, res);
            }
        }

        // Base data
        res = await this._getData(this.query);

               
        // any group by (before any sort!!!)
        if (this._groupByAttribute) {
            // group by (with internal aggregate call)
            res = this._groupBy(res);
        } else if (this._aggregates) {
            // aggregates without a group by => returns ONE single record!
            res = this._computeAggregates({}, this._aggregates, res);
            return callback(error, [res]);
        }  

        // Apply all sorts (if NOT in tree mode)
        if (this._sort && this._asTree !== true) {
            res = this._sortFunc(res);
        }

        // Skip and limit
        res = this._limitAndOffset(res);     

        // If group by and with rollup....
        if(this._rollupRecord){
            res.push(this._rollupRecord);            
        }


        // Apply projection
        try {
            res = this.project(res);
        } catch (e) {
            error = e;
            res = undefined;
        }

        return callback(error, res);
      
    };



    /**
     * left join with models
     */
    Cursor.prototype.leftJoin = function (from, join) {

        if(this._leftJoin == undefined) this._leftJoin = [];
        this._leftJoin.push({from: from, to: join });

        return this;
    }



    /**
     * Tree model
     * 
     */
    Cursor.prototype.asTree = function(options){

        this._asTree = true;

        options = options || {};

        if(options.openTreeIds) this._openTreeIds = [].concat(options.openTreeIds);
        else this._openTreeIds = [];
        this._openAll = (options.openAll === true) ? true: false;

        this._treeId = options.treeId || "id";
        this._treeParentId = options.treeParentId || "__parent";
    
        return this;

    }





}

exports.extend = extend;





