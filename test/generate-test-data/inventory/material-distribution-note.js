const supplierDataUtil = require('../../data-util/master/supplier-data-util');

it('#01. should success create supplier test data', function (done) {
    supplierDataUtil.getTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});