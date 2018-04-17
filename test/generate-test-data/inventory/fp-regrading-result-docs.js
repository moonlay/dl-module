const machineDataUtil = require('../../data-util/master/machine-data-util');

it('#01. should success create machine test data', function (done) {
    machineDataUtil.getTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});