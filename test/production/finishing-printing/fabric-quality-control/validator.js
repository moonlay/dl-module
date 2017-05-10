require("should");
var dataUtil = require("../../../data-util/production/finishing-printing/fabric-quality-control-data-util");
var helper = require("../../../helper");
var moment = require('moment');

var FabricQualityControlManager = require("../../../../src/managers/production/finishing-printing/fabric-quality-control-manager");
var fabricQualityControlManager;

before('#00. connect db', function(done) {
    helper.getDb()
        .then(db => {
            fabricQualityControlManager = new FabricQualityControlManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it("#01. should error when create new data with invalid kanban", function(done) {
    dataUtil.getNewData()
        .then((data) => {
            data.kanbanId = "test";
            fabricQualityControlManager.create(data)
                .then((kanban) => {
                    done("should error when create new data with no document kanban on collection database");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('kanbanId');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch((e) => {
            done(e);
        });
});

it("#02. should error when create 4 point system data with no point limit", function(done) {
    dataUtil.getNewData()
        .then((data) => {
            data.pointSystem = 4;
            fabricQualityControlManager.create(data)
                .then((data) => {
                    done("should error when create new data with no document kanban on collection database");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('pointLimit');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch((e) => {
            done(e);
        });
});

// it("#02. should error when create new data with date greater than today", function(done) {
//     dataUtil.getNewData()
//         .then(data => {
//             var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
//             data.date = moment(dateTomorrow).format('YYYY-MM-DD');
//             inspectionLotColorManager.create(data)
//                 .then(lotColor => {
//                     done("should error when create new data with date greater than today");
//                 })
//                 .catch((e) => {
//                     try {
//                         e.errors.should.have.property('date');
//                         done();
//                     }
//                     catch (ex) {
//                         done(ex);
//                     }
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

// it("#03. should error when create new data with items without Pcs No, Lot and status", function(done) {
//     dataUtil.getNewData()
//         .then(data => {
//             data.items = [
//                 pcsNo = '',
//                 lot = '',
//                 status = ''
//             ]
//             inspectionLotColorManager.create(data)
//                 .then(lotColor => {
//                     done("should error when create new data with date greater than today");
//                 })
//                 .catch((e) => {
//                     try {
//                         e.errors.should.have.property('items');
//                         for(var a of e.errors.items){
//                             a.should.have.property('pcsNo');
//                             a.should.have.property('lot');
//                             a.should.have.property('status');
//                         }
//                         done();
//                     }
//                     catch (ex) {
//                         done(ex);
//                     }
//                 });
//         })
//         .catch((e) => {
//             done(e);
//         });
// });