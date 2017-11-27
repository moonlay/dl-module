'use strict';
var should = require('should');
var helper = require("../../helper");
var InventoryDocumentManager = require("../../../src/managers/inventory/inventory-document-manager");
var inventoryDocumentManager = null;
var inventoryDocumentDataUtil = require("../../data-util/inventory/inventory-document-data-util");
var validate = require("dl-models").validator.inventory.inventoryDocument;

before('#00. connect db', function (done) {
    helper.getDb()
        .then(db => {
            inventoryDocumentManager = new InventoryDocumentManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch(e => {
            done(e);
        })
});

it('#01. should error when create new data without productId, uomId, quantity=0', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then(data => {
            
            data.items[0].quantity=0;
            data.items[0].productId={};
            data.items[0].uomId={};

            inventoryDocumentManager.create(data)
                .then(id => {
                    done("should error when create new data without productId, uomId, quantity=0");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('items');
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

it('#02. should error when create new data with duplicate uom', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then(data => {

            data.items[1].uomId = data.items[0].uomId
            data.items[1].secondUomId = data.items[0].uomId
            data.items[1].thirdUomId = data.items[0].uomId

            inventoryDocumentManager.create(data)
                .then(id => {
                    done("should error create new data with duplicate uom");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('items');
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

it('#03. should error when create new data with non exist storage id', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then(data => {

            data.storageId = data.items[0].uomId;

            inventoryDocumentManager.create(data)
                .then(id => {
                    done("should error when create new data with non exist storage id");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('storageId');
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

it('#04. should error when create new data no productId', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then(data => {

            data.items[0].productId = {};

            inventoryDocumentManager.create(data)
                .then(id => {
                    done("should error when create new data no productId");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('items');
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

it('#05. should error when create new data no uomId', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then(data => {

            data.items[0].uomId = {};

            inventoryDocumentManager.create(data)
                .then(id => {
                    done("should error when create new data no uomId");
                })
                .catch(e => {
                    try {
                        e.errors.should.have.property('items');
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

// var createdId;
// it("#03. should success when create new data using status IN", function (done) {
//     inventoryDocumentDataUtil.getNewData()
//         .then((data) => {
//             return inventoryDocumentManager.create(data)
//         })
//         .then((id) => {
//             createdId = id;
//             id.should.be.Object();
//             done();
//         })
//         .catch((e) => {
//             done(e);
//         });
// });

// it('#04. should error when create new data with non first uom in summary', function (done) {
//     inventoryDocumentDataUtil.getNewData()
//         .then(data => {

//             data.items[1].uomId = data.items[0].secondUomId
//             data.items[1].secondUomId = data.items[0].thirdUomId
//             data.items[1].thirdUomId = {};

//             inventoryDocumentManager.create(data)
//                 .then(id => {
//                     done("should error create new data with duplicate uom");
//                 })
//                 .catch(e => {
//                     try {
//                         e.errors.should.have.property('items');
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
