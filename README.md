
## nedb-x: Functional extension for NeDB "The JavaScript Database"

**Disclaimer**

This is an extension set for the excellent library <a href="https://github.com/louischatriot/nedb">**NeDB**</a> from Louis Chatriot.
Also merged with the promise wrapper <a href="https://github.com/bajankristof/nedb-promises">nedb-promises</a> from bajankristof.


We (OneBitAhead) wanted to add a little "sugar" to nedb for usage in rapid prototyping or very small embedded systems.
The following things are added: 

* [X] <a href="#group-by-statements">Group by with aggregates</a> 
* [X] <a href="#model-attribute">Substructure database with model attribute</a> 
* [X] <a href="#left-join">Joining (left join) model data</a>
* [ ] WIP <a href="#tree-data">Tree data (with open/closed nodes)</a>
* [ ] WIP: Categorize (build categories and act as tree over the categories)
* [ ] WIP: Search

## Installation, tests
Module name on npm and bower is `nedb-x`.

```
npm install nedb-x --save    # Put latest version in your package.json
```

For browser-usage: just download the <a href="https://raw.githubusercontent.com/OneBitAhead/nedb-x/master/browser-version/out/nedb.min.js">nedbx.min.js</a>


## API
It is a subset of MongoDB's API (the most used operations). Here the functionality of the base nedb (as promise version) is described.

* <a href="#creatingloading-a-database">Creating/loading a database</a>
* <a href="#persistence">Persistence</a>
* <a href="#inserting-documents">Inserting documents</a>
* <a href="#finding-documents">Finding documents</a>
  * <a href="#basic-querying">Basic Querying</a>
  * <a href="#operators-lt-lte-gt-gte-in-nin-ne-exists-regex">Operators ($lt, $lte, $gt, $gte, $in, $nin, $ne, $exists, $regex)</a>
  * <a href="#array-fields">Array fields</a>
  * <a href="#logical-operators-or-and-not-where">Logical operators $or, $and, $not, $where</a>
  * <a href="#sorting-and-paginating">Sorting and paginating</a>
  * <a href="#projections">Projections</a>
* <a href="#counting-documents">Counting documents</a>
* <a href="#updating-documents">Updating documents</a>
* <a href="#removing-documents">Removing documents</a>
* <a href="#indexing">Indexing</a>
* <a href="#browser-version">Browser version</a>

### Creating/loading a database
You can use NeDB as an in-memory only datastore or as a persistent datastore. One datastore is the equivalent of a MongoDB collection. The constructor is used as follows `new Datastore(options)` where `options` is an object with the following fields:

