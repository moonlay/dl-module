var helper = require("../../../helper");
var Manager = require("../../../../src/etl/garment/garment-purchase-request-etl-manager");
var instanceManager = null;
var should = require("should");
var sqlHelper = require("../../../sql-helper");

var garmentPurchaseRequestDataUtil = require("../../../data-util/garment-purchasing/etl/etl-garment-purchase-request-data-util");

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

it("#01. should error when extract with empty data", function (done) {
    var table1 = "table1";
    var table2 = "table1";

    instanceManager.extract(table1, table2)
        .then((id) => {
            done("Should not be able to create with empty data");
        })
        .catch((e) => {
            try {
                done();
            }
            catch (ex) {
                done(e);
            }
        });
});

var extractedData;
it("#02. should success when extract all data", function (done) {

    garmentPurchaseRequestDataUtil.getNewData()
        .then((result) => {
            extractedData = result;
            extractedData.should.instanceof(Array);
            extractedData.length.should.not.equal(0);
            done();
        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});

var transfrom;
it("#03. should success when transfrom all data", function (done) {
    garmentPurchaseRequestDataUtil.getData().then((data) => {
        instanceManager.transform(extractedData, data)
            .then((result) => {
                transfrom = result;
                transfrom.should.instanceof(Array);
                transfrom.length.should.not.equal(0);
                done();

            })
    }).catch((e) => {
        console.log(e);
        done(e);
    });
});

it("#04. should success when load all data", function (done) {
    instanceManager.load(transfrom)
        .then((result) => {

            var data = result;
            data.should.instanceof(Array);
            data.length.should.not.equal(0);
            done();

        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});

// it("#04. should success migrate all data", function (done) {
//     var table1 = "Budget1";
//     var table2 = "POrder1";
//     // var table1 = "Budget";
//     // var table2 = "POrder";
//     instanceManager.run(table1, table2)
//         .then((result) => {

//             var results = result;
//             results.should.instanceof(Object);
//             done();

//         })
//         .catch((e) => {
//             console.log(e);
//             done(e);
//         });
// });

