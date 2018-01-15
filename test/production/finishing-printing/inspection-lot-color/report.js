require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/inspection-lot-color-data-util");
var helper = require("../../../helper");
var moment = require('moment');
var validate = require("dl-models").validator;

var InspectionLotColorManager = require("../../../../src/managers/production/finishing-printing/inspection-lot-color-manager");
var inspectionLotColorManager;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            inspectionLotColorManager = new InspectionLotColorManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var inspection;
it("#01. should success when create new data", function(done) {
    dataUtil.getNewData()
        .then(data => {
            var dateTemp = new Date();
            data.date = moment(dateTemp).format('YYYY-MM-DD');
            inspectionLotColorManager.create(data)
                .then(id => {
                    inspectionLotColorManager.getSingleById(id)
                        .then(lotColor => {
                            validate.production.finishingPrinting.qualityControl.inspectionLotColor(lotColor);
                            inspection = lotColor;
                            done();
                        })
                        .catch((e) => {
                            done(e);
                        });
                })
                .catch((e) => {
                    done(e);
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when get read data with keyword", function(done) {
    inspectionLotColorManager.read({keyword : inspection.cartNo})
        .then((item) => {
            var lotColor = item.data;
            lotColor.should.instanceof(Array);
            lotColor.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should success when get report without parameter", function(done) {
    inspectionLotColorManager.getReport({})
        .then((item) => {
            var lotColor = item.data;
            lotColor.should.instanceof(Array);
            lotColor.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#04. should success when get report with date parameter", function(done) {
    var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
    var edate = moment(dateTomorrow).format('YYYY-MM-DD');
    var dateBefore = new Date().setDate(new Date().getDate() - 1);
    var sdate = moment(dateBefore).format('YYYY-MM-DD');
    inspectionLotColorManager.getReport({dateFrom : sdate, dateTo : edate})
        .then((item) => {
            var lotColor = item.data;
            lotColor.should.instanceof(Array);
            lotColor.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success when get report with kanban parameter", function(done) {
    inspectionLotColorManager.getReport({kanbanId : inspection.kanbanId})
        .then((item) => {
            var lotColor = item.data;
            lotColor.should.instanceof(Array);
            lotColor.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should success when get report with production order parameter", function(done) {
    inspectionLotColorManager.getReport({productionOrder : inspection.productionOrderNo})
        .then((item) => {
            var lotColor = item.data;
            lotColor.should.instanceof(Array);
            lotColor.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#07. should success when get report xls", function(done) {
    inspectionLotColorManager.getReport({})
        .then((item) => {
            var lotColor = item.data;
            lotColor.should.instanceof(Array);
            lotColor.length.should.not.equal(0);
            inspectionLotColorManager.getXls(item, {})
                .then(xls =>{
                    xls.should.have.property("data");
                    xls.should.have.property("options");
                    xls.should.have.property("name");
                    xls.data.should.instanceof(Array);
                    xls.data.length.should.not.equal(0);
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