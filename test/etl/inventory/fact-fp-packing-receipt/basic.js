var helper = require("../../../helper");
var Manager = require("../../../../src/etl/inventory/fact-fp-packing-receipt-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../../sql-helper");

const DATA_UTIL = [
    {
        "_stamp": "8d4f658aebe3b00",
        "_type": "fp-packing-receipt",
        "_version": "1.0.0",
        "_active": false,
        "_deleted": false,
        "_createdBy": "dev2",
        "_createdDate": new Date("2017-09-08T01:26:51.468Z"),
        "_createAgent": "manager",
        "_updatedBy": "dev2",
        "_updatedDate": new Date("2017-09-08T01:26:51.534Z"),
        "_updateAgent": "manager",
        "code": "Z3500JN7",
        "date": new Date("2017-09-08T00:00:00.000Z"),
        "packingCode": "WKNRZP0P",
        "accepted": true,
        "declined": false,
        "remark": "",
        "referenceNo": "",
        "referenceType": "Penerimaan Packing Gudang Jadi",
        "type": "IN",
        "productionOrderNo": "N3GVJZ2V",
        "buyer": "PT TIGA DARA",
        "colorName": "a",
        "construction": "PLAIN MMC / 100x64 / 100",
        "materialWidthFinish": "",
        "items": [
            {
                "_stamp": "",
                "_type": "packing-receipt-item",
                "_version": "1.0.0",
                "_active": false,
                "_deleted": false,
                "_createdBy": "",
                "_createdDate": new Date("1900-02-01T00:00:00.000Z"),
                "_createAgent": "",
                "_updatedBy": "",
                "_updatedDate": new Date("1900-02-01T00:00:00.000Z"),
                "_updateAgent": "",
                "product": "N3GVJZ2V/a/PLAIN MMC / 100x64 / 100/L-1a/AA/1.2/qqwwee",
                "quantity": 120,
                "length": 1.2,
                "weight": 12,
                "remark": "qqwwee",
                "notes": "qwe1",
            },
            {
                "_stamp": "",
                "_type": "packing-receipt-item",
                "_version": "1.0.0",
                "_active": false,
                "_deleted": false,
                "_createdBy": "",
                "_createdDate": new Date("1900-02-01T00:00:00.000Z"),
                "_createAgent": "",
                "_updatedBy": "",
                "_updatedDate": new Date("1900-02-01T00:00:00.000Z"),
                "_updateAgent": "",
                "product": "N3GVJZ2V/a/PLAIN MMC / 100x64 / 100/L-1b/BB/1.3/aassdd",
                "quantity": 130,
                "length": 1.3,
                "weight": 13,
                "remark": "aassdd",
                "notes": "asd2",
            }
        ],
        "packingUom": "ROLL",
        "orderType": "RFD",
        "colorType": "DARK",
        "designCode": "",
        "designNumber": ""
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