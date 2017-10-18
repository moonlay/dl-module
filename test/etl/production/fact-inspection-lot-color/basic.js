var helper = require("../../../helper");
var Manager = require("../../../../src/etl/production/fact-inspection-lot-color-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../../sql-helper");

const DATA_UTIL = [
    {
        "_stamp": "8d4dadd46a2e200",
        "_type": "inspection-lot-color",
        "_version": "1.0.0",
        "_active": false,
        "_deleted": true,
        "_createdBy": "dev2",
        "_createdDate": new Date("2017-08-04T09:05:27.292+07:00"),
        "_createAgent": "manager",
        "_updatedBy": "dev2",
        "_updatedDate": new Date("2017-08-04T09:05:27.379+07:00"),
        "_updateAgent": "manager",
        "code": "D534GXER",
        "fabricQualityControlCode": "G3Y4GV10",
        "fabricQualityControlId": "5983c5c807edd9003f82af5a",
        "productionOrderNo": "EQ2NDQ1M",
        "productionOrderId": {

        },
        "productionOrderType": "PRINTING",
        "cartNo": "1-1-...",
        "construction": "CD / 88x70 / 47",
        "color": "TOSCA",
        "orderQuantity": 1098,
        "uom": "MTR",
        "date": new Date("2017-08-01T00:00:00.000+07:00"),
        "items": [
            {
                "_stamp": "",
                "_type": "inspection-lot-color-item",
                "_version": "1.0.0",
                "_active": false,
                "_deleted": false,
                "_createdBy": "",
                "_createdDate": new Date("1900-02-01T07:00:00.000+07:00"),
                "_createAgent": "",
                "_updatedBy": "",
                "_updatedDate": new Date("1900-02-01T07:00:00.000+07:00"),
                "_updateAgent": "",
                "pcsNo": "6",
                "grade": "C",
                "lot": "tes",
                "status": "OK"
            },
            {
                "_stamp": "",
                "_type": "inspection-lot-color-item",
                "_version": "1.0.0",
                "_active": false,
                "_deleted": false,
                "_createdBy": "",
                "_createdDate": new Date("1900-02-01T07:00:00.000+07:00"),
                "_createAgent": "",
                "_updatedBy": "",
                "_updatedDate": new Date("1900-02-01T07:00:00.000+07:00"),
                "_updateAgent": "",
                "pcsNo": "6a",
                "grade": "BS",
                "lot": "tes",
                "status": "OK"
            },
        ],
        "kanbanCode": "G30MX1N3",
        "kanbanId": "596dc606bb75090036ebddda"
    }
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

it("#01. should success when create etl fact-inspection-lot-color", function (done) {
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
    instanceManager.transform(DATA_UTIL)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});