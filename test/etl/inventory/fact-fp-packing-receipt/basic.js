var helper = require("../../../helper");
var Manager = require("../../../../src/etl/inventory/fact-fp-packing-receipt-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../../sql-helper");

const DATA_UTIL = [
    {
        uom: {
            unit: "yds"
        },
        orderQuantity: 1,
        material: {
            name: ""
        },
        materialConstruction: {
            name: ""
        },
        yarnMaterial: {
            name: ""
        },
        materialWidth: 0
    },
    {
        uom: {
            unit: "mtr"
        },
        orderQuantity: 1,
        material: {
            name: "test"
        },
        materialConstruction: {
            name: "test"
        },
        yarnMaterial: {
            name: "test"
        },
        materialWidth: 1
    },
];

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

it("#01. should success when create etl fact-fp-packing-receipt", function (done) {
    instanceManager.run()
        .then((a) => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should success when transforming data", function (done) {
    instanceManager.transform(data)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});