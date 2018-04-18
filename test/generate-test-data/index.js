function test(name, path) {
    describe(name, function () {
        require(path);
    });
}

describe('#dl-module generate-test-data', function (done) {
    this.timeout(2 * 60000);

    before("sleep 5 seconds", function (done) {
        setTimeout(done, 5000);
    });
    
    test('@AUTH/ACCOUNT', './auth/account');
    test('@INVENTORY/MATERIAL-REQUEST-NOTE', './inventory/material-request-note');
    test('@INVENTORY/MATERIAL-DISTRIBUTION-NOTE', './inventory/material-distribution-note');
    test('@INVENTORY/fp-regrading-result-docs', './inventory/fp-regrading-result-docs');
    test('@INVENTORY/STOCK-TRANSFER-NOTE', './inventory/stock-transfer-note');    
});