require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/inspection-lot-color-data-util");
var helper = require("../../../helper");
var moment = require('moment');

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

it("#01. should error when create new data with no document fabric quality control on collection database", function(done) {
    dataUtil.getNewData()
        .then(data => {
            data.fabricQualityControlId = "id";
            inspectionLotColorManager.create(data)
                .then(lotColor => {
                    done("should error when create new data with no document kanban on collection database");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('fabricQualityControlId');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should error when create new data with date greater than today", function(done) {
    dataUtil.getNewData()
        .then(data => {
            var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
            data.date = moment(dateTomorrow).format('YYYY-MM-DD');
            inspectionLotColorManager.create(data)
                .then(lotColor => {
                    done("should error when create new data with date greater than today");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('date');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#03. should error when create new data with items without Pcs No, Lot and status", function(done) {
    dataUtil.getNewData()
        .then(data => {
            data.items = [
                pcsNo = '',
                lot = '',
                status = ''
            ]
            inspectionLotColorManager.create(data)
                .then(lotColor => {
                    done("should error when create new data with date greater than today");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
                        for(var a of e.errors.items){
                            a.should.have.property('pcsNo');
                            a.should.have.property('lot');
                            a.should.have.property('status');
                        }
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch((e) => {
            done(e);
        });
});