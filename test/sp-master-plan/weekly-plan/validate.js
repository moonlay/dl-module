'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/weekly-plan-manager");
var manager = null;
var dataUtil = require("../../data-util/garment-master-plan/weekly-plan-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.weeklyPlan;
var moment = require('moment');

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it("#01. should error when create new data with empty data", function (done) {
    manager.create({})
        .then((id) => {
            done("should error when create new data with empty data");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            done();
        });
});

it("#02. should error when create new data with month out of range", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.items[0].month = 2;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with month out of range");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('items');
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should error when create new data with invalid month", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.items[0].month = 12;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with invalid month");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('items');
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should error when create new data with invalid year", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.year = "year";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with invalid year");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#04-1. should error when create new data with out of range year", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.year = (new Date()).getFullYear() + 11;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with out of range year");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

// it("#05. should error when create new data with invalid efficiency, operator and workingHours", function (done) {
//     dataUtil.getNewData()
//         .then((data) => {
//             data.items[0].efficiency = 0;
//             data.items[0].operator = 0;
//             data.items[0].workingHours = 0;
//             manager.create(data)
//                 .then((id) => {
//                     done("should error when create new data with invalid efficiency, operator and workingHours");
//                 })
//                 .catch((e) => {
//                     e.name.should.equal("ValidationError");
//                     e.should.have.property("errors");
//                     e.errors.should.instanceof(Object);
//                     e.errors.should.have.property('items');
//                     for(var item of e.errors.items){
//                         if (Object.getOwnPropertyNames(item).length > 0) {
//                             item.should.have.property('efficiency');
//                             item.should.have.property('operator');
//                             item.should.have.property('workingHours');
//                         }
//                     }
//                     done();
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it("#06. should error when create new data with no data unit", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.unitId = "unitId";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data unit");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property('unit');
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

var newData;
it("#07. should success when create new data for search and duplicate data", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            newData = data;
            manager.create(data)
                .then((id) => {
                    done();
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#08. should error when create new duplicate data", function (done) {
    manager.create(newData)
        .then((id) => {
            done("should error when create new duplicate data");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            done();
        });
});

it("#09. should success when search data with filter", function (done) {
    manager.read({
        keyword: newData.unit.name
    })
        .then((documents) => {
            //process documents
            documents.should.have.property("data");
            documents.data.should.be.instanceof(Array);
            documents.data.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#10. should success when remove all data`, function(done) {
    manager.collection.remove({})
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});