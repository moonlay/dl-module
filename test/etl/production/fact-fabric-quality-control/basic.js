var helper = require("../../../helper");
var Manager = require("../../../../src/etl/production/fact-fabric-quality-control-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../../sql-helper");

const dataUtil = [
    {
        "_stamp": "8d48155f457f180",
        "_type": "fabric-quality-control",
        "_version": "1.0.0",
        "_active": false,
        "_deleted": true,
        "_createdBy": "dev2",
        "_createdDate": new Date("2017-04-12T03:42:32.975Z"),
        "_createAgent": "manager",
        "_updatedBy": "dev2",
        "_updatedDate": new Date("2017-04-12T03:42:33.769Z"),
        "_updateAgent": "manager",
        "code": "Z5MGV08X",
        "pointSystem": 10,
        "dateIm": new Date("2017-03-14T17:00:00.000Z"),
        "shiftIm": "Shift II: 14.00 - 22.00",
        "group": "",
        "operatorIm": "Felicia",
        "machineNoIm": "Mesin-015",
        "productionOrderNo": "5891ZL2W",
        "productionOrderType": "SOLID",
        "kanbanCode": "2973145Z",
        "cartNo": "11NEO5MR",
        "buyer": "PRASETYO",
        "orderQuantity": 25000,
        "color": "PUTIH",
        "construction": "TC Oxford /  110x44 / 47",
        "packingInstruction": "DIROLL @ 60 YDS",
        "uom": "YDS",
        "fabricGradeTests": [
            {
                "type": "SOLID",
                "pcsNo": "PCS-001",
                "grade": "A",
                "width": 50,
                "initLength": 2000,
                "avalLength": 5,
                "sampleLength": 0,
                "finalLength": 1995,
                "fabricGradeTest": 0,
                "finalGradeTest": 0,
                "criteria": [
                    {
                        "code": "B001",
                        "group": "BENANG",
                        "name": "Slubs",
                        "score": {
                            "A": 0,
                            "B": 0,
                            "C": 0,
                            "D": 0
                        }
                    },
                    {
                        "code": "B002",
                        "group": "BENANG",
                        "name": "Neps",
                        "score": {
                            "A": 0,
                            "B": 0,
                            "C": 0,
                            "D": 0
                        }
                    }
                ],
                "score": 225,
                "finalScore": 2.25,
                "pointSystem": 10
            }
        ]
    }
]

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

it("#01. should success when create etl fact-fabric-quality-control", function (done) {
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
    instanceManager.transform(dataUtil)
        .then(() => {
            done();
        })
        .catch((e) => {
            done(e);
        });
});

// it("#03. should error when load empty data", function (done) {
//     instanceManager.load({})
//         .then(id => {
//             done("should error when create with empty data");
//         })
//         .catch(e => {
//             try {                
//                 done();
//             }
//             catch (ex) {
//                 done(ex);
//             }
//         });
// });

// it("#04. should error when insert empty data", function (done) {
//     instanceManager.insertQuery(this.sql, "")
//         .then((id) => {
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