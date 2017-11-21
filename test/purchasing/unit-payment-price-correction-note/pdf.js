require("should");
var DataUtil = require("../../data-util/purchasing/unit-payment-price-correction-note-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.purchasing.unitPaymentCorrectionNote;
var codeGenerator = require('../../../src/utils/code-generator');
var Manager = require("../../../src/managers/purchasing/unit-payment-price-correction-note-manager");
var instanceManager;



before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            instanceManager = new Manager(db, {
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
    DataUtil.getNewData()

        .then((data) => instanceManager.create(data))
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
    instanceManager.getSingleById(createdId)
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


it('#04. should success when create pdf', function (done) {
    var query = {};

    instanceManager.pdf(createdData._id, 7)
        .then((pdfData) => {
            done();
        }).catch((e) => {
            done(e);
        });
});


it("#05. should success when destroy all unit test data", function (done) {
    instanceManager.destroy(createdData._id)
        .then((result) => {
            result.should.be.Boolean();
            result.should.equal(true);
            done();
        })
        .catch((e) => {
            done(e);
        });
});
