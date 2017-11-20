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

var extractedData;
it("#01. should success when extract all data", function (done) {
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
it("#02. should success when transfrom all data", function (done) {
    garmentPurchaseRequestDataUtil.getData().then((data) => {
        extractedData.dataTest = data;
        var table1 = extractedData;
        instanceManager.transform(extractedData, table1)
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

var dataBeforeLoad
it("#03. should success when delete all data", function (done) {
    instanceManager.beforeLoad(transfrom)
        .then((result) => {
            done();

        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});

it("#04. should success when load all data", function (done) {
    instanceManager.load(transfrom, dataBeforeLoad)
        .then((result) => {

            var data = result.processed;
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
//     // var table1 = "Budget1";
//     // var table2 = "POrder1";
//     var table1 = "Budget1";
//     var table2 = "POrder1";
//     var date="latest";
//     var page=1;
//     var size=200;

//     instanceManager.run(date, table1, table2, page, size)
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

