function test(name, path) {
    describe(name, function () {
        require(path);
    });
}


describe('#dl-module', function (done) {
    this.timeout(2 * 60000);

    // Auth
    test('@AUTH/ACCOUNT', './auth/account');
    test('@AUTH/ROLE', './auth/role');
    test('@AUTH/API-ENDPOINT', './auth/api-endpoint');

    //Etl
    test('@ETL/DIM-BUYER', './etl/dim-buyer');
    test('@ETL/DIM-CATEGORY', './etl/dim-category');
    test('@ETL/DIM-DIVISION', './etl/dim-division');
    test('@ETL/DIM-SUPPLIER', './etl/dim-supplier');
    test('@ETL/DIM-MACHINE', './etl/dim-machine');
    test('@ETL/DIM-UNIT', './etl/dim-unit');
    test('@ETL/FACT-TOTAL-HUTANG', './etl/fact-total-hutang');
    test('@ETL/FACT-PURCHASING', './etl/fact-purchasing');
    test('@ETL/FACT-MONITORING-EVENT', './etl/fact-monitoring-event');
    test('@ETL/FACT-PRODUCTION-ORDER', './etl/fact-production-order');
    test('@ETL/FACT-WEAVING-SALES-CONTRACT', './etl/fact-weaving-sales-contract');
    test('@ETL/FACT-FINISHING-PRINTING-SALES-CONTRACT', './etl/fact-finishing-printing-sales-contract');
    test('@ETL/FACT-SPINNING-SALES-CONTRACT', './etl/fact-spinning-sales-contract');
    test('@ETL/FACT-DAILY-OPERATIONS', './etl/fact-daily-operations');

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

    // test('@MASTER/MONITORING-EVENT-TYPE', './master/monitoring-event-type');
    test('@MASTER/STEP', './master/step');
    //test('@MASTER/MACHINE-TYPE', './master/machine-type');
    test('@MASTER/MACHINE-SPESIFICATION-STANDARD', './master/machine-spesification-standard');
    test('@MASTER/MATERIAL-CONSTRUCTION', './master/material-construction');
    test('@MASTER/YARN-MATERIAL', './master/yarn-material');
    test('@MASTER/STANDARD-TEST', './master/standard-test');
    test('@MASTER/FINISH-TYPE', './master/finish-type');
    test('@MASTER/COMODITY', './master/comodity');
    test('@MASTER/QUALITY', './master/quality');
    test('@MASTER/TERM OF PAYMENT', './master/term-of-payment');
    test('@MASTER/DESIGN-MOTIVE', './master/design-motive');

    //Purchasing 
    test('@PURCHASING/PURCHASE REQUEST', './purchasing/purchase-request');
    test('@PURCHASING/PURCHASE ORDER', './purchasing/purchase-order');
    test('@PURCHASING/PURCHASE ORDER EXTERNAL', './purchasing/purchase-order-external');
    test('@PURCHASING/DELIVERY ORDER', './purchasing/delivery-order');
    test('@PURCHASING/UNIT RECEIPT NOTE', './purchasing/unit-receipt-note');
    test('@PURCHASING/UNIT PAYMENT ORDER', './purchasing/unit-payment-order');
    test('@PURCHASING/UNIT PAYMENT PRICE CORRECTION', './purchasing/unit-payment-price-correction-note');
    test('@PURCHASING/UNIT PAYMENT QUANTITY CORRECTION', './purchasing/unit-payment-quantity-correction-note');
    test('@purchasing/purchase-order/report', './purchasing/purchase-order/report/report');

    //Sales
    test('@SALES/PRODUCTION-ORDER', './sales/production-order');
    test('@SALES/FINISHING PRINTING SALES CONTRACT', './sales/finishing-printing-sales-contract');
    test('@SALES/SPINNING SALES CONTRACT', './sales/spinning-sales-contract');
    test('@SALES/WEAVING SALES CONTRACT', './sales/weaving-sales-contract');

    //Production
    test('@PRODUCTION/FINISHING-PRINTING/KANBAN', './production/finishing-printing/kanban');
    test('@PRODUCTION/DAILY OPERATION', './production/finishing-printing/daily-operation');
    test('@PRODUCTION/FINISHING-PRINTING/MONITORING-SPECIFICATION-MACHINE', './production/finishing-printing/monitoring-specification-machine');
    test('@PRODUCTION/FINISHING-PRINTING/MONITORING-EVENT', './production/finishing-printing/monitoring-event');

    // test('@production/winding-quality-sampling-manager', './production/spinning/winding/winding-quality-sampling-manager-test');
    // test('@production/winding-production-output-manager', './production/spinning/winding/winding-production-output-manager-test');

});
