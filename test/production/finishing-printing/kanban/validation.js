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
                e.errors.should.have.property('color');
                e.errors.should.have.property('instruction');
                e.errors.should.have.property('steps');
                e.errors.should.have.property('partitions');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it('#02. should error when create new data with no document production order', function (done) {
    KanbanDataUtil.getNewData()
        .then(me => {
            me.productionOrderId = '';
            kanbanManager.create(me)
                            .then(data => {
                                done("should error when create new data with no document production order");
                            })
                            .catch(e => {
                                try {
                                    e.errors.should.have.property('productionOrder');
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

it('#03. should error when create new data with no document instruction', function (done) {
    KanbanDataUtil.getNewData()
        .then(me => {
            me.instructionId = '';
            kanbanManager.create(me)
                            .then(data => {
                                done("should error when create new data with no document instruction");
                            })
                            .catch(e => {
                                try {
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

it('#04. should error when create new data with same partition no', function (done) {
    KanbanDataUtil.getNewData()
        .then(me => {
            var data = [];
            for(var a of me.partitions){
                a.no = 'partition';
                data.push(a);
            }
            me.partitions = data;
            kanbanManager.create(me)
                            .then(data => {
                                done("should error when create new data with same partition no");
                            })
                            .catch(e => {
                                try {
                                    e.errors.should.have.property('partitions');
                                    if(e.errors.partitions){
                                        for(var detail of e.errors.partitions){
                                            detail.should.have.property('no');
                                        }
                                    }
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

it('#05. should error when create new data with partition no number or fabric length is 0', function (done) {
    KanbanDataUtil.getNewData()
        .then(me => {
            var data = {};
            for(var a of me.partitions){
                data = a.uom;
            }
            me.partitions.push({
                no : '',
                lengthFabric : 0,
                uomId : data._id,
                uom : data,
                reference : ''
            });
            kanbanManager.create(me)
                            .then(data => {
                                done("should error when create new data with same partition no");
                            })
                            .catch(e => {
                                try {
                                    e.errors.should.have.property('partitions');
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

it('#06. should error when duplicate data', function (done) {
    KanbanDataUtil.getNewData()
        .then(me => {
            kanbanManager.create(me)
                            .then(data => {
                                kanbanManager.create(me)
                                                .then(data1 => {
                                                    done("should error when duplicate data");
                                                })
                                                .catch(e => {
                                                    try {
                                                        e.errors.should.have.property('productionOrder');
                                                        e.errors.should.have.property('color');
                                                        kanbanManager.destroy(data)
                                                                        .then(des =>{
                                                                            done();
                                                                        })
                                                                        .catch(e => {
                                                                            done(e);
                                                                        });
                                                    }
                                                    catch (ex) {
                                                        done(ex);
                                                    }
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