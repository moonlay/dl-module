'use strict';

var ObjectId = require("mongodb").ObjectId;
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/garment-master-plan/master-plan-manager");
var manager = null;
var dataUtil =require("../../data-util/garment-master-plan/master-plan-data-util");
var validate = require("dl-models").validator.garmentMasterPlan.masterPlan;

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

it("#01. should error when create new data with not exsisst booking order", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.bookingOrderId = "bookingOrderId";
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with not exsisst booking order");
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

it("#02. should error when create new data with no item in detail", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var details = [];
            for(var detail of data.details){
                detail.detailItems = [];
                details.push(detail);
            }
            data.details = details;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with no item in detail");
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

it("#03. should error when create new data with different detail beetwen booking order and master plan", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            var details = [];
            for(var detail of data.details){
                detail.code = "code";
                details.push(detail);
            }
            data.details = details;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with different detail beetwen booking order and master plan");
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

it("#04. should error when create new data with 0 value on shCutting, shSewing, shFinishing and quantity", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].detailItems[0].shCutting = 0;
            data.details[0].detailItems[0].shSewing = 0;
            data.details[0].detailItems[0].shFinishing = 0;
            data.details[0].detailItems[0].quantity = 0;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with 0 value on shCutting, shSewing, shFinishing and quantity");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    e.errors.details[0].should.instanceof(Object);
                    e.errors.details[0].should.have.property("detailItems");
                    e.errors.details[0].detailItems.should.instanceOf(Array);
                    e.errors.details[0].detailItems[0].should.instanceof(Object);
                    e.errors.details[0].detailItems[0].should.have.property("shCutting");
                    e.errors.details[0].detailItems[0].should.have.property("shSewing");
                    e.errors.details[0].detailItems[0].should.have.property("shFinishing");
                    e.errors.details[0].detailItems[0].should.have.property("quantity");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should error when create new data with quantity master plan more than quantity booking", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].detailItems[0].quantity = 1000;
            manager.create(data)
                .then((id) => {
                    done("should error when create new data with quantity master plan more than quantity booking");
                })
                .catch((e) => {
                    e.name.should.equal("ValidationError");
                    e.should.have.property("errors");
                    e.errors.should.instanceof(Object);
                    e.errors.should.have.property("details");
                    e.errors.details.should.instanceOf(Array);
                    e.errors.details[0].should.instanceof(Object);
                    e.errors.details[0].should.have.property("quantity");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should error when create new data with no data unit (1)", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].detailItems[0].unitId = "";
            data.details[0].detailItems[1].unitId = "";
            data.details[1].detailItems[0].unitId = "unitId";
            data.details[1].detailItems[1].unitId = "unitId";
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
                    e.errors.details[0].should.have.property("detailItems");
                    e.errors.details[1].should.have.property("detailItems");
                    e.errors.details[0].detailItems.should.instanceOf(Array);
                    e.errors.details[1].detailItems.should.instanceOf(Array);
                    e.errors.details[0].detailItems[0].should.instanceof(Object);
                    e.errors.details[0].detailItems[1].should.instanceof(Object);
                    e.errors.details[1].detailItems[0].should.instanceof(Object);
                    e.errors.details[1].detailItems[1].should.instanceof(Object);
                    e.errors.details[0].detailItems[0].should.have.property("unit");
                    e.errors.details[0].detailItems[1].should.have.property("unit");
                    e.errors.details[1].detailItems[0].should.have.property("unit");
                    e.errors.details[1].detailItems[1].should.have.property("unit");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#07. should error when create new data with no data unit (2)", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].detailItems[0].unitId = "unitId";
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
                    e.errors.details[0].should.have.property("detailItems");
                    e.errors.details[0].detailItems.should.instanceOf(Array);
                    e.errors.details[0].detailItems[0].should.instanceof(Object);
                    e.errors.details[0].detailItems[0].should.have.property("unit");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#08. should error when create new data with no data year (1)", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].detailItems[0].weeklyPlanYear = 0;
            data.details[0].detailItems[1].weeklyPlanYear = 0;
            data.details[1].detailItems[0].weeklyPlanYear = 1000;
            data.details[1].detailItems[1].weeklyPlanYear = 1000;
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
                    e.errors.details[0].should.have.property("detailItems");
                    e.errors.details[1].should.have.property("detailItems");
                    e.errors.details[0].detailItems.should.instanceOf(Array);
                    e.errors.details[1].detailItems.should.instanceOf(Array);
                    e.errors.details[0].detailItems[0].should.instanceof(Object);
                    e.errors.details[0].detailItems[1].should.instanceof(Object);
                    e.errors.details[1].detailItems[0].should.instanceof(Object);
                    e.errors.details[1].detailItems[1].should.instanceof(Object);
                    e.errors.details[0].detailItems[0].should.have.property("weeklyPlanYear");
                    e.errors.details[0].detailItems[1].should.have.property("weeklyPlanYear");
                    e.errors.details[1].detailItems[0].should.have.property("weeklyPlanYear");
                    e.errors.details[1].detailItems[1].should.have.property("weeklyPlanYear");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#09. should error when create new data with no data year (2)", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.details[0].detailItems[0].weeklyPlanId = "weeklyPlanId";
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
                    e.errors.details[0].should.have.property("detailItems");
                    e.errors.details[0].detailItems.should.instanceOf(Array);
                    e.errors.details[0].detailItems[0].should.instanceof(Object);
                    e.errors.details[0].detailItems[0].should.have.property("weeklyPlanYear");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#10. should error when create new data with no data week", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            delete data.details[0].detailItems[0].week; 
            data.details[0].detailItems[1].week.month = 12;
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
                    e.errors.details[0].should.have.property("detailItems");
                    e.errors.details[0].detailItems.should.instanceOf(Array);
                    e.errors.details[0].detailItems[0].should.instanceof(Object);
                    e.errors.details[0].detailItems[1].should.instanceof(Object);
                    e.errors.details[0].detailItems[0].should.have.property("week");
                    e.errors.details[0].detailItems[1].should.have.property("week");
                    done();
                });
        })
        .catch((e) => {
            done(e);
        });
});

var newData;
var createdId;
it("#11. should success when create new data", function (done) {
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

it("#12. should error when create new data with same booking order", function (done) {
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

it("#13. should success when destroy data with id", function (done) {
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