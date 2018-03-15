const productionOrderDataUtil = require('../../data-util/sales/production-order-data-util');
const inventoryDocumentDataUtil = require('../../data-util/inventory/inventory-document-data-util');

it('#01. should success create production order test data', function (done) {
    productionOrderDataUtil.getNewTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success create inventory test data', function (done) {
    inventoryDocumentDataUtil.getMaterialRequestNoteNewTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});