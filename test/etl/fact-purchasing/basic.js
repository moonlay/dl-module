var helper = require("../../helper");
// var Manager = require("../../../src/etl/fact-purchasing-etl-manager");
var Manager = require("../../../src/etl/fact-pembelian");
var instanceManager = null;
var should = require("should");

before("#00. connect db", function (done) {
    helper.getDb()
        .then((db) => {
            instanceManager = new Manager(db, {
                username: "unit-test"
            });
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#01. should success when create etl fact-purchasing", function (done) {
    instanceManager.run()
        .then((a) => {
            console.log(a);
            // var fs = require("fs");
            // var path = "C:\\Users\\leslie.aula\\Desktop\\tttt.txt";

            // fs.writeFile(path, a, function (error) {
            //     if (error) {
            //         console.error("write error:  " + error.message);
            //     } else {
            //         console.log("Successful Write to " + path);
            //     }
            // });

            done();
        })
        .catch((e) => {
            console.log(e);
            done(e);
        });
});

// it("#01. should success when log synchronize date after updating fact-purchasing", function(done) {
//     instanceManager.lastSynchDate()
//         .then(() => {
//             // console.log(a);
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });