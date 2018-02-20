'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/sewing-blocking-plan-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/sewing-blocking-plan-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.sewingBlockingPlan;

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

it("#01. should error when create new data with not exsist booking order", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.bookingOrderId = "bookingOrderId";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with not exsist booking order");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("bookingOrderNo");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should error when create new data with no detail", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details = [];
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no detail");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("detail");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should error when create new data with comodity not exist", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var details = [];
            for(var detail of data.details){
                detail.masterPlanComodityId = "masterPlanComodityId";
                detail.masterPlanComodity._id = "masterPlanComodityId";
                details.push(detail);
            }
            data.details = details;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with comodity not exist");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    for(var error of e.errors.details){
                        error.should.instanceof(Object);
                    	error.should.have.property("masterPlanComodity");
                    }
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should error when create new data with confirmed and no comodity data", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            delete data.details[0].masterPlanComodityId;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with confirmed and no comodity data");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    e.errors.details[0].should.instanceof(Object);
                    e.errors.details[0].should.have.property("masterPlanComodity");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should error when create new data with 0 value on  shSewing and quantity", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            //data.details[0].shCutting = 0;
            data.details[0].shSewing = 0;
            //data.details[0].shFinishing = 0;
            data.details[0].quantity = 0;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with 0 value on  shSewing and quantity");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    // e.errors.details[0].should.have.property("shCutting");
                    e.errors.details[0].should.have.property("shSewing");
                    // e.errors.details[0].should.have.property("shFinishing");
                    e.errors.details[0].should.have.property("quantity");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

// it("#06. should error when create new data with quantity master plan more than quantity booking", function (done) {
//     dataUtil.getNewData()
//         .then((data) => {
//             data.details[0].quantity = 1000;
//             manager.create(data)
//                 .then((id) => {
//                     done("should error when create new data with quantity master plan more than quantity booking");
//                 })
//                 .catch((e) => {
//                     e.name.should.equal("ValidationError");
//                     e.should.have.property("errors");
//                     e.errors.should.instanceof(Object);
//                     e.errors.should.have.property("detail");
//                     done();
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it("#07. should error when create new data with no data unit (1)", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].unitId = "";
            data.details[1].unitId = "unitId";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data unit (1)");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    e.errors.details[0].should.instanceof(Object);
                    e.errors.details[1].should.instanceof(Object);
                    e.errors.details[0].should.have.property("unit");
                    e.errors.details[1].should.have.property("unit");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#08. should error when create new data with no data unit (2)", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].unitId = "unitId";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data unit (2)");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    e.errors.details[0].should.instanceof(Object);
                    e.errors.details[0].should.have.property("unit");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#09. should error when create new data with no data year (1)", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].weeklyPlanYear = 0;
            data.details[1].weeklyPlanYear = 1000;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data year (1)");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    e.errors.details[0].should.instanceof(Object);
                    e.errors.details[1].should.instanceof(Object);
                    e.errors.details[0].should.have.property("weeklyPlanYear");
                    e.errors.details[1].should.have.property("weeklyPlanYear");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#10. should error when create new data with no data year (2)", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].weeklyPlanId = "weeklyPlanId";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data year (2)");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    e.errors.details[0].should.instanceof(Object);
                    e.errors.details[0].should.have.property("weeklyPlanYear");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#11. should error when create new data with no data week", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            delete data.details[0].week; 
            data.details[1].week.month = 12;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no data week");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    e.errors.details[0].should.instanceof(Object);
                    e.errors.details[1].should.instanceof(Object);
                    e.errors.details[0].should.have.property("week");
                    e.errors.details[1].should.have.property("week");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#12. should error when create new data with no detail delivery date", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            delete data.details[0].deliveryDate; 
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no detail delivery date");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#13. should error when create new data with detail delivery date < data booking date", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var targetDate=new Date(data.bookingDate);
            data.details[0].deliveryDate=new Date(targetDate.setDate(targetDate.getDate() - 5));
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with detail delivery date < data booking date");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#14. should error when create new data with detail delivery date > data delivery date", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var targetDate=new Date(data.deliveryDate);
            data.details[0].deliveryDate=new Date(targetDate.setDate(targetDate.getDate() + 5));
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with detail delivery date > data delivery date");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

var newData;
var createdId;
it("#15. should success when create new data", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            newData = data;
            manager.create(data)
                .then((id) => {
                    createdId = id;
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

it("#16. should success when search data with filter", function (done) {
    manager.read({
        keyword: newData.bookingOrderNo
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

// it("#17. should success when get preview", function (done) {
//     manager.getPreview(newData.details[0].week.month, newData.details[0].weeklyPlanYear)
//         .then((documents) => {
//             documents.should.be.instanceof(Array);
//             documents.length.should.not.equal(0);
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

it("#18. should error when create new data with same booking order", function (done) {
    manager.create(newData)
        .then((id) => {
            done("should error when create new data with same booking order");
        })
        .catch((e) => {
            e.name.should.equal("ValidationError");
            e.should.have.property("errors");
            e.errors.should.instanceof(Object);
            e.errors.should.have.property("bookingOrderNo");
            done();
        });
});

it("#19. should success when destroy data with id", function (done) {
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