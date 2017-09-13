function test(name, path) {
    describe(name, function () {
        require(path);
    });
}


describe('#dl-module', function (done) {
    this.timeout(60 * 60000);

    // Auth
    test('@AUTH/ACCOUNT', './auth/account');
    test('@AUTH/ROLE', './auth/role');
    test('@AUTH/API-ENDPOINT', './auth/api-endpoint');

    //Etl
    test('@ETL/DIM-BUYER', './etl/dim/dim-buyer');
    test('@ETL/DIM-CATEGORY', './etl/dim/dim-category');
    test('@ETL/DIM-DIVISION', './etl/dim/dim-division');
    test('@ETL/DIM-SUPPLIER', './etl/dim/dim-supplier');
    test('@ETL/DIM-MACHINE', './etl/dim/dim-machine');
    test('@ETL/DIM-UNIT', './etl/dim/dim-unit');
    test('@ETL/DIM-PROCESS-TYPE', './etl/dim/dim-process-type');
    test('@ETL/DIM-ORDER-TYPE', './etl/dim/dim-order-type');
    test('@ETL/DIM-PRODUCT', './etl/dim/dim-product');
    test('@ETL/DIM-STORAGE', './etl/dim/dim-storage');
    test('@ETL/FACT-TOTAL-HUTANG', './etl/purchasing/fact-total-hutang');
    test('@ETL/FACT-PURCHASING', './etl/purchasing/fact-purchasing');
    test('@ETL/FACT-MONITORING-EVENT', './etl/production/fact-monitoring-event');
    test('@ETL/FACT-PRODUCTION-ORDER', './etl/production/fact-production-order');
    test('@ETL/FACT-PRODUCTION-ORDER-STATUS', './etl/sales/fact-production-order-status');
    test('@ETL/FACT-WEAVING-SALES-CONTRACT', './etl/sales/fact-weaving-sales-contract');
    test('@ETL/FACT-FINISHING-PRINTING-SALES-CONTRACT', './etl/sales/fact-finishing-printing-sales-contract');
    test('@ETL/FACT-SPINNING-SALES-CONTRACT', './etl/sales/fact-spinning-sales-contract');
    test('@ETL/FACT-DAILY-OPERATIONS', './etl/production/fact-daily-operations');
    test('@ETL/FACT-KANBAN', './etl/production/fact-kanban');
    test('@ETL/FACT-QUALITY-CONTROL', './etl/production/fact-fabric-quality-control');
    test('@ETL/FACT-INVENTORY-MOVEMENT', './etl/inventory/fact-inventory-movement');
    test('@ETL/FACT-INVENTORY-SUMMARY', './etl/inventory/fact-inventory-summary');
    test('@ETL/garment-purchase-request', './etl/garment/garment-purchase-request');
    test('@ETL/FACT-FP-PACKING-RECEIPT', './etl/inventory/fact-fp-packing-receipt');
    test('@ETL/FACT-FP-SHIPMENT-DOCUMENT', './etl/inventory/fact-fp-shipment-document');
    // Master
    test('@MASTER/ACCOUNT-BANK', './master/account-bank');
    test('@MASTER/BUDGET', './master/budget');
    test('@MASTER/BUYER', './master/buyer');
    test('@MASTER/GARMENT-BUYER', './master/garment-buyer');
    test('@MASTER/CATEGORY', './master/category');
    test('@MASTER/GARMENT-CATEGORY', './master/garment-category');
    test('@MASTER/CURRENCY', './master/currency');
    test('@MASTER/DIVISION', './master/division');
    test('@MASTER/LAMP-STANDARD', './master/lamp-standard');
    test('@MASTER/LOT-MACHINE', './master/lot-machine');
    test('@MASTER/MACHINE', './master/machine');
    test('@MASTER/PRODUCT', './master/product');
    test('@MASTER/GARMENT-PRODUCT', './master/garment-product');
    test('@MASTER/SUPPLIER', './master/supplier');
    test('@MASTER/GARMENT-SUPPLIER', './master/garment-supplier');
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
    test('@MASTER/STORAGE', './master/storage');
    test('@MASTER/COMPANY', './master/company');
    test('@MASTER/CONTACT', './master/contact');
    test('@MASTER/BAD OUTPUT REASON', './master/bad-output-reason');
    test('@MASTER/FINISHING PRINTING DURATION ESTIMATION', './master/fp-duration-estimation');

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
    test('@purchasing/purchase-order/report', './purchasing/duration-report');

    //Garmet Purchasing 
    test('@GARMENT PURCHASING/PURCHASE REQUEST', './garment-purchasing/purchase-request');
    test('@GARMENT PURCHASING/PURCHASE ORDER', './garment-purchasing/purchase-order');
    test('@GARMENT PURCHASING/PURCHASE ORDER EXTERNAL', './garment-purchasing/purchase-order-external');
    test('@GARMENT PURCHASING/DELIVERY ORDER', './garment-purchasing/delivery-order');
    test('@GARMENT PURCHASING/CUSTOMS', './garment-purchasing/customs');
    test('@GARMENT PURCHASING/INVOICE NOTE', './garment-purchasing/invoice-note');
    test('@GARMENT PURCHASING/PURCHASE PRICE CORRECTION', './garment-purchasing/purchase-price-correction');
    test('@GARMENT PURCHASING/UNIT RECEIPT NOTE', './garment-purchasing/unit-receipt-note');
    test('@GARMENT PURCHASING/INTERN NOTE', './garment-purchasing/intern-note');
    test('@GARMENT PURCHASING/PURCHASE QUANTITY CORRECTION', './garment-purchasing/purchase-quantity-correction');
    test('@GARMENT PURCHASING/garment currency', './garment-purchasing/garment-currency');

    //Sales
    test('@SALES/PRODUCTION-ORDER', './sales/production-order');
    test('@SALES/FINISHING PRINTING SALES CONTRACT', './sales/finishing-printing-sales-contract');
    test('@SALES/SPINNING SALES CONTRACT', './sales/spinning-sales-contract');
    test('@SALES/WEAVING SALES CONTRACT', './sales/weaving-sales-contract');
    test('@SALES/DEAL TRACKING BOARD', './sales/deal-tracking-board');
    test('@SALES/DEAL TRACKING STAGE', './sales/deal-tracking-stage');
    test('@SALES/DEAL TRACKING DEAL', './sales/deal-tracking-deal');
    test('@SALES/DEAL TRACKING ACTIVITY', './sales/deal-tracking-activity');

    //Production
    test('@PRODUCTION/FINISHING-PRINTING/KANBAN', './production/finishing-printing/kanban');
    test('@PRODUCTION/FINISHING-PRINTING/FABRIC-QUALITY-CONTROL', './production/finishing-printing/fabric-quality-control');
    test('@PRODUCTION/FINISHING-PRINTING/PACKING', './production/finishing-printing/packing');
    test('@PRODUCTION/DAILY OPERATION', './production/finishing-printing/daily-operation');
    test('@PRODUCTION/FINISHING-PRINTING/MONITORING-SPECIFICATION-MACHINE', './production/finishing-printing/monitoring-specification-machine');
    test('@PRODUCTION/FINISHING-PRINTING/MONITORING-EVENT', './production/finishing-printing/monitoring-event');
    test('@PRODUCTION/INSPECTION LOT COLOR', './production/finishing-printing/inspection-lot-color');

    // test('@production/winding-quality-sampling-manager', './production/spinning/winding/winding-quality-sampling-manager-test');
    // test('@production/winding-production-output-manager', './production/spinning/winding/winding-production-output-manager-test');

    //Inventory
    test('@INVENTORY/FINISHING-PRINTING/PACKING-RECEIPT', './inventory/finishing-printing/packing-receipt');
    test('@INVENTORY/FINISHING-PRINTING/RETUR-TO-QC', './inventory/finishing-printing/fp-retur-to-qc-doc');
    test('@INVENTORY/FINISHING-PRINTING/SHIPMENT-DOCUMENT', './inventory/finishing-printing/shipment-document');
    test('@INVENTORY/INVENTORY-SUMMARY', './inventory/inventory-summary');
    test('@INVENTORY/INVENTORY-MOVEMENT', './inventory/inventory-movement');
    test('@INVENTORY/INVENTORY-DOCUMENT', './inventory/inventory-document');
    test('@INVENTORY/FINISHING-PRINTING/RETUR-FROM-BUYER', './inventory/finishing-printing/fp-retur-fr-byr-doc');
});