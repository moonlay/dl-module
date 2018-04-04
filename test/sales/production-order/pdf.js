require("should");
var DataUtil = require("../../data-util/sales/production-order-data-util");
var helper = require("../../helper");
var validate = require("dl-models").validator.sales.productionOrder;
var codeGenerator = require('../../../src/utils/code-generator');
var ProductionOrderManager = require("../../../src/managers/sales/production-order-manager");
var instanceManager;



before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            instanceManager = new ProductionOrderManager(db, {
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

it("#05. should success update isRequested create context", function (done) {
    var data = {
        ids: [createdData._id],
        context: "CREATE"
    }
    instanceManager.updateIsRequested(data)
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e)
        })
});

it("#06. should success update isRequested delete context", function (done) {
    var data = {
        ids: [createdData._id],
        context: "DELETE"
    }
    instanceManager.updateIsRequested(data)
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e)
        })
});

it("#07. should success update isCompleted with context", function (done) {
    var data = {
        contextAndIds: [{
            id: createdData._id,
            context: "COMPLETE"
        },
        {
            id: createdData._id,
            context: "INCOMPLETE"
        }]
    }
    instanceManager.updateIsCompleted(data)
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e)
        })
});

it("#08. should success update distributed quantity with context", function (done) {
    var params = [{
        id: createdData._id,
        distributedQuantity: 10,
        context: "CREATE"
    },
    {
        id: createdData._id,
        distributedQuantity: 10,
        context: "DELETE"
    }]

    instanceManager.updateDistributedQuantity(params)
        .then((result) => {
            done();
        })
        .catch((e) => {
            done(e)
        })
});

it("#09. should success when destroy all unit test data", function (done) {
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
