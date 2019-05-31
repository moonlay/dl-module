'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/sp-master-plan/standard-capacity-manager");
var manager = null;
var dataUtil = require("../../data-util/sp-master-plan/standard-capacity-data-util");
var validate = require("dl-models").validator.spMasterPlan.standardCapacity;
var moment = require('moment');


// var StyleManager = require("../../../src/managers/sp-master-plan/style-manager");
// var styleManager = null;
// var StyledataUtil = require("../../data-util/sp-master-plan/style-data-util");

var BuyerManager = require("../../../src/managers/master/buyer-manager");
var buyerManager = null;
var BuyerdataUtil = require("../../data-util/master/buyer-data-util");

var ComodityManager = require("../../../src/managers/sp-master-plan/master-plan-comodity-manager");
var comodityManager = null;
var ComoditydataUtil = require("../../data-util/sp-master-plan//master-plan-comodity-data-util");

var validateStyle = require("dl-models").validator.spMasterPlan.style;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'unit-test'
            });

            // styleManager = new StyleManager(db, {
            //     username: 'unit-test'
            // });

            buyerManager = new BuyerManager(db, {
                username: 'unit-test'
            });

            comodityManager = new ComodityManager(db, {
                username: 'unit-test'
            });

            done();
        })
        .catch(e => {
            done(e);
        });
});

// var createdDataStyle;
// var createdIdStyle;

// it(`#01. should success when get created new data style`, function (done) {
//     StyledataUtil.getNewData()
//     .then((data) => createdDataStyle=data)
//             .then((data) => styleManager.create(data))
//             .then((id) => {
//                 id.should.be.Object();
//                 createdIdStyle = id;
//                 done();
//             })
//             .catch((e) => {
//                 done(e);
//             });
// });

// var createdDataBuyer;
// var createdIdBuyer;

// it(`#01. should success when get created new data buyer`, function (done) {
//     BuyerdataUtil.getNewData()
//     .then((data) => createdDataBuyer=data)
//             .then((data) => buyerManager.create(data))
//             .then((id) => {
//                 id.should.be.Object();
//                 createdIdBuyer = id;
//                 done();
//             })
//             .catch((e) => {
//                 done(e);
//             });
// });

// var createdDataComodity;
// var createdIdComodity;

// it(`#02. should success when get created new data comodity`, function (done) {
//     ComoditydataUtil.getNewData()
//     .then((data) => createdDataComodity=data)
//             .then((data) => comodityManager.create(data))
//             .then((id) => {
//                 id.should.be.Object();
//                 createdIdComodity = id;
//                 done();
//             })
//             .catch((e) => {
//                 done(e);
//             });
// });

var createdData;
var createdId;
// it(`#02. should success when create new data`, function (done) {
//     dataUtil.getNewData()
//     .then((data) => {
//             data.styleId = createdIdStyle;
//             data.style=createdDataStyle;
//             createdData=data;
//             manager.create(data)
//             .then((id) => {
//                 id.should.be.Object();
//                 createdId = id;
//                 done();
//             })
//             .catch((e) => {
//                 done(e);
//             });
// });
// });

it(`#01. should success when create new data`, function (done) {
    dataUtil.getNewData()
    .then((data) => {
            // data.buyerId = createdIdBuyer;
            // data.buyer=createdDataBuyer;
            // data.comodityId = createdIdComodity;
            // data.comodity=createdDataComodity;
            createdData=data;
            manager.create(data)
            .then((id) => {
                id.should.be.Object();
                createdId = id;
                done();
            })
            .catch((e) => {
                done(e);
            });
});
});

it(`#02. should success when get sc by filter from created data`, function (done) {
    var buyerCode=createdData.buyerCode;
    var comodityCode=createdData.masterplanComodityCode
    manager.getStandardCapacityByBuyerComodity(buyerCode, comodityCode).then(
        sc => {
            sc.should.instanceof(Array);
            done();
        }).catch(e => {
            done(e);
    });
});

it(`#03. should success when destroy data with id`, function(done) {
    manager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#04. should null when get destroyed data`, function(done) {
    manager.getSingleByIdOrDefault(createdId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

// it(`#06. should success when destroy style data with id`, function(done) {
//     styleManager.destroy(createdIdStyle)
//         .then((result) => {
//             result.should.be.Boolean();
//             result.should.equal(true);
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it(`#05. should success when destroy buyer data with id`, function(done) {
    buyerManager.destroy(createdData.buyerId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#06. should success when destroy comodity data with id`, function(done) {
    comodityManager.destroy(createdData.masterplanComodityId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

// it(`#07. should null when get destroyed style data`, function(done) {
//     styleManager.getSingleByIdOrDefault(createdIdStyle)
//         .then((data) => {
//             should.equal(data, null);
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it(`#07. should null when get destroyed buyer data`, function(done) {
    buyerManager.getSingleByIdOrDefault(createdData.buyerId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#08. should null when get destroyed comodity data`, function(done) {
    comodityManager.getSingleByIdOrDefault(createdData.masterplanComodityId)
        .then((data) => {
            should.equal(data, null);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it(`#09. should success when remove all data`, function(done) {
    manager.collection.remove({})
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});