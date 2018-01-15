'use strict';
var should = require('should');
var helper = require("../../helper");
var Manager = require("../../../src/managers/inventory/inventory-movement-manager");
var manager = null;
var dataUtil = require("../../data-util/inventory/inventory-movement-data-util");
var validate = require("dl-models").validator.inventory.inventoryMovement;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            manager = new Manager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#01. should error when create new data without productId, storageId', function (done) {
    dataUtil.getNewData()
        .then(data => {
            
            data.storageId=null;
            data.productId=null;
            //data.uomId=null;
            //data.referenceNo="";
            //data.referenceType="";

            manager.create(data)
                .then(id => {
                    done("should error when create new data without productId,  storageId");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('storageId');
                        e.errors.should.have.property('productId');
                        //e.errors.should.have.property('uomId');
                        //e.errors.should.have.property('referenceType');
                        //e.errors.should.have.property('referenceNo');
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

it('#02. should error when create new data without referenceNo, referenceType', function (done) {
    dataUtil.getNewData()
        .then(data => {
            
            
            data.referenceNo="";
            data.referenceType="";

            manager.create(data)
                .then(id => {
                    done("should error when create new data without referenceNo,  referenceType");
                })
                .catch(e => {
                    try {
                        
                        e.errors.should.have.property('referenceType');
                        e.errors.should.have.property('referenceNo');
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
