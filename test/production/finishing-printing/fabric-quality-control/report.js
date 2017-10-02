require("should");
var FabricQualityControl = require('../../../data-util/production/finishing-printing/fabric-quality-control-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.qualityControl.defect.fabricQualityControl;
var moment = require('moment');

var FabricQualityControlManager = require("../../../../src/managers/production/finishing-printing/fabric-quality-control-manager");
var fabricQualityControlManager = null;

//delete unitest data
// var DLModels = require('dl-models');
// var map = DLModels.map;
// var MachineType = DLModels.master.MachineType;


before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            fabricQualityControlManager = new FabricQualityControlManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var createdId;
it("#01. should success when create new data", function (done) {
    FabricQualityControl.getNewData()
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
it(`#02. should success when get created data with id`, function (done) {
    fabricQualityControlManager.getSingleById(createdId)
        .then((data) => {
            data.should.instanceof(Object);
            validate(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});


var resultForExcelTest = {};
it('#03. should success when create report', function (done) {
    var info = {};
    info.kanbanCode = createdData.kanbanCode;
    info.productionOrderNo = createdData.productionOrderNo;
    info.productionOrderType = createdData.productionOrderType;
    info.shiftIm = createdData.shiftIm;
    info.dateFrom = moment(createdData.dateIm).format("YYYY-MM-DD");
    info.dateTo = moment(createdData.dateIm).format("YYYY-MM-DD");
    info.select = ["code", "kanbanCode", "cartNo", "productionOrderType", "productionOrderNo", "dateIm", "shiftIm", "operatorIm", "machineNoIm", "construction", "buyer", "color", "orderQuantity", "packingInstruction", "fabricGradeTests.pcsNo", "fabricGradeTests.initLength", "fabricGradeTests.width", "fabricGradeTests.finalScore", "fabricGradeTests.grade", "fabricGradeTests.avalLength", "fabricGradeTests.sampleLength"];

    fabricQualityControlManager.getReport(info)
        .then(result => {
            resultForExcelTest = result;
            var fabricQualityControl = result.data;
            fabricQualityControl.should.instanceof(Array);
            fabricQualityControl.length.should.not.equal(0);
            done();
        }).catch(e => {
            done(e);
        });
});


it('#04. should success when get data for Excel Report', function (done) {
    var query = {};

    fabricQualityControlManager.getXls(resultForExcelTest, query)
        .then(xlsData => {
            xlsData.should.have.property('data');
            xlsData.should.have.property('options');
            xlsData.should.have.property('name');
            done();
        }).catch(e => {
            done(e);
        });
});


it("#05. should success when destroy all unit test data", function (done) {
    fabricQualityControlManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});