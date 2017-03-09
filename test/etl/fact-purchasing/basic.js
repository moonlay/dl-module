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

it("#02. should success when transforming data", function (done) {
    var data = [
        {
            purchaseOrder: {
                _createdDate: new Date(),
                purchaseOrderExternal: {
                    date: new Date(1970, 1, 1) 
                },
                items: [
                    {
                        fulfillments: [
                            {
                                deliveryOrderDate: new Date()
                            }
                            ]
                    }
                ]
            },
            purchaseRequest: {
                category: {
                    name: ""
                },
                date: new Date(1970, 1, 1)
            }
        },
        {
            purchaseOrder: {
                _createdDate: new Date(),
                purchaseOrderExternal: {
                    date: new Date() 
                },
                items: [
                    {
                        fulfillments: [
                            {
                                deliveryOrderDate: new Date()
                            }
                            ]
                    }
                ]
            },
            purchaseRequest: {
                category: {
                    name: "BAHAN BAKU"
                },
                date: new Date()
            }
        }
    ];
    instanceManager.transform(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#03. should success when extracting PR from PO", function (done) {
    var data = [
        {
            purchaseRequest: {}
        }
        ];
    instanceManager.getPRFromPO(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#04. should success when joining PR to PO", function (done) {
    var data = [];
    instanceManager.joinPurchaseOrder(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});


it("#05. should success when remove duplicate data", function (done) {
    var arr = [{ no: {} }, { no: {} }];
    instanceManager.removeDuplicates(arr)
        .then((a) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#06. should error when load empty data", function (done) {
    instanceManager.load({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch((e) => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it("#07. should error when insert empty data", function (done) {
    instanceManager.insertQuery(this.sql, "")
        .then((id) => {
            done("should error when create with empty data");
        })
        .catch((e) => {
            try {
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});
