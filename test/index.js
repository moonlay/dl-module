function test(name, path) {
    describe(name, function () {
        require(path);
    });
}


describe('#dl-module', function (done) {
    this.timeout(2 * 60000);

    // Auth
    // test('@auth/account-manager', './auth/account-manager-test');
    // test('@AUTH/ACCOUNT', './auth/account');
    // test('@AUTH/ROLE', './auth/role');
    // test('@AUTH/API-ENDPOINT', './auth/api-endpoint');

    // test('@ETL/DIM-CATEGORY', './etl/dim-category');
    // test('@ETL/DIM-DIVISION', './etl/dim-division');
    // test('@ETL/DIM-SUPPLIER', './etl/dim-supplier');
    // test('@ETL/DIM-UNIT', './etl/dim-unit');
    // test('@ETL/FACT-PURCHASE-DURATION', './etl/fact-purchase-duration');
    // test('@ETL/FACT-TOTAL-HUTANG', './etl/fact-total-hutang');
    // test('@ETL/FACT-TOTAL-NILAI-PEMBELIAN', './etl/fact-total-nilai-pembelian');
    // test('@ETL/FACT-TOP-TEN-SUPPLIER', './etl/fact-top-ten-supplier');
    // test('@ETL/FACT-PURCHASE-ORDER-COMPARISON', './etl/fact-purchase-order-comparison');
    // test('@ETL/FACT-TIMELINESS-SUPPLIER', './etl/fact-timeliness-supplier');

    test('@ETL/FACT-PURCHASING', './etl/fact-purchasing');


    // Master
    test('@MASTER/ACCOUNT-BANK', './master/account-bank');
    test('@MASTER/BUDGET', './master/budget');
    test('@MASTER/BUYER', './master/buyer');
    test('@MASTER/CATEGORY', './master/category');
    test('@MASTER/CURRENCY', './master/currency');
    test('@MASTER/DIVISION', './master/division');
    test('@MASTER/LAMP-STANDARD', './master/lamp-standard');
    test('@MASTER/LOT-MACHINE', './master/lot-machine');
    test('@MASTER/MACHINE', './master/machine');
    test('@MASTER/PRODUCT', './master/product');
    test('@MASTER/SUPPLIER', './master/supplier');
    test('@MASTER/THREAD-SPECIFICATION', './master/thread-specification');
    test('@MASTER/UNIT', './master/unit');
    test('@MASTER/UOM', './master/uom');
    test('@MASTER/USTER', './master/uster');
    test('@MASTER/VAT', './master/vat');
    test('@MASTER/YARN-EQUIVALENT-CONVERSION', './master/yarn-equivalent-coversion');
    test('@MASTER/ORDER-TYPE', './master/order-type');
    test('@MASTER/PROCESS-TYPE', './master/process-type');
    test('@MASTER/COLOR-TYPE', './master/color-type');
    test('@MASTER/INSTRUCTION', './master/instruction');
    test('@MASTER/MACHINE-TYPE', './master/machine-type');

    //Purchasing 
    test('@PURCHASING/PURCHASE REQUEST', './purchasing/purchase-request');
    test('@PURCHASING/PURCHASE ORDER', './purchasing/purchase-order');
    test('@PURCHASING/PURCHASE ORDER EXTERNAL', './purchasing/purchase-order-external'); 
    test('@PURCHASING/DELIVERY ORDER', './purchasing/delivery-order'); 
    test('@PURCHASING/UNIT RECEIPT NOTE', './purchasing/unit-receipt-note'); 
    test('@PURCHASING/UNIT PAYMENT ORDER', './purchasing/unit-payment-order'); 
    test('@PURCHASING/UNIT PAYMENT PRICE CORRECTION', './purchasing/unit-payment-price-correction-note');
    test('@PURCHASING/UNIT PAYMENT QUANTITY CORRECTION', './purchasing/unit-payment-quantity-correction-note');
    
    //  test('@purchasing/purchase-order/report', './purchasing/purchase-order/report/report');		

    // ok
    // test('@purchasing/delivery-order-manager', './purchasing/delivery-order-manager-test');

    // test('@purchasing/unit-receipt-note', './purchasing/unit-receipt-note-manager-test');
    // test('@purchasing/unit-payment-price-correction-note', './purchasing/unit-payment-price-correction-note-manager-test');
    // test('@purchasing/unit-payment-order', './purchasing/unit-payment-order-test');
    // test('@purchasing/purchase-request/create', './purchasing/purchase-request/create');
    // test('@purchasing/purchase-request/post', './purchasing/purchase-request/post');
    // test('@purchasing/purchase-order/create', './purchasing/purchase-order/create');
    // test('@purchasing/purchase-order/update', './purchasing/purchase-order/update');

    // ok
    // test('@purchasing/delivery-order/create', './purchasing/delivery-order/create');
    // test('@purchasing/unit-receipt-note/create', './purchasing/unit-receipt-note/create');

    // test('@purchasing/unit-payment-order/create', './purchasing/unit-payment-order/create');
    // test('@purchasing/unit-payment-price-correction-note/create', './purchasing/unit-payment-price-correction-note/create');
    // test('@purchasing/unit-payment-quantity-correction-note/create', './purchasing/unit-payment-quantity-correction-note/create');

    // //Production

    // test('@production/production-order', './production/finishing-printing/production-order/create');
    // test('@production/winding-quality-sampling-manager', './production/spinning/winding/winding-quality-sampling-manager-test');
    // test('@production/winding-production-output-manager', './production/spinning/winding/winding-production-output-manager-test');
    
    //Sales

    
    test('@production/production-order', './sales/production-order/create');

});
