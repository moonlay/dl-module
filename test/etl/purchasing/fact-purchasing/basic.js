var helper = require("../../../helper");
// var Manager = require("../../../src/etl/fact-purchasing-etl-manager");
var Manager = require("../../../../src/etl/purchasing/fact-pembelian");
var instanceManager = null;
var should = require("should");
var sqlMock = require("../../../sql-mock");

before("#00. connect db", function (done) {
    Promise.all([helper])
        .then((result) => {
            var db = result[0];

            db.getDb().then((db) => {
                instanceManager = new Manager(db, {
                    username: "unit-test"
                }, sqlMock);
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
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when transforming data", function (done) {
    var data = [
        {
            purchaseOrder: {
                _deleted: false,
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
                _deleted: false,
                category: {
                    name: ""
                },
                date: new Date(1970, 1, 1)
            }
        },
        {
            purchaseOrder: {
                _deleted: false,
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
        },
        {
            _deleted: true,
            purchaseOrder: {
                _createdDate: new Date("2017-03-29T16:13:51+07:00"),
                purchaseOrderExternal: {
                    date: new Date("2017-04-16T16:14:08+07:00")
                },
                items: [
                    {
                        fulfillments: [
                            {
                                deliveryOrderDate: new Date("2017-05-29T16:14:08+07:00")
                            }
                        ]
                    }
                ]
            },
            purchaseRequest: {
                _deleted: false,
                category: {
                    name: "BUKAN BAHAN BAKU"
                },
                date: new Date("2017-04-08T16:14:08+07:00")
            }
        },
        {
            _deleted: true,
            purchaseOrder: {
                _createdDate: new Date("2017-03-29T16:13:51+07:00"),
                purchaseOrderExternal: {
                    date: new Date("2017-04-16T16:14:08+07:00")
                },
                items: [
                    {
                        fulfillments: [
                            {
                                deliveryOrderDate: new Date("2017-06-29T16:14:08+07:00")
                            }
                        ]
                    }
                ]
            },
            purchaseRequest: {
                _deleted: false,
                category: {
                    name: "BUKAN BAHAN BAKU"
                },
                date: new Date("2017-04-08T16:14:08+07:00")
            }
        },
        {
            _deleted: true,
            purchaseOrder: {
                _createdDate: new Date("2017-03-29T16:13:51+07:00"),
                purchaseOrderExternal: {
                    date: new Date("2017-04-16T16:14:08+07:00")
                },
                items: [
                    {
                        fulfillments: [
                        ]
                    }
                ]
            },
            purchaseRequest: {
                _deleted: false,
                category: {
                    name: "BUKAN BAHAN BAKU"
                },
                date: new Date("2017-04-08T16:14:08+07:00")
            }
        },
        {
            purchaseOrder: null,
            purchaseRequest: {
                _deleted: false,
                category: {
                    name: "BUKAN BAHAN BAKU"
                },
                date: new Date("2017-04-08T16:14:08+07:00"),
                items: [

                ]
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

// it("#06. should error when load empty data", function (done) {
//     instanceManager.load({})
//         .then(id => {
//             done("should error when create with empty data");
//         })
//         .catch((e) => {
//             try {
//                 done();
//             }
//             catch (ex) {
//                 done(ex);
//             }
//         });
// });

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
