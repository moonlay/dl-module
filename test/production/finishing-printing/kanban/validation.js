require("should");
var KanbanDataUtil = require('../../../data-util/production/finishing-printing/kanban-data-util');
var SppDataUtil = require('../../../data-util/sales/production-order-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.kanban;
var moment = require('moment');

var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var UomManager = require("../../../../src/managers/master/uom-manager");
var SppManager = require("../../../../src/managers/sales/production-order-manager");
var kanbanManager = null;
var uomManager = null;
var sppManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            kanbanManager = new KanbanManager(db, {
                username: 'dev'
            });
            uomManager = new UomManager(db, {
                username: 'dev'
            });
            sppManager = new SppManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

var uom;
it('#01. should success when create data "MTR" on uom', function (done) {
    uomManager.getSingleByQueryOrDefault({"unit" : "MTR"})
        .then(result => {
            if(result){
                uom = result;
                done();
            }else{
                uomManager.create({"unit" : "MTR"})
                    .then(id => {
                        uomManager.getSingleById(id)
                            .then(data=>{
                                uom = data;
                                done();
                            })
                            .catch(e => {
                                done(e);
                            });
                    })
                    .catch(e => {
                        done(e);
                    });
            }
        })
        .catch(e => {
            done(e);
        });
});

var productionOrder;
it('#02. should success when create data production order with "MTR" uom', function (done) {
    SppDataUtil.getNewData()
        .then(data => {
            data.uom = uom;
            data.uomId = uom._id;
            var detail = [];
            for(var a of data.details){
                a.uom = uom;
                a.uomId = uom._id;
                detail.push(a);
            }
            data.details = detail;
            sppManager.create(data)
                .then(id => {
                    sppManager.getSingleById(id)
                        .then(production => {
                            productionOrder = production;
                            done();
                        })
                        .catch(e => {
                            done(e);
                        });
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#03. should error when create with empty data ', function (done) {
    kanbanManager.create({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('productionOrder');
                e.errors.should.have.property('selectedProductionOrderDetail');
                e.errors.should.have.property('cart');
                e.errors.should.have.property('grade');
                e.errors.should.have.property('instruction');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});


it('#04. should error when create new data with non existent productionOrder, instruction', function (done) {
    KanbanDataUtil.getNewData()
        .then(kanban => {

            kanban.productionOrderId = 'randomId';
            // kanban.instructionId = 'randomId';

            kanbanManager.create(kanban)
                .then(id => {
                    done("should error when create new data with non existent productionOrder, instruction");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('productionOrder');
                        // e.errors.should.have.property('instruction');
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#05. should error when create new data with empty step', function (done) {
    KanbanDataUtil.getNewData()
        .then(kanban => {
            kanban.instruction.steps.push({ process: "" });

            kanbanManager.create(kanban)
                .then(id => {
                    done("should error when create new data with empty step");
                })
                .catch(e => {
                    try {
                        e.name.should.equal("ValidationError");
                        e.should.have.property('errors');
                        e.errors.should.instanceof(Object);
                        done();
                    }
                    catch (ex) {
                        done(ex);
                    }
                });
        })
        .catch(e => {
            done(e);
        });
});

var kanbanId;
it('#06. should success when create new data with old kanban id', function (done) {   
    KanbanDataUtil.getNewData()
            .then((data) => {
                kanban = data;
                kanbanManager.create(data)
                    .then((id) => {
                        kanban.oldKanbanId = id;
                        kanban.oldKanban = kanban;
                        
                        kanbanManager.create(kanban)
                            .then((id) => {
                                kanbanId = id;
                                id.should.be.Object();
                                done();
                            })
                    })
            })
            .catch((e) => {
                done(e);
            });
});

it('#07. should success when update IsComplete to true', function (done) {
    var isInactive = true;
    kanbanManager.updateIsComplete(kanbanId.toString(), isInactive)
        .then((id) => {
            kanbanManager.getSingleById(kanbanId.toString())
                .then((data) => {
                    data.isComplete.should.equal(true);
                    done();
                })
        })
        .catch((e) => {
            done(e);
        });
});

// it('#05. should error when create new data with overlimit qty and uom non "MTR"', function (done) {
//     KanbanDataUtil.getNewData()
//         .then(kanban => {

//             kanban.cart.qty = kanban.selectedProductionOrderDetail.quantity + 5;

//             kanbanManager.create(kanban)
//                 .then(id => {
//                     done('should error when create new data with overlimit qty and uom non "MTR"');
//                 })
//                 .catch(e => {
//                     try {
//                         e.errors.should.have.property('cart');
//                         done();
//                     }
//                     catch (ex) {
//                         done(ex);
//                     }
//                 });
//         })
//         .catch(e => {
//             done(e);
//         });
// });

// it('#06. should error when create new data with overlimit qty and "MTR" uom', function (done) {
//     KanbanDataUtil.getNewData()
//         .then(kanban => {
//             kanban.productionOrder = productionOrder;
//             kanban.productionOrderId = productionOrder._id;
//             var detail = {};
//             for(var a of productionOrder.details){
//                 detail = a;
//             }
//             kanban.selectedProductionOrderDetail = detail;
//             kanban.cart.qty = kanban.selectedProductionOrderDetail.quantity + 5;
//             kanbanManager.create(kanban)
//                 .then(id => {
//                     done('should error when create new data with overlimit qty and "MTR" uom');
//                 })
//                 .catch(e => {
//                     try {
//                         e.errors.should.have.property('cart');
//                         done();
//                     }
//                     catch (ex) {
//                         done(ex);
//                     }
//                 });
//         })
//         .catch(e => {
//             done(e);
//         });
// });

/* Lepas validasi ini karena tambah flow reprocess */
// it('#05. should error when set isComplete true with incomplete steps', function (done) {
//     KanbanDataUtil.getNewData()
//         .then(kanban => {
//             kanbanManager.create(kanban)
//                 .then(id => {
//                     kanbanManager.getSingleById(id)
//                         .then(toBeCompletedKanban =>{
//                             toBeCompletedKanban.isComplete = true;
//                             toBeCompletedKanban.currentStepIndex = toBeCompletedKanban.instruction.steps.length - 1;
//                             kanbanManager.update(toBeCompletedKanban)
//                                 .then(completeKanbanId => {
//                                     done("should error when set isComplete true with incomplete steps");
//                                 })
//                                 .catch(e =>{
//                                     e.errors.should.have.property('isComplete');
//                                     done();
//                                 });
//                         })
//                         .catch(e => {
//                             done(e);
//                         });
//                 })
//                 .catch(e => {
//                     done(e);
//                 });
//         })
//         .catch(e => {
//             done(e);
//         });
// });