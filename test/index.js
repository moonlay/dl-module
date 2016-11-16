function test(name, path) {
    describe(name, function() {
        require(path);
    })
}


describe('#dl-module', function(done) {
    this.timeout(2 * 60000);
    // Auth
    // test('@auth/account-manager', './auth/account-manager-test');
    // test('@auth/role-manager', './auth/role-manager-test');
    //Master
    // test('@master/uom-manager', './master/uom-manager-test');
    // test('@master/supplier-manager', './master/supplier-manager-test');
    // test('@master/buyer-manager', './master/buyer-manager-test');
    // test('@master/product-manager', './master/product-manager-test');
    // test('@master/division-manager', './master/division-manager-test');
    // test('@master/unit-manager', './master/unit-manager-test');
    // test('@master/category-manager', './master/category-manager-test');
    // test('@master/currency-manager', './master/currency-manager-test');
    // test('@master/vat-manager', './master/vat-manager-test');
    // test('@master/budget-manager', './master/budget-manager-test');
    // test('@master/machine-manager', './master/machine-manager-test');
    test('@master/uster-classification-manager', './master/uster-classification-manager-test');
    // //Purchasing 
    // test('@purchasing/purchase-order-manager', './purchasing/purchase-order-manager-test');
    // test('@purchasing/purchase-order-external-manager', './purchasing/purchase-order-external-manager-test');
    // test('@purchasing/delivery-order-manager', './purchasing/delivery-order-manager-test');
    // test('@purchasing/unit-receipt-note', './purchasing/unit-receipt-note-manager-test');
    // test('@purchasing/purchase-request-manager', './purchasing/purchase-request-manager-test');
    // test('@purchasing/unit-payment-price-correction-note', './purchasing/unit-payment-price-correction-note-manager-test');
    // test('@purchasing/unit-payment-order', './purchasing/unit-payment-order-test');

    // test('@purchasing/purchase-request/create', './purchasing/purchase-request/create');
    // test('@purchasing/purchase-request/post', './purchasing/purchase-request/post');
    // test('@purchasing/purchase-order/create', './purchasing/purchase-order/create');
    // test('@purchasing/purchase-order/update', './purchasing/purchase-order/update');
    
     test('@production/winding-quality-sampling-manager', './production/spinning/winding/winding-quality-sampling-manager-test');



})
