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

it("#01. should success when get time stamp", function (done) {
    testTable = "Budget"
    instanceManager.getTimeStamp(testTable)
        .then((result) => {
            // var data = result.processed;
            // data.should.instanceof(Array);
            // data.length.should.not.equal(0);
            done();

        })
        .catch((e) => {
            done(e);
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
            done(e);
        });
});

var transfrom;
it("#03. should success when transfrom all data", function (done) {
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
        done(e);
    });
});

var dataBeforeLoad
it("#04. should success before Load", function (done) {
    instanceManager.beforeLoad(transfrom)
        .then((result) => {
            dataBeforeLoad = result;
            done();

        })
        .catch((e) => {
            done(e);
        });
});

it("#05. should success when load all data", function (done) {
    instanceManager.load(transfrom, dataBeforeLoad)
        .then((result) => {

            var data = result.processed;
            data.should.instanceof(Array);
            data.length.should.not.equal(0);
            done();

        })
        .catch((e) => {
            done(e);
        });

});

it("#06. should success before Load", function (done) {
    instanceManager.beforeLoad(transfrom)
        .then((result) => {
            dataBeforeLoad = result;
            done();

        })
        .catch((e) => {
            done(e);
        });
});

it("#07. should success when load all data", function (done) {
    instanceManager.load(transfrom, dataBeforeLoad)
        .then((result) => {

            var data = result.processed;
            data.should.instanceof(Array);
            data.length.should.not.equal(0);
            done();

        })
        .catch((e) => {
            done(e);
        });
});


it("#08. should success when find data", function (done) {
    var temp = transfrom;
    var roNoArr = [];

    for (var i of temp) {
        roNoArr.push(i[0].roNo);
    }


    instanceManager.findData(roNoArr)
        .then((result) => {
            done();

        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});

it("#09. should success when get data all embeded data", function (done) {
    instanceManager.getDataUnit([extractedData.Konf])
        .then((result) => {
            instanceManager.getDataBuyer([extractedData.Buyer])
                .then((result) => {
                    instanceManager.getDataUom([extractedData.Satb])
                        .then((result) => {
                            instanceManager.getDataProduct([extractedData.Kodeb])
                                .then((result) => {
                                    instanceManager.getDataCategory([extractedData.Cat])
                                        .then((result) => {
                                            done();
                                        })
                                })
                        })
                })
        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});



// it("#zz. should success migrate all data", function (done) {
//     var table1 = "Budget1";
//     var table2 = "POrder1";
//     // var table1 = "Budget";
//     // var table2 = "POrder";
//     var date="latest";
//     var page=1;
//     var size=10;

//     instanceManager.run(date, table1, table2, page, size)
//         .then((result) => {

//             var results = result;
//             results.should.instanceof(Object);
//             done();

//         })
//         .catch((e) => {
//             done(e);
//         });
// });

