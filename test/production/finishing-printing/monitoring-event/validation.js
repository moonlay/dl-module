require("should");
var MonitoringEvent = require('../../../data-util/production/finishing-printing/monitoring-event-data-util');
var helper = require("../../../helper");
var validate = require("dl-models").validator.production.finishingPrinting.monitoringEvent;
var moment = require('moment');

var MonitoringEventManager = require("../../../../src/managers/production/finishing-printing/monitoring-event-manager");
var monitoringEventManager = null;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            monitoringEventManager = new MonitoringEventManager(db, {
                username: 'dev'
            });
            done();
        })
        .catch(e => {
            done(e);
        });
});

it('#01. should error when create with empty data ', function (done) {
    monitoringEventManager.create({})
        .then(id => {
            done("should error when create with empty data");
        })
        .catch(e => {
            try {
                e.errors.should.have.property('dateStart'); 
                e.errors.should.have.property('machine');
                e.errors.should.have.property('productionOrder');
                e.errors.should.have.property('selectedProductionOrderDetail');
                e.errors.should.have.property('cartNumber');
                e.errors.should.have.property('machineEvent');
                done();
            }
            catch (ex) {
                done(ex);
            }
        });
});

it('#02. should error when create new data with dateStart greater than today', function (done) {
    MonitoringEvent.getNewData()
        .then(me => {
            var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
            
            me.dateStart = moment(dateTomorrow).format('YYYY-MM-DD');

            monitoringEventManager.create(me)
                .then(id => {
                    done("should error when create new data with dateStart greater than today");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('dateStart');
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
 

it('#04. should error when create new data with dateEnd greater than today', function (done) {
    MonitoringEvent.getNewData()
        .then(me => {
            var dateTomorrow = new Date().setDate(new Date().getDate() + 1);
            
            me.dateEnd = moment(dateTomorrow).format('YYYY-MM-DD');

            monitoringEventManager.create(me)
                .then(id => {
                    done("should error when create new data with dateEnd greater than today");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('dateEnd');
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
 

it('#06. should error when create new data with dateStart greater than dateEnd', function (done) {
    MonitoringEvent.getNewData()
        .then(me => {
            me.dateStart = '2017-02-02';
            me.dateEnd = '2017-01-01';

            monitoringEventManager.create(me)
                .then(id => {
                    done("should error when create new data with dateStart greater than dateEnd");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('dateStart');
                        e.errors.should.have.property('dateEnd');
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
   

it('#10. should success when create new data without both dateEnd and timeEnd', function (done) {
    MonitoringEvent.getNewData()
        .then(me => {
            delete me.dateEnd;
            delete me.timeInMillisEnd;

            monitoringEventManager.create(me)
                .then(id => {
                    done();
                })
                .catch(e => {
                    done(e);
                });
        })
        .catch(e => {
            done(e);
        });
});

it('#11. should success when get Query', function (done) {
    var paging = {};
    paging.keyword = '123';
    var query = monitoringEventManager._getQuery(paging)
    try {
        query.should.have.property('$and');
        query['$and'].should.instanceof(Array)
        query['$and'].length.should.not.equal(0);
        done();
    }
    catch (ex) {
        done(ex);
    }
});

