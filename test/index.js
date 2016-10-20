function test(name, path) {
    describe(name, function () {
        require(path);
    })
}


describe('#dl-module', function (done) {
    this.timeout(2 * 60000); 
    // Auth
    test('@auth/account-manager', './auth/account-manager-test');
    test('@auth/role-manager', './auth/role-manager-test');

    //Master
    test('@master/uom-manager', './master/uom-manager-test');
    test('@master/supplier-manager', './master/supplier-manager-test');
    test('@master/buyer-manager', './master/buyer-manager-test');
    test('@master/product-manager', './master/product-manager-test');
    test('@master/unit-manager', './master/unit-manager-test');
    test('@master/category-manager', './master/category-manager-test');
    test('@master/currency-manager', './master/currency-manager-test');
    test('@master/vat-manager', './master/vat-manager-test');
    
    //Purchasing 
    test('@purchasing/purchase-order-base-manager', './purchasing/purchase-order-manager-test');
    test('@purchasing/purchase-order-external-manager', './purchasing/purchase-order-external-manager-test');
    test('@purchasing/delivery-order-manager', './purchasing/delivery-order-manager-test');
    test('@purchasing/unit-receipt-note', './purchasing/unit-receipt-note-manager-test');
    test('@purchasing/unit-payment-price-correction-note', './purchasing/unit-payment-price-correction-note-manager-test');
    test('@purchasing/unit-payment-order', './purchasing/unit-payment-order-test');
})