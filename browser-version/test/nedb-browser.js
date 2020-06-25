/**
 * Testing the browser version of NeDB
 * The goal of these tests is not to be exhaustive, we have the server-side NeDB tests for that
 * This is more of a sanity check which executes most of the code at least once and checks
 * it behaves as the server version does
 */

var assert = chai.assert;

/**
 * Given a docs array and an id, return the document whose id matches, or null if none is found
 */
function findById (docs, id) {
  return _.find(docs, function (doc) { return doc._id === id; }) || null;
}


describe('Basic CRUD functionality', function () {

  it('Able to create a database object in the browser', function () {
    let db = new Nedb();

    // assert.equal(db.inMemoryOnly, true);
    // assert.equal(db.persistence.inMemoryOnly, true);
    assert.equal(1,1);
  });


  it('Insertion and querying', async function () {
    
    let db = new Nedb();

    var newDoc1  = await db.insert({ a: 4 });
    var newDoc2 = await db.insert({ a: 40 });
    var newDoc3 = await db.insert({ a: 400 });
    
    let docs = await db.find({ a: { $gt: 36 } });
    
    let doc2 = _.find(docs, function (doc) { return doc._id === newDoc2._id; })
      , doc3 = _.find(docs, function (doc) { return doc._id === newDoc3._id; })
      ;
  
    assert.equal(docs.length, 22);
    assert.equal(doc2.a, 40);
    assert.equal(doc3.a, 400);

    let docs2 = await db.find({ a: { $lt: 36 } });
    assert.equal(docs2.length, 1);
    assert.equal(docs2[0].a, 4);
    
  });

  it('Querying with regular expressions', async function () {
    var db = new Nedb();

    var newDoc1  = await db.insert({ planet: 'Earth' });
    var newDoc2  = await db.insert({ planet: 'Mars' });
    var newDoc3  = await db.insert({ planet: 'Jupiter' });
    var newDoc4  = await db.insert({ planet: 'Eaaaaaarth' });
    var newDoc5  = await db.insert({ planet: 'Maaaars' });

      
    var docs = await db.find({ planet: /ar/ });

    assert.equal(docs.length, 4);
    assert.equal(_.find(docs, function (doc) { return doc._id === newDoc1._id; }).planet, 'Earth');
    assert.equal(_.find(docs, function (doc) { return doc._id === newDoc2._id; }).planet, 'Mars');
    assert.equal(_.find(docs, function (doc) { return doc._id === newDoc4._id; }).planet, 'Eaaaaaarth');
    assert.equal(_.find(docs, function (doc) { return doc._id === newDoc5._id; }).planet, 'Maaaars');

    docs = await db.find({ planet: /aa+r/ });
    assert.equal(docs.length, 2);
    assert.equal(_.find(docs, function (doc) { return doc._id === newDoc4._id; }).planet, 'Eaaaaaarth');
    assert.equal(_.find(docs, function (doc) { return doc._id === newDoc5._id; }).planet, 'Maaaars');


  });

  it('Updating documents', async function () {
    var db = new Nedb();

    var newDoc1  = await db.insert({ planet: 'Eaaaaarth' });
    var newDoc2 = await db.insert({ planet: 'Maaaaars' });
    
    // Simple update
    var nr = await db.update({ _id: newDoc2._id }, { $set: { planet: 'Saturn' } }, {});
    assert.equal(nr, 1);

    var docs = await db.find({});

    assert.equal(docs.length, 2);
    assert.equal(findById(docs, newDoc1._id).planet, 'Eaaaaarth');
    assert.equal(findById(docs, newDoc2._id).planet, 'Saturn');

    // Failing update
    nr = await db.update({ _id: 'unknown' }, { $inc: { count: 1 } }, {});
    assert.equal(nr, 0);

    docs = await db.find({});
    assert.equal(docs.length, 2);
    assert.equal(findById(docs, newDoc1._id).planet, 'Eaaaaarth');
    assert.equal(findById(docs, newDoc2._id).planet, 'Saturn');

    // Document replacement
    nr = await db.update({ planet: 'Eaaaaarth' }, { planet: 'Uranus' }, { multi: false });
    assert.equal(nr, 1);

    docs = await db.find({});
    assert.equal(docs.length, 2);
    assert.equal(findById(docs, newDoc1._id).planet, 'Uranus');
    assert.equal(findById(docs, newDoc2._id).planet, 'Saturn');

    // Multi update
    nr = await db.update({}, { $inc: { count: 3 } }, { multi: true });
    assert.equal(nr, 2);
  
    docs = await db.find({});
    assert.equal(docs.length, 2);
    assert.equal(findById(docs, newDoc1._id).planet, 'Uranus');
    assert.equal(findById(docs, newDoc1._id).count, 3);
    assert.equal(findById(docs, newDoc2._id).planet, 'Saturn');
    assert.equal(findById(docs, newDoc2._id).count, 3);

  });

  it('Updating documents: special modifiers', async function () {

    var db = new Nedb();

    var newDoc1 = await db.insert({ planet: 'Earth' });

    // Pushing to an array
    var nr = await db.update({}, { $push: { satellites: 'Phobos' } }, {});
    assert.equal(nr, 1);

    var doc = await db.findOne({});
    assert.deepEqual(doc, { planet: 'Earth', _id: newDoc1._id, satellites: ['Phobos'] });

    nr = await db.update({}, { $push: { satellites: 'Deimos' } }, {});
    assert.equal(nr, 1);

    doc = await db.findOne({});
    assert.deepEqual(doc, { planet: 'Earth', _id: newDoc1._id, satellites: ['Phobos', 'Deimos'] });
  });


  it('Upserts', async function () {
    var db = new Nedb();

    var result = await db.update({ a: 4 }, { $inc: { b: 1 } }, { upsert: true });
    console.log(result);

    // Return upserted document
    assert.equal(result.affectedDocuments.a, 4);
    assert.equal(result.affectedDocuments.b, 1);
    assert.equal(result.numAffected, 1);

    var docs = await db.find({});
    assert.equal(docs.length, 1);
    assert.equal(docs[0].a, 4);
    assert.equal(docs[0].b, 1);

  });

  it('Removing documents', async function () {
    var db = new Nedb();

    await db.insert({ a: 2 });
    await db.insert({ a: 5 });
    await db.insert({ a: 7 });

    // Multi remove
    var nr = await db.remove({ a: { $in: [ 5, 7 ] } }, { multi: true });
    assert.equal(nr, 2);

    var docs = await db.find({});
    assert.equal(docs.length, 1);
    assert.equal(docs[0].a, 2);

    // Remove with no match
    nr = await db.remove({ b: { $exists: true } }, { multi: true });
    assert.equal(nr, 0);

    docs = await db.find({})
    assert.equal(docs.length, 1);
    assert.equal(docs[0].a, 2);

    // Simple remove
    nr = await db.remove({ a: { $exists: true } }, { multi: true });
    assert.equal(nr, 1);

    docs = await db.find({})
    assert.equal(docs.length, 0);

  });

});   // ==== End of 'Basic CRUD functionality' ==== //


describe('Indexing', function () {

  it('getCandidates works as expected', async function () {
    var db = new Nedb();

    await db.insert([{ a: 4 },{ a: 6 },{ a: 7 }]);

    return new Promise((resolve)=>{
      
      db.__original.getCandidates({ a: 6 }, function (err, candidates) {
           
            assert.equal(candidates.length, 3);
            assert.isDefined(_.find(candidates, function (doc) { return doc.a === 4; }));
            assert.isDefined(_.find(candidates, function (doc) { return doc.a === 6; }));
            assert.isDefined(_.find(candidates, function (doc) { return doc.a === 7; }));

            db.ensureIndex({ fieldName: 'a' });

            db.__original.getCandidates({ a: 6 }, function (err, candidates) {
              assert.equal(candidates.length, 1);
              assert.isDefined(_.find(candidates, function (doc) { return doc.a === 6; }));

              resolve();
            });
          });
    });
       
    
  });

  it('Can use indexes to enforce a unique constraint', async function () {
    var db = new Nedb();

    await db.ensureIndex({ fieldName: 'u', unique: true });

    await db.insert({ u : 5 });
    await db.insert({ u : 98 });
    
    try{
        await db.insert({ u : 5 });
    }catch(err){
      assert.equal(err.errorType, 'uniqueViolated');
    }
  });


});   // ==== End of 'Indexing' ==== //


describe("Don't forget to launch persistence tests!", function () {

  it("See file testPersistence.html", function (done) {
    done();
  });

});   // ===== End of 'persistent in-browser database' =====


