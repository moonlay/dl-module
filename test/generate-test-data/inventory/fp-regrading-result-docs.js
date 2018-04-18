const machineDataUtil = require('../../data-util/master/machine-data-util');
const unitReceiptNoteDataUtil= require('../../data-util/purchasing/unit-receipt-note-data-util');
const supplierDataUtil = require('../../data-util/master/supplier-data-util');

it('#01. should success create machine test data', function (done) {
    machineDataUtil.getTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#02. should success create unit receipt note test data', function (done) {
    unitReceiptNoteDataUtil.getNewTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should success create supplier test data', function (done) {
    supplierDataUtil.getTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});



