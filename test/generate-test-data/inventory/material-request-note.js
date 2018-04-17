const productionOrderDataUtil = require('../../data-util/sales/production-order-data-util');
const inventoryDocumentDataUtil = require('../../data-util/inventory/inventory-document-data-util');
const unitDataUtil = require('../../data-util/master/unit-data-util');

it('#01. should success create unit test data', function (done) {
    unitDataUtil.getFPTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success create production order test data', function (done) {
    productionOrderDataUtil.getNewTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should success create inventory test data', function (done) {
    inventoryDocumentDataUtil.getMaterialRequestNoteNewTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});