const storageDataUtil = require('../../data-util/master/storage-data-util');

it('#01. should success create storage test data', function (done) {
    storageDataUtil.getGreigePrintingInventoryTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});