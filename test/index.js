function test(name, path) {
    describe(name, function() {
        require(path);
    });
}


describe('#dl-module', function(done) {
    this.timeout(2 * 60000);

    // Auth
    // test('@auth/account-manager', './auth/account-manager-test');
    // test('@auth/role-manager', './auth/role-manager-test');

    // // Master
    test('@MASTER/BUDGET', './master/budget');
    test('@MASTER/BUYER', './master/buyer');
    test('@MASTER/CATEGORY', './master/category');
    test('@MASTER/CURRENCY', './master/currency');
    test('@MASTER/DIVISION', './master/division');
    test('@MASTER/LOT-MACHINE', './master/lot-machine');
    test('@MASTER/MACHINE', './master/machine');
    test('@MASTER/PRODUCT', './master/product');
    test('@MASTER/SUPPLIER', './master/supplier');
    test('@MASTER/THREAD-SPECIFICATION', './master/thread-specification');
    test('@MASTER/UOM', './master/uom');
    test('@MASTER/UNIT', './master/unit');
    test('@MASTER/USTER', './master/uster');
    test('@MASTER/VAT', './master/vat');
    test('@MASTER/YARN-EQUIVALENT-CONVERSION', './master/yarn-equivalent-coversion');
    test('@MASTER/LAMP-STANDARD', './master/lamp-standard');

    // //Purchasing 
     test('@PURCHASING/PURCHASE REQUEST', './purchasing/purchase-request');
    // test('@purchasing/purchase-request-manager', './purchasing/purchase-request-manager-test');
    // test('@purchasing/purchase-order-manager', './purchasing/purchase-order-manager-test');
    // test('@purchasing/purchase-order-external-manager', './purchasing/purchase-order-external-manager-test');
    // test('@purchasing/delivery-order-manager', './purchasing/delivery-order-manager-test');
    // test('@purchasing/unit-receipt-note', './purchasing/unit-receipt-note-manager-test');
    // test('@purchasing/unit-payment-price-correction-note', './purchasing/unit-payment-price-correction-note-manager-test');
    // test('@purchasing/unit-payment-order', './purchasing/unit-payment-order-test');

    // test('@purchasing/purchase-request/create', './purchasing/purchase-request/create');
    // test('@purchasing/purchase-request/post', './purchasing/purchase-request/post');
    // test('@purchasing/purchase-order/create', './purchasing/purchase-order/create');
    // test('@purchasing/purchase-order/update', './purchasing/purchase-order/update');
    // test('@purchasing/purchase-order-external/create', './purchasing/purchase-order-external/create');
    // test('@purchasing/delivery-order/create', './purchasing/delivery-order/create');
    // test('@purchasing/unit-receipt-note/create', './purchasing/unit-receipt-note/create');
    // test('@purchasing/unit-payment-order/create', './purchasing/unit-payment-order/create');
    // test('@purchasing/unit-payment-price-correction-note/create', './purchasing/unit-payment-price-correction-note/create');
    // test('@purchasing/unit-payment-quantity-correction-note/create', './purchasing/unit-payment-quantity-correction-note/create');

    // //Production

    // test('@production/winding-quality-sampling-manager', './production/spinning/winding/winding-quality-sampling-manager-test');
    // test('@production/winding-production-output-manager', './production/spinning/winding/winding-production-output-manager-test');


})
