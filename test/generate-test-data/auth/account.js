const accountDataUtil = require('../../data-util/auth/account-data-util');

it('#01. should success create account test data', function (done) {
    accountDataUtil.getTestData()
        .then((result) => {
            done();
        })
        .catch(e => {
            done(e);
        });
});