require("should");
var KanbanDataUtil = require('../../../data-util/production/finishing-printing/kanban-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.kanban;
var moment = require('moment');

var KanbanManager = require("../../../../src/managers/production/finishing-printing/kanban-manager");
var kanbanManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            kanbanManager = new KanbanManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function (done) {
    kanbanManager.create({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('productionOrder');
                e.errors.should.have.property('selectedProductionOrderDetail');
                e.errors.should.have.property('cart');
                e.errors.should.have.property('instruction');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});


it('#02. should error when create new data with non existent productionOrder, instruction', function (done) {
    KanbanDataUtil.getNewData()
        .then(kanban => {

            kanban.productionOrderId = 'randomId';
            kanban.instructionId = 'randomId';

            kanbanManager.create(kanban)
                .then(id => {
                    done("should error when create new data with non existent productionOrder, instruction");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('productionOrder');
                        e.errors.should.have.property('instruction');
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

it('#03. should error when create new data with overlimit qty', function (done) {
    KanbanDataUtil.getNewData()
        .then(kanban => {

            kanban.cart.qty = kanban.selectedProductionOrderDetail.quantity + 1;

            kanbanManager.create(kanban)
                .then(id => {
                    done("should error when create new data with overlimit qty");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('cart');
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