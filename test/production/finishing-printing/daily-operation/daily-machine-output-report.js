require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/daily-operation-data-util");
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.dailyOperation;
var codeGenerator = require('../../../../src/utils/code-generator');
var moment = require('moment');

var DailyOperationManager = require("../../../../src/managers/production/finishing-printing/daily-operation-manager");
var dailyOperationManager;
// var dateNow;
// var dateBefore;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            dailyOperationManager = new DailyOperationManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var dailyOperation = {
    "_id": { "machineName": "Mesin" },
    "totalBadOutput": 1,
    "totalGoodOutput": 2,
}
var reportData = [dailyOperation, dailyOperation];
it("#01. should success when sum data", function (done) {
    dailyOperationManager.sumDaily(reportData)
    done();
});


// it("#02. should success when create data", function (done) {
//     dataUtil.getNewTestData("output")
//         .then((id) => {
//             done(id)
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

