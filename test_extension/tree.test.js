var should = require('chai').should()
  , assert = require('chai').assert
  , testDb = 'workspace/groupBy.test.db'
  , fs = require('fs')
  , path = require('path')
  , _ = require('underscore')
  , async = require('async')
  , model = require('../lib/model')
  , Datastore = require('../lib-promise/datastore')
  ;
var db;

describe('Tree data', async function () {


  // beforeEach vs. before
  before(async function () {

    db = new Datastore();
    var num = await db.remove({}, { multi: true });

    await db.model("Tree").insert({ "id": 1, "name": "Alpha" })
    await db.model("Tree").insert({ "id": 2, "name": "Beta", })
    await db.model("Tree").insert({ "id": 4, "name": "Gamma", "food": '🥩'  })

    await db.model("Tree2").insert({ "id": 1, "name": "Hera" })
    await db.model("Tree2").insert({ "id": 2, "name": "Zeus" })
    await db.model("Tree2").insert({ "id": 3, "name": "Herkules", __parent: 2 })
       

    await db.model("Tree").insert({ "name": "Alpha 1.1", "food": '🥓', "__parent": 1 });
    await db.model("Tree").insert({ "name": "Alpha 1.2", "__parent": 1 });
    await db.model("Tree").insert({ "name": "Alpha 1.3 (Gamma)", "__parent": 1 });

    await db.model("Tree").insert({ "name": "Beta Lollipop", "__parent": 2 })
    await db.model("Tree").insert({ id: 3, "name": "Beta Zulu", "__parent": 2 })
    await db.model("Tree").insert({ "name": "Beta Clown", "__parent": 2 })
    await db.model("Tree").insert({ "name": "Beta Toledo", "__parent": 2 })

    await db.model("Tree").insert({ id: 10, "name": "Beta 1.2.1", "food": '🥩', "__parent": 3 })
    await db.model("Tree").insert({ id: 11, "name": "Beta 1.2.1.1 (Gamma)", "__parent": 10 })

    await db.model("Tree").insert({ "name": "Gamma 1.1", "__parent": 4 })
    await db.model("Tree").insert({ "name": "Gamma 1.2 (Beta-Addon)", "__parent": 4 })
    await db.model("Tree").insert({ "name": "Gamma 1.3", "__parent": 4 })

    await db.model("Tree").insert({ "name": "Beta 1.2.2", "food": '🥓', "__parent": 3 })
    await db.ensureIndex({ fieldName: '_model' });

  });


    it('Default tree without open nodes', async function () {

      var data = await db.model("Tree").find().asTree().sort({name:1});//{ openAll: false, openTreeIds: [] })    

        //console.log(data);
      // db.logTree(data);

      assert.equal(data[0].name, "Alpha");
      assert.equal(data[0].__meta.__level, 0);
      assert.equal(data[0].__meta.__childCount, 3);
      
            
      assert.equal(data[1].name, "Beta");
      assert.equal(data[1].__meta.__level, 0);
      assert.equal(data[1].__meta.__childCount, 4);
      
      assert.equal(data[2].name, "Gamma");
      assert.equal(data[2].__meta.__level, 0);
      assert.equal(data[2].__meta.__childCount, 3);
      
    });


    it('Default tree (tree2 of same db)', async function () {

      var data = await db.model("Tree2").find().asTree().sort({name:1});//{ openAll: false, openTreeIds: [] })    

      //   console.log(data);
      // db.logTree(data);

      assert.equal(data[0].name, "Hera");
      assert.equal(data[0].__meta.__level, 0);
      assert.equal(data[0].__meta.__childCount, 0);
      
      assert.equal(data[1].name, "Zeus");
      assert.equal(data[1].__meta.__level, 0);
      assert.equal(data[1].__meta.__childCount, 1);

      
    });


    it('Tree with two open levels', async function () {

      var data = await db.model("Tree").find().asTree({openTreeIds: [1,4]}).sort({name:1});//{ openAll: false, openTreeIds: [] })    

      // console.log(data);
      // db.logTree(data);

      assert.equal(data[0].name, "Alpha");
      assert.equal(data[0].__meta.__level, 0);

      assert.equal(data[1].name, "Alpha 1.1");
      assert.equal(data[1].__meta.__level, 1);
      assert.equal(data[2].name, "Alpha 1.2");
      assert.equal(data[2].__meta.__level, 1);
      assert.equal(data[3].name, "Alpha 1.3 (Gamma)");
      assert.equal(data[3].__meta.__level, 1);
                  
      assert.equal(data[4].name, "Beta");
      assert.equal(data[4].__meta.__level, 0);

      assert.equal(data[5].name, "Gamma");
      assert.equal(data[5].__meta.__level, 0);

      assert.equal(data[6].name, "Gamma 1.1");
      assert.equal(data[6].__meta.__level, 1);
      assert.equal(data[7].name, "Gamma 1.2 (Beta-Addon)");
      assert.equal(data[7].__meta.__level, 1);
      assert.equal(data[8].name, "Gamma 1.3");
      assert.equal(data[8].__meta.__level, 1);
      
    });

    it('Tree with three open levels', async function () {

      var data = await db.model("Tree").find().asTree({openTreeIds: [2,3,10,11]}).sort({name:1});//{ openAll: false, openTreeIds: [] })    

      assert.equal(data[0].name, "Alpha");
      assert.equal(data[0].__meta.__level, 0);
                  
      assert.equal(data[1].name, "Beta");
      assert.equal(data[1].__meta.__level, 0);

      assert.equal(data[2].name, "Beta Clown");
      assert.equal(data[2].__meta.__level, 1);
      assert.equal(data[3].name, "Beta Lollipop");
      assert.equal(data[3].__meta.__level, 1);
      assert.equal(data[4].name, "Beta Toledo");
      assert.equal(data[4].__meta.__level, 1);

      assert.equal(data[5].name, "Beta Zulu");
      assert.equal(data[5].__meta.__level, 1);

      assert.equal(data[6].name, "Beta 1.2.1");
      assert.equal(data[6].__meta.__level, 2);

      assert.equal(data[7].name, "Beta 1.2.1.1 (Gamma)");
      assert.equal(data[7].__meta.__level, 3);

      assert.equal(data[8].name, "Beta 1.2.2");
      assert.equal(data[8].__meta.__level, 2);

      assert.equal(data[9].name, "Gamma");
      assert.equal(data[9].__meta.__level, 0);
      
    });


    it('Tree with open ids (2,3,10,11) - sort desc', async function () {

      var data = await db.model("Tree").find().asTree({openTreeIds: [2,3,10,11]}).sort({name:-1});//{ openAll: false, openTreeIds: [] })    

      assert.equal(data[0].name, "Gamma");
      assert.equal(data[0].__meta.__level, 0);

      assert.equal(data[1].name, "Beta");
      assert.equal(data[1].__meta.__level, 0);

      assert.equal(data[2].name, "Beta Zulu");
      assert.equal(data[2].__meta.__level, 1);
     
      assert.equal(data[3].name, "Beta 1.2.2");
      assert.equal(data[3].__meta.__level, 2);

      assert.equal(data[4].name, "Beta 1.2.1");
      assert.equal(data[4].__meta.__level, 2);

      assert.equal(data[5].name, "Beta 1.2.1.1 (Gamma)");
      assert.equal(data[5].__meta.__level, 3);

      assert.equal(data[6].name, "Beta Toledo");
      assert.equal(data[6].__meta.__level, 1);
          
      assert.equal(data[7].name, "Beta Lollipop");
      assert.equal(data[7].__meta.__level, 1);

      assert.equal(data[8].name, "Beta Clown");
      assert.equal(data[8].__meta.__level, 1);

      assert.equal(data[9].name, "Alpha");
      assert.equal(data[9].__meta.__level, 0);
      
    });

    it('Search in tree "Gamma"', async function () {

      var data = await db.model("Tree").find().asTree().sort({name:1}).search("Gamma",["name"]);//{ openAll: false, openTreeIds: [] })    

      // console.log(data);
      // db.logTree(data);

      assert.equal(data[0].name, "Alpha");
      assert.equal(data[0].__meta.__level, 0);
      assert.equal(data[0].__meta.__criteriaMatch, false);
      
      assert.equal(data[1].name, "Alpha 1.3 (Gamma)");
      assert.equal(data[1].__meta.__level, 1);
      assert.equal(data[1].__meta.__criteriaMatch, true);
      
      assert.equal(data[2].name, "Beta");
      assert.equal(data[2].__meta.__level, 0);
      assert.equal(data[2].__meta.__criteriaMatch, false);

      assert.equal(data[3].name, "Beta Zulu");
      assert.equal(data[3].__meta.__level, 1);
      assert.equal(data[3].__meta.__criteriaMatch, false);

      assert.equal(data[4].name, "Beta 1.2.1");
      assert.equal(data[4].__meta.__level, 2);
      assert.equal(data[4].__meta.__criteriaMatch, false);


      assert.equal(data[5].name, "Beta 1.2.1.1 (Gamma)");
      assert.equal(data[5].__meta.__level, 3);
      assert.equal(data[5].__meta.__criteriaMatch, true);


      assert.equal(data[6].name, "Gamma");
      assert.equal(data[6].__meta.__level, 0);
      assert.equal(data[6].__meta.__criteriaMatch, true);

      assert.equal(data[7].name, "Gamma 1.1");
      assert.equal(data[7].__meta.__level, 1);
      assert.equal(data[7].__meta.__criteriaMatch, true);

      assert.equal(data[8].name, "Gamma 1.2 (Beta-Addon)");
      assert.equal(data[8].__meta.__level, 1);
      assert.equal(data[8].__meta.__criteriaMatch, true);

      assert.equal(data[9].name, "Gamma 1.3");
      assert.equal(data[9].__meta.__level, 1);
      assert.equal(data[9].__meta.__criteriaMatch, true);
      
      
    });

    it('Search in tree "Beta 1.2"', async function () {

      var data = await db.model("Tree").find().asTree().sort({name:1}).search("1.2",["name"]);//{ openAll: false, openTreeIds: [] })    

      // console.log(data);
      //db.logTree(data)

      assert.equal(data[0].name, "Alpha");
      assert.equal(data[0].__meta.__level, 0);
      assert.equal(data[0].__meta.__criteriaMatch, false);
      
      assert.equal(data[1].name, "Alpha 1.2");
      assert.equal(data[1].__meta.__level, 1);
      assert.equal(data[1].__meta.__criteriaMatch, true);

      
      assert.equal(data[2].name, "Beta");
      assert.equal(data[2].__meta.__level, 0);
      assert.equal(data[2].__meta.__criteriaMatch, false);

      assert.equal(data[3].name, "Beta Zulu");
      assert.equal(data[3].__meta.__level, 1);
      assert.equal(data[3].__meta.__criteriaMatch, false);

      assert.equal(data[4].name, "Beta 1.2.1");
      assert.equal(data[4].__meta.__level, 2);
      assert.equal(data[4].__meta.__criteriaMatch, true);

      assert.equal(data[5].name, "Beta 1.2.1.1 (Gamma)");
      assert.equal(data[5].__meta.__level, 3);
      assert.equal(data[5].__meta.__criteriaMatch, true);

      assert.equal(data[6].name, "Beta 1.2.2");
      assert.equal(data[6].__meta.__level, 2);
      assert.equal(data[6].__meta.__criteriaMatch, true);

      assert.equal(data[7].name, "Gamma");
      assert.equal(data[7].__meta.__level, 0);
      assert.equal(data[7].__meta.__criteriaMatch, false);

      assert.equal(data[8].name, "Gamma 1.2 (Beta-Addon)");
      assert.equal(data[8].__meta.__level, 1);
      assert.equal(data[8].__meta.__criteriaMatch, true);
      
      
    });


    it('Tree with openAll option"', async function () {


      var data = await db.model("Tree").find({}).asTree({openAll: true}).sort({name:1})
                 
      // console.log(data);
      // db.logTree(data);

      assert.equal(data[0].name, "Alpha");
      assert.equal(data[0].__meta.__level, 0);

      assert.equal(data[1].name, "Alpha 1.1");
      assert.equal(data[1].__meta.__level, 1);

      assert.equal(data[2].name, "Alpha 1.2");
      assert.equal(data[2].__meta.__level, 1);
      
      assert.equal(data[3].name, "Alpha 1.3 (Gamma)");
      assert.equal(data[3].__meta.__level, 1);
      
      assert.equal(data[4].name, "Beta");
      assert.equal(data[4].__meta.__level, 0);

      assert.equal(data[5].name, "Beta Clown");
      assert.equal(data[5].__meta.__level, 1);

      assert.equal(data[6].name, "Beta Lollipop");
      assert.equal(data[6].__meta.__level, 1);     

      assert.equal(data[7].name, "Beta Toledo");
      assert.equal(data[7].__meta.__level, 1);
      
      assert.equal(data[8].name, "Beta Zulu");
      assert.equal(data[8].__meta.__level, 1);

      assert.equal(data[9].name, "Beta 1.2.1");
      assert.equal(data[9].__meta.__level, 2);

      assert.equal(data[10].name, "Beta 1.2.1.1 (Gamma)");
      assert.equal(data[10].__meta.__level, 3);

      assert.equal(data[11].name, "Beta 1.2.2");
      assert.equal(data[11].__meta.__level, 2);

      assert.equal(data[12].name, "Gamma");
      assert.equal(data[12].__meta.__level, 0);;

      assert.equal(data[13].name, "Gamma 1.1");
      assert.equal(data[13].__meta.__level, 1);

      assert.equal(data[14].name, "Gamma 1.2 (Beta-Addon)");
      assert.equal(data[14].__meta.__level, 1);

      assert.equal(data[15].name, "Gamma 1.3");
      assert.equal(data[15].__meta.__level, 1);
      
      
    });


    it('Tree search with unicode character', async function () {

      var data = await db.model("Tree").find({'food':'🥩'}).asTree({openAll: true}).sort({name:1})
                 
      // console.log(data);
      // db.logTree(data);

      assert.equal(data[2].name, "Beta 1.2.1");
      assert.equal(data[2].__meta.__level, 2);
      assert.equal(data[2].food, '🥩');
      

      assert.equal(data[3].name, "Gamma");
      assert.equal(data[3].__meta.__level, 0);
      assert.equal(data[3].food, '🥩');
    
    });


   
});