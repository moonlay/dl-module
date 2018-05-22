require("should");
var helper = require("../../../helper");

var purchaseRequestDataUtil = require('../../../data').purchasing.purchaseRequest;
var validatePR = require("dl-models").validator.purchasing.purchaseRequest;
var PurchaseRequestManager = require("../../../../src/managers/purchasing/purchase-request-manager");
var purchaseRequestManager = null;
var purchaseRequest;

var generateCode = require('../../../../src/utils/code-generator');

var purchaseOrderDataUtil = require('../../../data').purchasing.purchaseOrder;
var validatePO = require("dl-models").validator.purchasing.purchaseOrder;
var PurchaseOrderManager = require("../../../../src/managers/purchasing/purchase-order-manager");
var purchaseOrderManager = null;
var purchaseOrder;
var purchaseOrders=[];
var purchaseRequests=[];
var purchaseRequestsPosted=[];

var purchaseOrderExternalDataUtil = require('../../../data').purchasing.purchaseOrderExternal;
var validatePO = require("dl-models").validator.purchasing.purchaseOrderExternal;
var PurchaseOrderExternalManager = require("../../../../src/managers/purchasing/purchase-order-external-manager");
var purchaseOrderExternalManager = null;
var purchaseOrderExternal;


before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            purchaseRequestManager = new PurchaseRequestManager(db, {
                username: 'dev'
            });
            purchaseOrderManager = new PurchaseOrderManager(db, {
                username: 'dev'
            });
            purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, {
                username: 'dev'
            });

    done();
                       
        })
        .catch(e => {
            done(e);
        });
});


// var kodeUnik;
// var PO;
// it('#02. should success when create 20 data PO', function (done) {
//     var data = []; 
//     var datepr = new Date();
//     var tasks=[];
//     kodeUnik = generateCode();
//     for (var i = 0; i < PR.length; i++) { 
//         var po = purchaseOrderDataUtil.getNew(PR[i]); 
//         data.push(po); 
//     } 
     
//     Promise.all(data) 
//         .then((result) => {
//             for (var i = 0; i < PR.length; i++) {
//                 result[i].remark=kodeUnik;
//                 result[i].date= datepr.setDate(datepr.getDate() - (i*2));
//                 tasks.push(purchaseOrderManager.update(result[i]));
//             }
//             PO=result;
//             Promise.all(tasks)
//                         .then(result => {
//                             resolve(result);
                            
//                         })
//                         .catch(e => {
//                            done(e);
//                         });
//             done(); 
//         }).catch(e => {
//             done(e);
//         });
       
//    });

it('#01. should success when create 20 PO External data', function (done) {
   
    var data = []; 
    for (var i = 0; i < 20; i++) { 
        purchaseOrderExternalDataUtil.getPosted().then(
            poe=>{
                data.push(poe); 
            }
        )
        
    } 
    Promise.all(data) 
        .then((result) => { 
            done(); 
        }).catch(e => {
            done(e);
        });
    
 });

it('#02. should success when get data report PO Per Unit Per Category', function (done) {
    purchaseOrderManager.getDataPOUnitCategory()
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#03. should success when get data report PO Per Unit', function (done) {
    purchaseOrderManager.getDataPOUnit()
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#04. should success when get data report Per Category', function (done) {
    purchaseOrderManager.getDataPOCategory()
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});
var startDate=new Date();
var endDate=new Date();
it('#05. should success when get data report PO Per Unit Per Category with date', function (done) {
    
    purchaseOrderManager.getDataPOUnitCategory(startDate,endDate)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#06. should success when get data report PO Per Unit with date', function (done) {
    purchaseOrderManager.getDataPOUnit(startDate,endDate)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#07. should success when get data report Per Category with date', function (done) {
    purchaseOrderManager.getDataPOCategory(startDate,endDate)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#08. should success when get data report Per Supplier with date', function (done) {
    purchaseOrderManager.getDataPOSupplier(startDate,endDate)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#09. should success when get data report Per Supplier', function (done) {
    purchaseOrderManager.getDataPOSupplier()
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#10. should success when get data report History Price', function (done) {
    purchaseOrderManager.getPrice()
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#11. should success when get data report History Price with date and product', function (done) {
   var dateFrom= null;
   var dateTo = null;
   var productName ="SUSU";
    purchaseOrderManager.getPrice(dateFrom, dateTo, productName)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#12. should success when get data report PO Per Unit,Kategori with date', function (done) {
   var dateFrom = null;
   var dateTo   = null;
   var unitId   = null;
   var categoryId   = null;
    purchaseOrderManager.getDataPOIntMonitoring(dateFrom, dateTo, unitId, categoryId)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });
});

it('#13. should success when get data report Per Supplier Per Unit Per Kategori with date', function (done) {
    var startdate = null;
    var enddate   = null;
    var unit     = null;
    var category = null;
    var supplier = null;
    purchaseOrderManager.getDataTotalBeliSupplier(unit, category, supplier, startdate, enddate)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#14. should success when get data report Per Supplier Per Unit Per Kategori', function (done) {
    purchaseOrderManager.getDataTotalBeliSupplier()
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#15. should success when get data detail report Per Supplier with date', function (done) {
    var startdate = null;
    var enddate   = null;
    var supplierId = null;
    purchaseOrderManager.getDataPOSplDetil(startdate, enddate, supplierId)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#16. should success when get data report PO Per Staff with date', function (done) {
    purchaseOrderManager.getDataPOStaff(startDate,endDate)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});

it('#17. should success when get data detail report Per Staff with date', function (done) {
    var startdate = null;
    var enddate   = null;
    var staff = null;
    purchaseOrderManager.getDataPODetailStaff(startdate, enddate, staff)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});


it('#18. should success when get data report Per Supplier Per Unit Per Kategori with date', function (done) {
    var dateFrom = null;
    var dateTo   = null;
    var unitId     = null;
    var categoryId = null;
    var offset = 7;
    purchaseOrderManager.getDataPOIntNotPostMonitoring(unitId, categoryId, dateFrom, dateTo, offset)
    .then(po => {
        po.should.instanceof(Array);
        done();
    }).catch(e => {
            done(e);
        });

});