* `filename` (optional): path to the file where the data is persisted. If left blank, the datastore is automatically considered in-memory only. It cannot end with a `~` which is used in the temporary files NeDB uses to perform crash-safe writes.
* `inMemoryOnly` (optional, defaults to `false`): as the name implies.
* `timestampData` (optional, defaults to `false`): timestamp the insertion and last update of all documents, with the fields `createdAt` and `updatedAt`. User-specified values override automatic generation, usually useful for testing.
* `autoload` (optional, defaults to `false`): if used, the database will automatically be loaded from the datafile upon creation (you don't need to call `loadDatabase`). Any command issued before load is finished is buffered and will be executed when load is done.
* `onload` (optional): if you use autoloading, this is the handler called after the `loadDatabase`. It takes one `error` argument. If you use autoloading without specifying this handler, and an error happens during load, an error will be thrown.
* `afterSerialization` (optional): hook you can use to transform data after it was serialized and before it is written to disk. Can be used for example to encrypt data before writing database to disk. This function takes a string as parameter (one line of an NeDB data file) and outputs the transformed string, **which must absolutely not contain a `\n` character** (or data will be lost).
* `beforeDeserialization` (optional): inverse of `afterSerialization`. Make sure to include both and not just one or you risk data loss. For the same reason, make sure both functions are inverses of one another. Some failsafe mechanisms are in place to prevent data loss if you misuse the serialization hooks: NeDB checks that never one is declared without the other, and checks that they are reverse of one another by testing on random strings of various lengths. In addition, if too much data is detected as corrupt, NeDB will refuse to start as it could mean you're not using the deserialization hook corresponding to the serialization hook used before (see below).
* `corruptAlertThreshold` (optional): between 0 and 1, defaults to 10%. NeDB will refuse to start if more than this percentage of the datafile is corrupt. 0 means you don't tolerate any corruption, 1 means you don't care.
* `compareStrings` (optional): function compareStrings(a, b) compares
  strings a and b and return -1, 0 or 1. If specified, it overrides
default string comparison which is not well adapted to non-US characters
in particular accented letters. Native `localCompare` will most of the
time be the right choice
* `nodeWebkitAppName` (optional, **DEPRECATED**): if you are using NeDB from whithin a Node Webkit app, specify its name (the same one you use in the `package.json`) in this field and the `filename` will be relative to the directory Node Webkit uses to store the rest of the application's data (local storage etc.). It works on Linux, OS X and Windows. Now that you can use `require('nw.gui').App.dataPath` in Node Webkit to get the path to the data directory for your application, you should not use this option anymore and it will be removed.

If you use a persistent datastore without the `autoload` option, you need to call `loadDatabase` manually.
This function fetches the data from datafile and prepares the database. **Don't forget it!** If you use a
persistent datastore, no command (insert, find, update, remove) will be executed before `loadDatabase`
is called, so make sure to call it yourself or use the `autoload` option.

Also, if `loadDatabase` fails, all commands registered to the executor afterwards will not be executed. They will be registered and executed, in sequence, only after a successful `loadDatabase`.

```javascript
// Type 1: In-memory only datastore (no need to load the database)
var Datastore = require('nedb-x')
  , db = new Datastore();


// Type 2: Persistent datastore with manual loading
var Datastore = require('nedb-x')
  , db = new Datastore({ filename: 'path/to/datafile' });
db.loadDatabase(function (err) {    // Callback is optional
  // Now commands will be executed
});


// Type 3: Persistent datastore with automatic loading
var Datastore = require('nedb-x')
  , db = new Datastore({ filename: 'path/to/datafile', autoload: true });
// You can issue commands right away


// Type 4: Persistent datastore for a Node Webkit app called 'nwtest'
// For example on Linux, the datafile will be ~/.config/nwtest/nedb-data/something.db
var Datastore = require('nedb-x')
  , path = require('path')
  , db = new Datastore({ filename: path.join(require('nw.gui').App.dataPath, 'something.db') });


// Of course you can create multiple datastores if you need several
// collections. In this case it's usually a good idea to use autoload for all collections.
db = {};
db.users = new Datastore('path/to/users.db');
db.robots = new Datastore('path/to/robots.db');

// You need to load each database (here we do it asynchronously)
db.users.loadDatabase();
db.robots.loadDatabase();
```

### Persistence
Under the hood, NeDB's persistence uses an append-only format, meaning that all updates and deletes actually result in lines added at the end of the datafile, for performance reasons. The database is automatically compacted (i.e. put back in the one-line-per-document format) every time you load each database within your application.

You can manually call the compaction function with `yourDatabase.persistence.compactDatafile` which takes no argument. It queues a compaction of the datafile in the executor, to be executed sequentially after all pending operations. The datastore will fire a `compaction.done` event once compaction is finished.

You can also set automatic compaction at regular intervals with `yourDatabase.persistence.setAutocompactionInterval(interval)`, `interval` in milliseconds (a minimum of 5s is enforced), and stop automatic compaction with `yourDatabase.persistence.stopAutocompaction()`.

Keep in mind that compaction takes a bit of time (not too much: 130ms for 50k records on a typical development machine) and no other operation can happen when it does, so most projects actually don't need to use it.

Compaction will also immediately remove any documents whose data line has become corrupted, assuming that the total percentage of all corrupted documents in that database still falls below the specified `corruptAlertThreshold` option's value.

Durability works similarly to major databases: compaction forces the OS to physically flush data to disk, while appends to the data file do not (the OS is responsible for flushing the data). That guarantees that a server crash can never cause complete data loss, while preserving performance. The worst that can happen is a crash between two syncs, causing a loss of all data between the two syncs. Usually syncs are 30 seconds appart so that's at most 30 seconds of data. <a href="http://oldblog.antirez.com/post/redis-persistence-demystified.html" target="_blank">This post by Antirez on Redis persistence</a> explains this in more details, NeDB being very close to Redis AOF persistence with `appendfsync` option set to `no`.


### Inserting documents
The native types are `String`, `Number`, `Boolean`, `Date` and `null`. You can also use
arrays and subdocuments (objects). If a field is `undefined`, it will not be saved (this is different from 
MongoDB which transforms `undefined` in `null`, something I find counter-intuitive).

If the document does not contain an `_id` field, NeDB will automatically generated one for you (a 16-characters alphanumerical string). The `_id` of a document, once set, cannot be modified.

Field names cannot begin by '$' or contain a '.'.

```javascript
var doc = { hello: 'world'
               , n: 5
               , today: new Date()
               , nedbIsAwesome: true
               , notthere: null
               , notToBeSaved: undefined  // Will not be saved
               , fruits: [ 'apple', 'orange', 'pear' ]
               , infos: { name: 'nedb' }
               };

var newDoc = await db.insert(doc); 
// newDoc is the newly inserted document, including its _id
// newDoc has no key called notToBeSaved since its value was undefined

```

You can also bulk-insert an array of documents. This operation is atomic, meaning that if one insert fails due to a unique constraint being violated, all changes are rolled back.

```javascript
var newDocs = await db.insert([{ a: 5 }, { a: 42 }]);
// Two documents were inserted in the database
// newDocs is an array with these documents, augmented with their _id

// If there is a unique constraint on field 'a', this will fail
await db.insert([{ a: 5 }, { a: 42 }, { a: 5 }]);
// will throw an err: as 'uniqueViolated' error
// The database was not modified
```

### Finding documents
Use `find` to look for multiple documents matching you query, or `findOne` to look for one specific document. You can select documents based on field equality or use comparison operators (`$lt`, `$lte`, `$gt`, `$gte`, `$in`, `$nin`, `$ne`). You can also use logical operators `$or`, `$and`, `$not` and `$where`. See below for the syntax.

You can use regular expressions in two ways: in basic querying in place of a string, or with the `$regex` operator.

You can sort and paginate results using the cursor API (see below).

You can use standard projections to restrict the fields to appear in the results (see below).

#### Basic querying
Basic querying means are looking for documents whose fields match the ones you specify. You can use regular expression to match strings.
You can use the dot notation to navigate inside nested documents, arrays, arrays of subdocuments and to match a specific element of an array.

```javascript
// Let's say our datastore contains the following collection
// { _id: 'id1', planet: 'Mars', system: 'solar', inhabited: false, satellites: ['Phobos', 'Deimos'] }
// { _id: 'id2', planet: 'Earth', system: 'solar', inhabited: true, humans: { genders: 2, eyes: true } }
// { _id: 'id3', planet: 'Jupiter', system: 'solar', inhabited: false }
// { _id: 'id4', planet: 'Omicron Persei 8', system: 'futurama', inhabited: true, humans: { genders: 7 } }
// { _id: 'id5', completeData: { planets: [ { name: 'Earth', number: 3 }, { name: 'Mars', number: 2 }, { name: 'Pluton', number: 9 } ] } }

// Finding all planets in the solar system
var docs = await db.find({ system: 'solar' });
// docs is an array containing documents Mars, Earth, Jupiter
// If no document is found, docs is equal to []

// Finding all planets whose name contain the substring 'ar' using a regular expression
var docs = await db.find({ planet: /ar/ });
// docs contains Mars and Earth

// Finding all inhabited planets in the solar system
var docs = await db.find({ system: 'solar', inhabited: true });
// docs is an array containing document Earth only

// Use the dot-notation to match fields in subdocuments
var docs = await db.find({ "humans.genders": 2 });
// docs contains Earth

// Use the dot-notation to navigate arrays of subdocuments
var docs = await db.find({ "completeData.planets.name": "Mars" });
// docs contains document 5


var docs = await db.find({ "completeData.planets.name": "Jupiter" });
// docs is empty

var docs = await db.find({ "completeData.planets.0.name": "Earth" });
// docs contains document 5
// If we had tested against "Mars" docs would be empty because we are matching against a specific array element



// You can also deep-compare objects. Don't confuse this with dot-notation!
var docs = await db.find({ humans: { genders: 2 } });
// docs is empty, because { genders: 2 } is not equal to { genders: 2, eyes: true }

// Find all documents in the collection
var docs = await db.find({});


// The same rules apply when you want to only find one document
var docs = await db.findOne({ _id: 'id1' });
// doc is the document Mars
// If no document is found, doc is null
```

#### Operators ($lt, $lte, $gt, $gte, $in, $nin, $ne, $exists, $regex)
The syntax is `{ field: { $op: value } }` where `$op` is any comparison operator:  

* `$lt`, `$lte`: less than, less than or equal
* `$gt`, `$gte`: greater than, greater than or equal
* `$in`: member of. `value` must be an array of values
* `$ne`, `$nin`: not equal, not a member of
* `$exists`: checks whether the document posses the property `field`. `value` should be true or false
* `$regex`: checks whether a string is matched by the regular expression. Contrary to MongoDB, the use of `$options` with `$regex` is not supported, because it doesn't give you more power than regex flags. Basic queries are more readable so only use the `$regex` operator when you need to use another operator with it (see example below)

```javascript
// $lt, $lte, $gt and $gte work on numbers and strings
var docs = await db.find({ "humans.genders": { $gt: 5 } });
// docs contains Omicron Persei 8, whose humans have more than 5 genders (7).


// When used with strings, lexicographical order is used
var docs = await db.find({ planet: { $gt: 'Mercury' }});
// docs contains Omicron Persei 8


// Using $in. $nin is used in the same way
var docs = await db.find({ planet: { $in: ['Earth', 'Jupiter'] }});
// docs contains Earth and Jupiter


// Using $exists
var docs = await db.find({ satellites: { $exists: true } });
// docs contains only Mars


// Using $regex with another operator
var docs = await db.find({ planet: { $regex: /ar/, $nin: ['Jupiter', 'Earth'] } });
// docs only contains Mars because Earth was excluded from the match by $nin
```

#### Array fields
When a field in a document is an array, NeDB first tries to see if the query value is an array to perform an exact match, then whether there is an array-specific comparison function (for now there is only `$size` and `$elemMatch`) being used. If not, the query is treated as a query on every element and there is a match if at least one element matches.  

* `$size`: match on the size of the array
* `$elemMatch`: matches if at least one array element matches the query entirely

```javascript
// Exact match
var docs = await db.find({ satellites: ['Phobos', 'Deimos'] });
// docs contains Mars

var docs = await db.find({ satellites: ['Deimos', 'Phobos'] });
// docs is empty


// Using an array-specific comparison function
// $elemMatch operator will provide match for a document, if an element from the array field satisfies all the conditions specified with the `$elemMatch` operator
var docs = await db.find({ completeData: { planets: { $elemMatch: { name: 'Earth', number: 3 } } } })
// docs contains documents with id 5 (completeData)


var docs = await db.find({ completeData: { planets: { $elemMatch: { name: 'Earth', number: 5 } } } });
// docs is empty


// You can use inside #elemMatch query any known document query operator
var docs = await db.find({ completeData: { planets: { $elemMatch: { name: 'Earth', number: { $gt: 2 } } } } });
// docs contains documents with id 5 (completeData)


// Note: you can't use nested comparison functions, e.g. { $size: { $lt: 5 } } will throw an error
var docs = await db.find({ satellites: { $size: 2 } });
// docs contains Mars


var docs = await db.find({ satellites: { $size: 1 } });
// docs is empty


// If a document's field is an array, matching it means matching any element of the array
var docs = await db.find({ satellites: 'Phobos' });
// docs contains Mars. Result would have been the same if query had been { satellites: 'Deimos' }


// This also works for queries that use comparison operators
var docs = await db.find({ satellites: { $lt: 'Amos' } });
// docs is empty since Phobos and Deimos are after Amos in lexicographical order

// This also works with the $in and $nin operator
var docs = await db.find({ satellites: { $in: ['Moon', 'Deimos'] } });
// docs contains Mars (the Earth document is not complete!)

```

#### Logical operators $or, $and, $not, $where
You can combine queries using logical operators:  

* For `$or` and `$and`, the syntax is `{ $op: [query1, query2, ...] }`.
* For `$not`, the syntax is `{ $not: query }`
* For `$where`, the syntax is `{ $where: function () { /* object is "this", return a boolean */ } }`

```javascript
var docs = await db.find({ $or: [{ planet: 'Earth' }, { planet: 'Mars' }] });
// docs contains Earth and Mars


var docs = await db.find({ $not: { planet: 'Earth' } });
// docs contains Mars, Jupiter, Omicron Persei 8


var docs = await db.find({ $where: function () { return Object.keys(this) > 6; } });
// docs with more than 6 properties


// You can mix normal queries, comparison queries and logical operators
var docs = await db.find({ $or: [{ planet: 'Earth' }, { planet: 'Mars' }], inhabited: true });
// docs contains Earth


```

#### Sorting and paginating
`find`, `findOne` or `count` returns a `Cursor` object. You can modify the cursor with `sort`, `skip` and `limit` and then execute it with `exec()`.

```javascript
// Let's say the database contains these 4 documents
// doc1 = { _id: 'id1', planet: 'Mars', system: 'solar', inhabited: false, satellites: ['Phobos', 'Deimos'] }
// doc2 = { _id: 'id2', planet: 'Earth', system: 'solar', inhabited: true, humans: { genders: 2, eyes: true } }
// doc3 = { _id: 'id3', planet: 'Jupiter', system: 'solar', inhabited: false }
// doc4 = { _id: 'id4', planet: 'Omicron Persei 8', system: 'futurama', inhabited: true, humans: { genders: 7 } }

// No query used means all results are returned (before the Cursor modifiers)
var docs = await db.find({}).sort({ planet: 1 }).skip(1).limit(2).exec();
// docs is [doc3, doc1]


// You can sort in reverse order like this
var docs = await db.find({ system: 'solar' }).sort({ planet: -1 }).exec();
// docs is [doc1, doc3, doc2]


// You can sort on one field, then another, and so on like this:
var docs = await db.find({}).sort({ firstField: 1, secondField: -1 }) ...   // You understand how this works!
```

#### Projections
You can give `find` and `findOne` an optional second argument, `projections`. The syntax is the same as MongoDB: `{ a: 1, b: 1 }` to return only the `a` and `b` fields, `{ a: 0, b: 0 }` to omit these two fields. You cannot use both modes at the time, except for `_id` which is by default always returned and which you can choose to omit. You can project on nested documents.

```javascript
// Same database as above

// Keeping only the given fields
var docs = await db.find({ planet: 'Mars' }, { planet: 1, system: 1 });
// docs is [{ planet: 'Mars', system: 'solar', _id: 'id1' }]

// Keeping only the given fields but removing _id
var docs = await db.find({ planet: 'Mars' }, { planet: 1, system: 1, _id: 0 });
// docs is [{ planet: 'Mars', system: 'solar' }]

// Omitting only the given fields and removing _id
var docs = await db.find({ planet: 'Mars' }, { planet: 0, system: 0, _id: 0 });
// docs is [{ inhabited: false, satellites: ['Phobos', 'Deimos'] }]


// Failure: using both modes at the same time
var docs = await db.find({ planet: 'Mars' }, { planet: 0, system: 1 });
// err is the error message, docs is undefined


// You can also use it in a Cursor way but this syntax is not compatible with MongoDB
var docs = await db.find({ planet: 'Mars' }).projection({ planet: 1, system: 1 }).exec();
// docs is [{ planet: 'Mars', system: 'solar', _id: 'id1' }]


// Project on a nested document
var docs = await db.findOne({ planet: 'Earth' }).projection({ planet: 1, 'humans.genders': 1 }).exec();
// doc is { planet: 'Earth', _id: 'id2', humans: { genders: 2 } }

```



### Counting documents
You can use `count` to count documents. It has the same syntax as `find`. For example:

```javascript
// Count all planets in the solar system
var count = await db.count({ system: 'solar' });
// count equals to 3

// Count all documents in the datastore
var docs = await db.count({});
// count equals to 4
```


### Updating documents
`db.update(query, update, options)` will update all documents matching `query` according to the `update` rules:  
* `query` is the same kind of finding query you use with `find` and `findOne`
* `update` specifies how the documents should be modified. It is either a new document or a set of modifiers (you cannot use both together, it doesn't make sense!)
  * A new document will replace the matched docs
  * The modifiers create the fields they need to modify if they don't exist, and you can apply them to subdocs. Available field modifiers are `$set` to change a field's value, `$unset` to delete a field, `$inc` to increment a field's value and `$min`/`$max` to change field's value, only if provided value is less/greater than current value. To work on arrays, you have `$push`, `$pop`, `$addToSet`, `$pull`, and the special `$each` and `$slice`. See examples below for the syntax.
* `options` is an object with two possible parameters
  * `multi` (defaults to `false`) which allows the modification of several documents if set to true
  * `upsert` (defaults to `false`) if you want to insert a new document corresponding to the `update` rules if your `query` doesn't match anything. If your `update` is a simple object with no modifiers, it is the inserted document. In the other case, the `query` is stripped from all operator recursively, and the `update` is applied to it.
  * `returnUpdatedDocs` (defaults to `false`, not MongoDB-compatible) if set to true and update is not an upsert, will return the array of documents matched by the find query and updated. Updated documents will be returned even if the update did not actually modify them.
* Return values: {numAffected, affectedDocuments, upsert}`. 
  * For an upsert, `affectedDocuments` contains the inserted document and the `upsert` flag is set to `true`.
  * For a standard update with `returnUpdatedDocs` flag set to `false`, `affectedDocuments` is not set.
  * For a standard update with `returnUpdatedDocs` flag set to `true` and `multi` to `false`, `affectedDocuments` is the updated document.
  * For a standard update with `returnUpdatedDocs` flag set to `true` and `multi` to `true`, `affectedDocuments` is the array of updated documents.

**Note**: you can't change a document's _id.

```javascript
// Let's use the same example collection as in the "finding document" part
// { _id: 'id1', planet: 'Mars', system: 'solar', inhabited: false }
// { _id: 'id2', planet: 'Earth', system: 'solar', inhabited: true }
// { _id: 'id3', planet: 'Jupiter', system: 'solar', inhabited: false }
// { _id: 'id4', planet: 'Omicron Persia 8', system: 'futurama', inhabited: true }

// Replace a document by another
var {numAffected} = await db.update({ planet: 'Jupiter' }, { planet: 'Pluton'}, {});
// numAffected = 1
// The doc #3 has been replaced by { _id: 'id3', planet: 'Pluton' }
// Note that the _id is kept unchanged, and the document has been replaced
// (the 'system' and inhabited fields are not here anymore)


// Set an existing field's value
var {numAffected} = await db.update({ system: 'solar' }, { $set: { system: 'solar system' } }, { multi: true });
// numAffected = 3
// Field 'system' on Mars, Earth, Jupiter now has value 'solar system'


// Setting the value of a non-existing field in a subdocument by using the dot-notation
var {numAffected} = await db.update({ planet: 'Mars' }, { $set: { "data.satellites": 2, "data.red": true } }, {});
// Mars document now is { _id: 'id1', system: 'solar', inhabited: false
//                      , data: { satellites: 2, red: true }
//                      }
// Not that to set fields in subdocuments, you HAVE to use dot-notation
// Using object-notation will just replace the top-level field

var {numAffected} = await db.update({ planet: 'Mars' }, { $set: { data: { satellites: 3 } } }, {});
// Mars document now is { _id: 'id1', system: 'solar', inhabited: false
//                      , data: { satellites: 3 }
//                      }
// You lost the "data.red" field which is probably not the intended behavior


// Deleting a field
var {numAffected} = await db.update({ planet: 'Mars' }, { $unset: { planet: true } }, {});
// Now the document for Mars doesn't contain the planet field
// You can unset nested fields with the dot notation of course

// Upserting a document (Todo: TEST THE RETURN VALUE....?!)
var {numAffected, affectedDocuments} = await db.update({ planet: 'Pluton' }, { planet: 'Pluton', inhabited: false }, { upsert: true, returnUpdatedDocs: true });
// numAffected = 1, affectedDocuments = { _id: 'id5', planet: 'Pluton', inhabited: false }
// A new document { _id: 'id5', planet: 'Pluton', inhabited: false } has been added to the collection


// If you upsert with a modifier, the upserted doc is the query modified by the modifier
// This is simpler than it sounds :)
await db.update({ planet: 'Pluton' }, { $inc: { distance: 38 } }, { upsert: true });
// A new document { _id: 'id5', planet: 'Pluton', distance: 38 } has been added to the collection  


// If we insert a new document { _id: 'id6', fruits: ['apple', 'orange', 'pear'] } in the collection,
// let's see how we can modify the array field atomically

// $push inserts new elements at the end of the array
await db.update({ _id: 'id6' }, { $push: { fruits: 'banana' } }, {});
// Now the fruits array is ['apple', 'orange', 'pear', 'banana']


// $pop removes an element from the end (if used with 1) or the front (if used with -1) of the array
await db.update({ _id: 'id6' }, { $pop: { fruits: 1 } }, {});
// Now the fruits array is ['apple', 'orange']
// With { $pop: { fruits: -1 } }, it would have been ['orange', 'pear']


// $addToSet adds an element to an array only if it isn't already in it
// Equality is deep-checked (i.e. $addToSet will not insert an object in an array already containing the same object)
// Note that it doesn't check whether the array contained duplicates before or not
await db.update({ _id: 'id6' }, { $addToSet: { fruits: 'apple' } }, {});
// The fruits array didn't change
// If we had used a fruit not in the array, e.g. 'banana', it would have been added to the array


// $pull removes all values matching a value or even any NeDB query from the array
await db.update({ _id: 'id6' }, { $pull: { fruits: 'apple' } }, {});
// Now the fruits array is ['orange', 'pear']

await db.update({ _id: 'id6' }, { $pull: { fruits: $in: ['apple', 'pear'] } }, {});
// Now the fruits array is ['orange']


// $each can be used to $push or $addToSet multiple values at once
// This example works the same way with $addToSet
await db.update({ _id: 'id6' }, { $push: { fruits: { $each: ['banana', 'orange'] } } }, {});
// Now the fruits array is ['apple', 'orange', 'pear', 'banana', 'orange']


// $slice can be used in cunjunction with $push and $each to limit the size of the resulting array.
// A value of 0 will update the array to an empty array. A positive value n will keep only the n first elements
// A negative value -n will keep only the last n elements.
// If $slice is specified but not $each, $each is set to []
await db.update({ _id: 'id6' }, { $push: { fruits: { $each: ['banana'], $slice: 2 } } }, {});
// Now the fruits array is ['apple', 'orange']


// $min/$max to update only if provided value is less/greater than current value
// Let's say the database contains this document
// doc = { _id: 'id', name: 'Name', value: 5 }
await db.update({ _id: 'id1' }, { $min: { value: 2 } }, {});
// The document will be updated to { _id: 'id', name: 'Name', value: 2 }

await db.update({ _id: 'id1' }, { $min: { value: 8 } }, {});
// The document will not be modified

```

### Removing documents
`db.remove(query, options)` will remove all documents matching `query` according to `options`  
* `query` is the same as the ones used for finding and updating
* `options` only one option for now: `multi` which allows the removal of multiple documents if set to true. Default is false


```javascript
// Let's use the same example collection as in the "finding document" part
// { _id: 'id1', planet: 'Mars', system: 'solar', inhabited: false }
// { _id: 'id2', planet: 'Earth', system: 'solar', inhabited: true }
// { _id: 'id3', planet: 'Jupiter', system: 'solar', inhabited: false }
// { _id: 'id4', planet: 'Omicron Persia 8', system: 'futurama', inhabited: true }

// Remove one document from the collection
// options set to {} since the default for multi is false
var numRemoved = await db.remove({ _id: 'id2' }, {});
// numRemoved = 1


// Remove multiple documents
var numRemoved = await db.remove({ system: 'solar' }, { multi: true });
// numRemoved = 3
// All planets from the solar system were removed

// Removing all documents with the 'match-all' query
var numRemoved = await db.remove({}, { multi: true });
```

### Indexing
NeDB supports indexing. It gives a very nice speed boost and can be used to enforce a unique constraint on a field. You can index any field, including fields in nested documents using the dot notation. For now, indexes are only used to speed up basic queries and queries using `$in`, `$lt`, `$lte`, `$gt` and `$gte`. The indexed values cannot be of type array of object.

To create an index, use `datastore.ensureIndex(options)`.`ensureIndex` can be called when you want, even after some data was inserted, though it's best to call it at application startup. The options are:  

* **fieldName** (required): name of the field to index. Use the dot notation to index a field in a nested document.
* **unique** (optional, defaults to `false`): enforce field uniqueness. Note that a unique index will raise an error if you try to index two documents for which the field is not defined.
* **sparse** (optional, defaults to `false`): don't index documents for which the field is not defined. Use this option along with "unique" if you want to accept multiple documents for which it is not defined.
* **expireAfterSeconds** (number of seconds, optional): if set, the created index is a TTL (time to live) index, that will automatically remove documents when the system date becomes larger than the date on the indexed field plus `expireAfterSeconds`. Documents where the indexed field is not specified or not a `Date` object are ignored

Note: the `_id` is automatically indexed with a unique constraint, no need to call `ensureIndex` on it.

You can remove a previously created index with `datastore.removeIndex(fieldName, cb)`.

If your datastore is persistent, the indexes you created are persisted in the datafile, when you load the database a second time they are automatically created for you. No need to remove any `ensureIndex` though, if it is called on a database that already has the index, nothing happens.

```javascript
await db.ensureIndex({ fieldName: 'somefield' });
// If there was an error, err is not null


// Using a unique constraint with the index
await db.ensureIndex({ fieldName: 'somefield', unique: true });

// Using a sparse unique index
await db.ensureIndex({ fieldName: 'somefield', unique: true, sparse: true });


// Format of the error message when the unique constraint is not met
await db.insert({ somefield: 'nedb' });
// err is null
await db.insert({ somefield: 'nedb' });
// err is thrown => { errorType: 'uniqueViolated'
//        , key: 'name'
//        , message: 'Unique constraint violated for key name' }


// Remove index on field somefield
await db.removeIndex('somefield');

// Example of using expireAfterSeconds to remove documents 1 hour
// after their creation (db's timestampData option is true here)
await db.ensureIndex({ fieldName: 'createdAt', expireAfterSeconds: 3600 });

// You can also use the option to set an expiration date like so
await db.ensureIndex({ fieldName: 'expirationDate', expireAfterSeconds: 0 }
// Now all documents will expire when system time reaches the date in their
// expirationDate field

```

**Note:** the `ensureIndex` function creates the index synchronously, so it's best to use it at application startup. It's quite fast so it doesn't increase startup time much (35 ms for a collection containing 10,000 documents).


## Browser version
The browser version and its minified counterpart are in the `browser-version/out` directory. You only need to require `nedb.js` or `nedb.min.js` in your HTML file and the global object `Nedb` can be used right away, with the same API as the server version:

```
<script src="nedb.min.js"></script>
<script>
  var db = new Nedb();   // Create an in-memory only datastore

  async function main(){

    await db.insert({ planet: 'Earth' });
    var docs = await db.find({});
    // docs contains the two planets Earth and Mars
  }

  main();
</script>
```

If you specify a `filename`, the database will be persistent, and automatically select the best storage method available (IndexedDB, WebSQL or localStorage) depending on the browser. In most cases that means a lot of data can be stored, typically in hundreds of MB. **WARNING**: the storage system changed between v1.3 and v1.4 and is NOT back-compatible! Your application needs to resync client-side when you upgrade NeDB.

NeDB is compatible with all major browsers: Chrome, Safari, Firefox, IE9+. Tests are in the `browser-version/test` directory (files `index.html` and `testPersistence.html`).

If you fork and modify nedb, you can build the browser version from the sources, the build script is `browser-version/build.js`.


## Group by statements

Sometimes you want to get statistics from your data and need to sum up or count data. E.g. for displaying charts in your program. An SQL database provides you with the 'group by' statement; therefore nedb is now able to group data as well.

The `groupBy(attribute)` can be added after a `find` method (which returns a Cursor object). Currently the group by only works with ONE attribute.

On the one hand you need to group by an attribute on the other hand you need to define some aggregates. The `aggregates(object)` method receives a json object with all the aggregates to build. An aggregates is build like this: {`<aggregate-name>`:[`<method>`, `<attribute-to-aggregate>`] }

The following methods are supported: 
* **sum**: Build a sum for each group
* **min**: Take the minimum of each group 
* **max**: Take the maximum of each group
* **avg**: Build the average of each group
* **median**: Build the median of each group
* **count**: Count the members of each group

E.g. so if you want to count all members of a group you define this:
```javascript
 
var data = await db.find({})
  .groupBy("the-attribute-to-group-over")
  .aggregates({"count": ["count":"the-attribute-to-count"]});

```
And now some examples: 

```javascript
// Let's think about these documents as base for the statistics
// Some different product types sold to children, teens or adults
// { customerType: 'Child', productType: 'toys', price: 10.56 }
// { customerType: 'Child', productType: 'toys', price: 4.99 }
// { customerType: 'Teen',  productType: 'toys', price: 20.56 }
// { customerType: 'Teen',  productType: 'sports', price: 210.10 }
// { customerType: 'Teen',  productType: 'sports', price: 74.78 }
// { customerType: 'Teen',  productType: 'electronic', price: 45.99 }
// { customerType: 'Adult', productType: 'electronic', price: 254.11 }
// { customerType: 'Adult', productType: 'sports', price: 312.11 }

// Group the data by customerType first
var stats = await db.find({}).groupBy("customerType");
// This data is returned (all three groups of customers)
// [
//  { customerType: 'Child' },
//  { customerType: 'Teen' },
//  { customerType: 'Adult' }
//]

// Now we need some statistics for this grouping
var stats = await db.find({})
  .groupBy("customerType")
  .aggregates({"sumOfPrices": ["sum", "price"]});
// This data is returned (all three groups of customers)
// [
//  { customerType: 'Child', sumOfPrices: 15.55 },
//  { customerType: 'Teen',  sumOfPrices: 351.43 },
//  { customerType: 'Adult', sumOfPrices: 566.22 }
//]

// Of course you can sort by the new defined attribute too
var stats = await db.find({})
  .groupBy("customerType")
  .sort({"sumOfPrices":-1})
  .aggregates({"sumOfPrices": ["sum", "price"]})
// This data is returned (now sorted)
// [
//   { customerType: 'Adult', sumOfPrices: 566.22 },
//   { customerType: 'Teen',  sumOfPrices: 351.43 },
//   { customerType: 'Child', sumOfPrices: 15.55 }
// ]

// We want to know the max, avg, sum and count of sold products by product type
var stats = await db.find({})
  .groupBy("productType")
  .aggregates({
    "sum": ["sum", "price"],
    "avg": ["avg", "price"],
    "max": ["max", "price"],
    "min": ["min", "price"],
    "count": ["count", "price"],
  })

// And the stats are this
//   [
//   {
//     productType: 'toys',
//     sum: 36.11,
//     avg: 12.036666666666667,
//     max: 20.56,
//     min: 4.99,
//     count: 3
//   },
//   {
//     productType: 'sports',
//     sum: 596.99,
//     avg: 198.99666666666667,
//     max: 312.11,
//     min: 74.78,
//     count: 3
//   },
//   {
//     productType: 'electronic',
//     sum: 300.1,
//     avg: 150.05,
//     max: 254.11,
//     min: 45.99,
//     count: 2
//   }
// ]

// Of course you can restrict the dataset in the find method before group the data
// Here to find all the product types sold to adults
var stats = await db.find({"customerType": "Adult"})
  .groupBy("productType")
  .aggregates({
    "sum": ["sum", "price"],   
    "count": ["count", "price"],
  })
// And the return value is this (as you can see, only the "Adult" specific records are used for the group by)
// [
//   { productType: 'sports', sum: 312.11, count: 1 },
//   { productType: 'electronic', sum: 254.11, count: 1 }
// ]

```

Another option for the group by is the rollup method to get an "overall" stats. Just add "withRollup" to a cursor object to get the rolled-up data as the last record in the dataset. The "meta" data contains the flag "rollupRow" = true to mark that row.

```javascript

// Request as before....

var stats = await db.find({})
  .groupBy("productType")
  .aggregates({
    "sum": ["sum", "price"],
    "avg": ["avg", "price"],
    "max": ["max", "price"],
    "min": ["min", "price"],
    "count": ["count", "price"],
  })
  .withRollup();

// Now the data contains one more row....
// [ ...
//   {
//     productType: null,
//     __meta: { rollupRow: true },
//     sum: 933.1999999999999,
//     avg: 116.64999999999999,
//     max: 312.11,
//     min: 4.99,
//     count: 8
//   }
//  ]
```


## Model attribute

For rapid prototyping (and later logical connections between records) we wanted to use a single nedb instance for different datastructures easily. Therefore we added a helper method called `model(model-name)`, that operates on the Datastore object of nedb.

After called on the db instance, all chained method calls after that consider the action as action on "the defined model". Internally the attribute "_model" is used for that logic (so please don't use the _model attribute for data attributes or you will get corrupted data).

```javascript
// Think of a grocery store: we are adding products and prduct categories
await db.model("Product").insert([
  {name:'Butter', price: 0.55},
  {name:'Bread', price: 1.55},
  {name:'Fish', price: 4.55},
  {name:'Beer', price: 0.99},
  {name:'Water', price: 0.15},
  {name:'Bagel', price: 0.35}
]);

await db.model("Category").insert([
  {name:'Fish & Meat'},
  {name:'Pastry'},
  {name:'Drink'},
  {name:'Other'}
]);

// After that the database looks something like this
// {"name":"Butter","price":0.55,"_model":"Product","_id":"hHR6Cld04NTbaFKr"}
// {"name":"Bread","price":1.55,"_model":"Product","_id":"58IsGkN9VVsa4nfD"}
// {"name":"Fish","price":4.55,"_model":"Product","_id":"GtvQeEuGKO45qCDi"}
// {"name":"Beer","price":0.99,"_model":"Product","_id":"fDsE8lSUTTwwrJxJ"}
// {"name":"Water","price":0.15,"_model":"Product","_id":"ZREZmklpnxuC4ioS"}
// {"name":"Bagel","price":0.35,"_model":"Product","_id":"2PivF6597cqKnhAj"}
// {"name":"Fish & Meat","_model":"Category","_id":"QBCBMS7Acs8R5IsB"}
// {"name":"Pastry","_model":"Category","_id":"HzpWciKaPp7IN7iO"}
// {"name":"Drink","_model":"Category","_id":"6P2n35g7cXn7VVRD"}
// {"name":"Other","_model":"Category","_id":"Ze5hWjNMYbnPfNWN"}


// The "model" method works with ALL other methods too
// count overall entries in the database
var count = await db.count();
// count is 10
var count = await db.model("Product").count();
// count is 6
var count = await db.model("Category").count();
// count is 4

// The same with "find", "remove" or "update" methods....

// Find over ALL model types
var data = await db.find({name: /Fish/});
// returns two entries
// [
//   { name: 'Fish & Meat', _model: 'Category', _id: 'bVGaMOQZ6OhnOyGS' },
//   { name: 'Fish', price: 4.55, _model: 'Product', _id: 'tp9koGOkkQh4G0Iu'}
// ]
var data = await db.model("Category").find({name: /Fish/});
// returns only the entries found in the 'Category' model
// [
//   { name: 'Fish & Meat', _model: 'Category', _id: 'bVGaMOQZ6OhnOyGS' }
// ]

// Update all models of type "Category"
var updated = await db.model("Category").update({}, {$set:{"t": 11}}, {multi: true});
// updated returns a count of 4

var numDeleted = await db.model("Product").remove({}, { multi: true });
// numDeleted is 6: only the Product entries are deleted from the database instance

```

## Left join 

The fun starts if you now want to use the model structure with joins between the data. 
Therefore we added the method `leftJoin(leftSideCombination, rightSideCombination)` that operates on a Cursor object with the usage of the model method.

A combination for the left and right side of the join is given by the model name and an attribute to join over (combined with a colon). So lets take the data from the example above and use the internal id (_id) of the Category as foreign key in Product.

Load the data 
```javascript
var ids = {};
var doc = await db.model("Category").insert({name:'Fish & Meat'});
ids["Fish & Meat"] = doc._id;
var doc = await db.model("Category").insert({name:'Pastry'});
ids["Pastry"] = doc._id;
var doc = await db.model("Category").insert({name:'Drink'});
ids["Drink"] = doc._id;
var doc = await db.model("Category").insert({name:'Other'});
ids["Other"] = doc._id;

await db.model("Product").insert([
    {name:'Butter', price: 0.55, catId: ids["Other"]},
    {name:'Bread', price: 1.55, catId: ids["Pastry"]},
    {name:'Fish', price: 4.55, catId: ids["Fish & Meat"]},
    {name:'Beer', price: 0.99, catId: ids["Drink"]},
    {name:'Water', price: 0.15, catId: ids["Drink"]},
    {name:'Bagel', price: 0.35, catId: ids["Pastry"]}
  ]);
          
// After that the database looks like this:
// {"name":"Drink","_model":"Category","_id":"0JflUQvrL642SJPP"}
// {"name":"Pastry","_model":"Category","_id":"42ZOkZbeaYly7jSN"}
// {"name":"Bagel","price":0.35,"catId":"42ZOkZbeaYly7jSN","_model":"Product","_id":"5377x1uSc3957iB7"}
// {"name":"Butter","price":0.55,"catId":"ksGcXg79V7x0fcTO","_model":"Product","_id":"8ZAQG7JIucoblF8a"}
// {"name":"Fish","price":4.55,"catId":"bhavR7EHn7ckx4f8","_model":"Product","_id":"8wTHk3ADNNPHA8Uu"}
// {"name":"Water","price":0.15,"catId":"0JflUQvrL642SJPP","_model":"Product","_id":"alveou8enPH4zQNK"}
// {"name":"Fish & Meat","_model":"Category","_id":"bhavR7EHn7ckx4f8"}
// {"name":"Bread","price":1.55,"catId":"42ZOkZbeaYly7jSN","_model":"Product","_id":"krteAWhHGPChXskZ"}
// {"name":"Other","_model":"Category","_id":"ksGcXg79V7x0fcTO"}
// {"name":"Beer","price":0.99,"catId":"0JflUQvrL642SJPP","_model":"Product","_id":"zdJlOI05L91hv3sE"}

```

After that we can use the foreign key `catId` to join the both models together: so now we want to add the name of the category for each product via left join:

```javascript
var data = await db.model("Product")
        .find()
        .leftJoin("Product:catId", "Category:_id")
// per default (since we have two different models combined) the attribute names are combined with their corresponding model name
//[
// {
//   'Product:name': 'Bagel',
//   'Product:price': 0.35,
//   'Product:catId': '42ZOkZbeaYly7jSN',
//   'Product:_model': 'Product',
//   'Product:_id': '5377x1uSc3957iB7',
//   'Category:name': 'Pastry',
//   'Category:_model': 'Category',
//   'Category:_id': '42ZOkZbeaYly7jSN'
// },
// {
//   'Product:name': 'Butter',
//   'Product:price': 0.55,
//   'Product:catId': 'ksGcXg79V7x0fcTO',
//   'Product:_model': 'Product',
//   'Product:_id': '8ZAQG7JIucoblF8a',
//   'Category:name': 'Other',
//   'Category:_model': 'Category',
//   'Category:_id': 'ksGcXg79V7x0fcTO'
// },
// ...
// ]

// And now the magic starts
// only select the Products of the "Drink" category (after the join is made ;)
// and sort it by the name of the product
// and use a projection as well
var data = await db.model("Product")
    .find({"Category:name":"Drink"},{"_id": 0, "Product:name":1, "Product:price":1,"Category:name":1})
    .leftJoin("Product:catId", "Category:_id")
    .sort({"Product:name":1})
// the returned data is this:
// [
//   { 'Product:name': 'Beer', 'Product:price': 0.99, 'Category:name': 'Drink'},
//   { 'Product:name': 'Water','Product:price': 0.15, 'Category:name': 'Drink'}
// ]


// And just for the fun of it: combine the left join with the group by and sum up the prices
var data = await db.model("Product")
    .find({"Category:name":"Drink"},{"_id": 0, "sum": 1, "Product:name":1, "Product:price":1, "Category:name":1})
    .leftJoin("Product:catId", "Category:_id")
    .sort({"Product:name":1})
    .groupBy("Category:name")
    .aggregates({sum:["sum","Product:price"]});
// returns the following record set
// [ { sum: 1.14, 'Category:name': 'Drink' } ]

```

## Tree data

...in progress...


## License 

See [License](LICENSE)
