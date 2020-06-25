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


describe('Group By', async function () {
  var db;

  // beforeEach vs. before
  before(async function () {

    db = new Datastore();
    
    // Insert group by test data
    await db.insert({ "name": "a1", "number": 1, "size": 1,    "group": "a", "date": new Date('2020-01-01') })
    await db.insert({ "name": "a2", "number": 5, "size": 2,    "group": "a", "date": new Date('2020-02-01') })
    await db.insert({ "name": "a3", "number": 4, "size": 3,    "group": "a", "date": new Date('2020-03-01') })
    await db.insert({ "name": "a4", "number": 50, "size": 5,   "group": "b", "date": new Date('2020-04-01') })
    await db.insert({ "name": "a5", "number": 40, "size": 1,   "group": "a", "date": new Date('2020-01-01') })
    await db.insert({ "name": "a6", "number": 10, "size": 2,   "group": "c", "date": new Date('2020-01-01') })
    await db.insert({ "name": "a7", "number": 5432, "size": 4, "group": "b", "date": new Date('2020-02-01') })
    await db.insert({ "name": "a8", "number": 13.2, "size": 5, "group": "c", "date": new Date('2020-03-01') })
   
  });

  describe('Group by datatypes', function () {

   
    it('Group by a string', async function () {
      
      var data = await db.find({}).groupBy("group");

      var groups = data.map((rec)=>rec.group);
      
      assert.equal(groups.length,3);
      assert.notEqual(groups.indexOf("a"),-1)
      assert.notEqual(groups.indexOf("b"),-1)
      assert.notEqual(groups.indexOf("c"),-1)
       
    });


    it("Group by a number", async function(){

      var data = await db.find({}).groupBy("size");
      
      var sizes = data.map((rec)=>rec.size);
      
      assert.equal(sizes.length,5);
      assert.notEqual(sizes.indexOf("1"),-1)
      assert.notEqual(sizes.indexOf("2"),-1)
      assert.notEqual(sizes.indexOf("3"),-1)
      assert.notEqual(sizes.indexOf("4"),-1)
      assert.notEqual(sizes.indexOf("5"),-1)
      
    })


    it('Group by a date', async function () {
      
      var data = await db.find({}).groupBy("date");

      var dates = data.map((rec)=>rec.date);

      assert.equal(dates.length,4);

      assert.notEqual(dates.indexOf(new Date('2020-01-01').toString()),-1)
      assert.notEqual(dates.indexOf(new Date('2020-02-01').toString()),-1)
      assert.notEqual(dates.indexOf(new Date('2020-03-01').toString()),-1)
      assert.notEqual(dates.indexOf(new Date('2020-04-01').toString()),-1)
      
       
    });




  });


  describe('Group by with aggregates', function () {


    it('Aggregate "sum"', async function () {
      
      var data = await db.find({}).groupBy("group")
        .aggregates({
          "sumOf": ["sum","number"]
        })

      var stats = {};
      data.map((rec)=> stats[rec.group] = rec);

      assert.equal(stats["a"].sumOf, 50)
      assert.equal(stats["b"].sumOf, 5482)
      assert.equal(stats["c"].sumOf, 23.2)


      var data = await db.find({}).groupBy("size")
        .aggregates({
          "sumOf": ["sum","number"]
        })

      var stats = {};
      data.map((rec)=> stats[rec.size] = rec);

      assert.equal(stats["1"].sumOf, 41)
      assert.equal(stats["2"].sumOf, 15)
      assert.equal(stats["3"].sumOf, 4)
      assert.equal(stats["4"].sumOf, 5432)
      assert.equal(stats["5"].sumOf, 63.2)


      var data = await db.find({}).groupBy("date")
        .aggregates({
          "sumOf": ["sum","number"]
        })

      var stats = {};
      data.map((rec)=> stats[rec.date] = rec);

      assert.equal(stats[new Date('2020-01-01').toString()].sumOf, 51)
      assert.equal(stats[new Date('2020-02-01').toString()].sumOf, 5437)
      assert.equal(stats[new Date('2020-03-01').toString()].sumOf, 17.2)
      assert.equal(stats[new Date('2020-04-01').toString()].sumOf, 50)
             
    });

    it('Aggregate "min"/"max"', async function () {
      
      var data = await db.find({}).groupBy("group")
        .aggregates({
          "min": ["min","number"],
          "max": ["max","number"]
        })

      var stats = {};
      data.map((rec)=> stats[rec.group] = rec);

      
      assert.equal(stats["a"].min, 1)
      assert.equal(stats["a"].max, 40)

      assert.equal(stats["b"].min, 50)
      assert.equal(stats["b"].max, 5432)
      
      assert.equal(stats["c"].min, 10)
      assert.equal(stats["c"].max, 13.2)
          

    });


    it('Aggregate "count"', async function () {
      
      var data = await db.find({}).groupBy("group")
        .aggregates({
          "count": ["count","number"]
        })

      var stats = {};
      data.map((rec)=> stats[rec.group] = rec);

      
      assert.equal(stats["a"].count, 4)     
      assert.equal(stats["b"].count, 2)
      assert.equal(stats["c"].count, 2)
          

    });

    it('Aggregate "avg"/"median"', async function () {
      
      var data = await db.find({}).groupBy("group")
        .aggregates({
          "avg": ["avg","number"],
          "median":["median", "number"]
        })

      var stats = {};
      data.map((rec)=> stats[rec.group] = rec);
         
      assert.equal(stats["a"].avg, 12.5)     
      assert.equal(stats["a"].median, 4.5)

      assert.equal(stats["b"].avg, 2741)     
      assert.equal(stats["b"].median, 2741)

      assert.equal(stats["c"].avg, 11.6)     
      assert.equal(stats["c"].median, 11.6)

    });

  });

  describe('Group by with rollup', function () {


      it('Rollup', async function () {
      
        var data = await db.find({}).groupBy("group").withRollup()
          .aggregates({
            "avg": ["avg","number"],
            "median":["median", "number"],
            "count": ["count","number"],
            "min": ["min", "number"],
            "max": ["max", "number"],
            "sum": ["sum", "number"]          
          })

        var stats = {};
        data.map((rec)=> stats[rec.group] = rec);
              
        assert.equal(stats[null].min,1)
        assert.equal(stats[null].max,5432)
        assert.equal(stats[null].avg,694.4)
        assert.equal(stats[null].median,11.6)
        assert.equal(stats[null].sum,5555.2)
        assert.equal(stats[null].count,8)

      });


  });


});