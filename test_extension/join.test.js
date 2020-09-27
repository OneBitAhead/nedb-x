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

describe('Join', async function () {


  // beforeEach vs. before
  before(async function () {

    db = new Datastore();

    await db.remove({}, { multi: true });

    // Three groups
    var groupIds = {};
    var data = await db.model("Group").insert({ "name": "Admins" })
    groupIds["admin"] = data["_id"];
    var data = await db.model("Group").insert({ "name": "OBA" })
    groupIds["oba"] = data["_id"];
    var data = await db.model("Group").insert({ "name": "Default" })
    groupIds["default"] = data["_id"];

    // Seven Users
    await db.model("User").insert({ "name": "Peter", fkGroupId: groupIds["admin"], "age": 33 })
    await db.model("User").insert({ "name": "Maria", fkGroupId: groupIds["admin"], "age": 32 })
    await db.model("User").insert({ "name": "Hans", fkGroupId: groupIds["oba"], "age": 43 })
    await db.model("User").insert({ "id": 1, "name": "Barbara", fkGroupId: groupIds["oba"], "age": 23 })
    await db.model("User").insert({ "id": 2, __parent: 1, "name": "Stefanie", fkGroupId: null, "age": 54 })
    await db.model("User").insert({ __parent: 1, name: "Phantomas", fkGroupId: null, "age": 113 })
    await db.model("User").insert({ __parent: 1, name: "Anton", fkGroupId: groupIds["admin"], "age": 3 })

    // Three "Tests"
    await db.model("Test").insert({ "name": "Test 1", fkGroupId: groupIds["oba"] })
    await db.model("Test").insert({ "name": "Test 2", fkGroupId: groupIds["admin"] });
    await db.model("Test").insert({ "name": "Test 3", fkGroupId: groupIds["oba"] });
    await db.model("Test").insert({ "name": "Test 4", fkGroupId: null });
    await db.model("Test").insert({ "name": "Test 5", fkGroupId: null });


    await db.ensureIndex({ fieldName: '_model' });

  });



    it('Simple join (2 models)', async function () {

      var data = await db.model("Group").find().leftJoin("Group:_id", "User:fkGroupId").sort({ "Group:name": 1 });

      assert.equal(data.length, 6);
      var admins = {};

      for (var x in data) {
        if (admins[data[x]["Group:name"]] == undefined) admins[data[x]["Group:name"]] = [];
        admins[data[x]["Group:name"]].push(data[x]["User:name"]);
      }

      assert.equal(admins["Admins"].length, 3);
      assert.equal(admins["Default"].length, 1);
      assert.equal(admins["OBA"].length, 2);

      assert.notEqual(admins["Admins"].indexOf("Anton"), -1)
      assert.notEqual(admins["Admins"].indexOf("Maria"), -1)
      assert.notEqual(admins["Admins"].indexOf("Peter"), -1)

      assert.equal(admins["Default"][0], undefined)

      assert.notEqual(admins["OBA"].indexOf("Barbara"), -1)
      assert.notEqual(admins["OBA"].indexOf("Hans"), -1)



    });

    it('Simple join (2 models other way)', async function () {

      var data = await db.model("User").find().leftJoin("User:fkGroupId", "Group:_id").sort({ "User:name": 1 });

      assert.equal(data.length, 7);

      assert.equal(data[0]["User:name"], "Anton");
      assert.equal(data[0]["Group:name"], "Admins");

      assert.equal(data[1]["User:name"], "Barbara");
      assert.equal(data[1]["Group:name"], "OBA");

      assert.equal(data[2]["User:name"], "Hans");
      assert.equal(data[2]["Group:name"], "OBA");

      assert.equal(data[3]["User:name"], "Maria");
      assert.equal(data[3]["Group:name"], "Admins");

      assert.equal(data[4]["User:name"], "Peter");
      assert.equal(data[4]["Group:name"], "Admins");

      assert.equal(data[5]["User:name"], "Phantomas");
      assert.equal(data[5]["Group:name"], undefined);

      assert.equal(data[6]["User:name"], "Stefanie");
      assert.equal(data[6]["Group:name"], undefined);

    });

    it('Simple join (3 models)', async function () {



      var data = await db.model("Test").find()
        .leftJoin("Test:fkGroupId", "Group:_id")
        .leftJoin("Group:_id", "User:fkGroupId")
        .sort({ "User:name": 1, "Test:name": 1 });


      assert.equal(data.length, 9);

      assert.equal(data[0]["Test:name"], "Test 4");
      assert.equal(data[0]["User:name"], undefined);
      assert.equal(data[0]["Group:name"], undefined);

      assert.equal(data[1]["Test:name"], "Test 5");
      assert.equal(data[1]["User:name"], undefined);
      assert.equal(data[1]["Group:name"], undefined);


      assert.equal(data[2]["Test:name"], "Test 2");
      assert.equal(data[2]["User:name"], "Anton");
      assert.equal(data[2]["Group:name"], "Admins");

      assert.equal(data[3]["Test:name"], "Test 1");
      assert.equal(data[3]["User:name"], "Barbara");
      assert.equal(data[3]["Group:name"], "OBA");

      assert.equal(data[4]["Test:name"], "Test 3");
      assert.equal(data[4]["User:name"], "Barbara");
      assert.equal(data[4]["Group:name"], "OBA");

      assert.equal(data[5]["Test:name"], "Test 1");
      assert.equal(data[5]["User:name"], "Hans");
      assert.equal(data[5]["Group:name"], "OBA");

      assert.equal(data[6]["Test:name"], "Test 3");
      assert.equal(data[6]["User:name"], "Hans");
      assert.equal(data[6]["Group:name"], "OBA");

      assert.equal(data[7]["Test:name"], "Test 2");
      assert.equal(data[7]["User:name"], "Maria");
      assert.equal(data[7]["Group:name"], "Admins");

      assert.equal(data[8]["Test:name"], "Test 2");
      assert.equal(data[8]["User:name"], "Peter");
      assert.equal(data[8]["Group:name"], "Admins");

    });

});