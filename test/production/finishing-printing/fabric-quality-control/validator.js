require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/fabric-quality-control-data-util");
var helper = require("../../../helper");
var moment = require('moment');

var FabricQualityControlManager = require("../../../../src/managers/production/finishing-printing/fabric-quality-control-manager");
var fabricQualityControlManager;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            fabricQualityControlManager = new FabricQualityControlManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create new data with invalid kanban", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.kanbanId = "test";
            fabricQualityControlManager.create(data)
                .then((kanban) => {
                    done("should error when create new data with no document kanban on collection database");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('kanbanId');
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

it("#02. should error when create 4 point system data with no point limit", function (done) {
    dataUtil.getNewData()
        .then((data) => {
            data.pointSystem = 4;
            fabricQualityControlManager.create(data)
                .then((data) => {
                    done("should error when create new data with no document kanban on collection database");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('pointLimit');
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

var createdId;
it("#03. should success when create new data", function (done) {
    dataUtil.getNewData()

        .then((data) => fabricQualityControlManager.create(data))
        .then((id) => {
            id.should.be.Object();
            createdId = id;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it(`#04. should success when get created data with id`, function (done) {
    fabricQualityControlManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#05. should success when create pdf', function (done) {
    fabricQualityControlManager.pdf(createdData)
        .then((pdfData) => {
            done();
        }).catch(e => {
            done(e);
        });
});

it("#06. should success when destroy all unit test data", function (done) {
    fabricQualityControlManager.destroy(createdId)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});