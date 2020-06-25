
var extend = function (Cursor) {

    
	// Extensions by OneBitAhead (group by with aggregates)
	Cursor.prototype.groupBy = function() {
		this.__original.groupBy.apply(this.__original, arguments)
		return this
	}
	Cursor.prototype.aggregates = function() {
		this.__original.aggregates.apply(this.__original, arguments)
		return this
	}
	Cursor.prototype.withRollup = function() {
		this.__original.withRollup.apply(this.__original, arguments)
		return this
	}
    Cursor.prototype.leftJoin = function() {
		this.__original.leftJoin.apply(this.__original, arguments)
		return this
	}
	Cursor.prototype.asTree = function() {
		this.__original.asTree.apply(this.__original, arguments)
		return this
	}


}

exports.extend = extend;





