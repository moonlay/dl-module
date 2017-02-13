var helper = require("../../helper");
// var Manager = require("../../../src/etl/fact-purchasing-etl-manager");
var Manager = require("../../../src/etl/fact-pembelian");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../sql-helper");

before("#00. connect db", function (done) {
    Promise.all([helper, sqlHelper])
        .then((result) => {
            var db = result[0];
            var sql = result[1];
            db.getDb().then((db) => {
                instanceManager = new Manager(db, {
                    username: "unit-test"
                }, sql);
                done();
            })
                .catch((e) => {
                    done(e);
                })
        });
});

it("#01. should success when create etl fact-purchasing", function (done) {
    instanceManager.run()
        .then((a) => {
            console.log(a);
            done();
        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});



var data = [{}, {}];

it("#02. should success when transforming data", function (done) {
    instanceManager.transform(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#03. should success when extracting PR from PO", function (done) {
    instanceManager.getPRFromPO(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#04. should success when joining PR to PO", function (done) {
    instanceManager.joinPurchaseOrder(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success when joining data to PO External", function (done) {
    instanceManager.joinPurchaseOrderExternal(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should success when joining data to Delivery Order", function (done) {
    instanceManager.joinDeliveryOrder(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#07. should success when joining data to Unit Receipt Note", function (done) {
    instanceManager.joinUnitReceiptNote(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#08. should success when joining data to Unit Payment Order", function (done) {
    instanceManager.joinUnitPaymentOrder(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var arr = [{no: {}}, {no: {}}];
it("#09. should success when remove duplicate data", function (done) {
    instanceManager.removeDuplicates(arr)
        .then((a) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#10. should error when load empty data", function (done) {
    instanceManager.load({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {                
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

// it("#11. should success when get days range by week", function (done) {
//     instanceManager.getRangeWeek(days)
//         .then((a) => {
//             done(a);
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

// var catType = "";
// it("#12. should success when get category type", function (done) {
//     instanceManager.getCategoryType(days)
//         .then((a) => {
//             done(a);
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

// var poDate = new Date();
// var doDate = new Date();
// it("#10. should success when get status", function (done) {
//     instanceManager.getStatus(poDate, doDate)
//         .then((a) => {
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });