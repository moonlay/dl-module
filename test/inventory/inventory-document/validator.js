'use strict';
var should = require('should');
var helper = require("../../helper");
var InventoryDocumentManager = require("../../../src/managers/inventory/inventory-document-manager");
var inventoryDocumentManager = null;

var inventoryDocumentDataUtil = require("../../data-util/inventory/inventory-document-data-util");
var uomDataUtil = require("../../data-util/master/uom-data-util");

var validate = require("dl-models").validator.inventory.inventoryDocument;
var validateUom = require("dl-models").validator.master.uom;

before('#00. connect db', function (done) {
    helper.getDb()
        .then((db) => {
            inventoryDocumentManager = new InventoryDocumentManager(db, {
                username: 'unit-test'
            });
            done();
        })
        .catch((e) => {
            done(e);
        })
});

it('#01. should error when create new data without productId, uomId, quantity = 0', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[0].quantity = 0;
            data.items[0].productId = {};
            data.items[0].uomId = {};

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data without productId, uomId, quantity = 0");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it('#02. should error when create new data with duplicate uom', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[1].uomId = data.items[0].uomId
            data.items[1].secondUomId = data.items[0].uomId
            data.items[1].thirdUomId = data.items[0].uomId

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error create new data with duplicate uom");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it('#03. should error when create new data with non exist storage id', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.storageId = data.items[0].uomId;

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data with non exist storage id");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('storageId');
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

it('#04. should error when create new data no productId', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[0].productId = {};

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data no productId");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it('#05. should error when create new data with no uomId', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[0].uomId = {};

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data with no uomId");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it('#06. should error when create new data with duplicate productId', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[1].productId = data.items[0].productId;

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data with duplicate productId");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it('#07. should error when create new data with zero first quantity', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[1].quantity = 0;

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data with zero first quantity");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it('#08. should error when create new data with empty secondUom but exist thirdUom', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then(data => {

            data.items[1].secondUomId = {};

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data with empty secondUom but exist thirdUom");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it('#09. should error when create new data with uom but zero quantity', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[1].secondQuantity = 0;
            data.items[1].thirdQuantity = 0;

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data with empty secondUom but exist thirdUom");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it("#10. should success when drop all inventory data", function (done) {
    Promise.all([inventoryDocumentManager.collection.drop(), inventoryDocumentManager.inventoryMovementManager.collection.drop(), inventoryDocumentManager.inventorySummaryManager.collection.drop()])
        .then((results) => {
            results.should.be.Array();
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdData;
it("#11. should success when create new data using status IN", function (done) {
    inventoryDocumentDataUtil.getNewTestData()
        .then((data) => {
            data.should.instanceof(Object);
            validate(data);
            createdData = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it("#12. should success when search with keyword", function (done) {
    inventoryDocumentManager.read({ keyword: "test" })
        .then((result) => {
            result.should.have.property("data");
            result.data.should.instanceof(Array);
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#13. should error when create new data with empty string productId, uomId, and quantity = 0', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[0].quantity = 0;
            data.items[0].productId = "";
            data.items[0].uomId = "";

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error when create new data with empty string productId, uomId, and quantity = 0");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

it('#14. should error when create new data with exist third uom and empty second uom', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[0].secondUomId = {};

            inventoryDocumentManager.create(data)
                .then(id => {
                    done("should error when create new data with exist third uom and empty second uom");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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

var createdFourthUom;
it("#15. should success when create new data using status IN", function (done) {
    uomDataUtil.getFourthTestData()
        .then((data) => {
            data.should.instanceof(Object);
            validateUom(data);
            createdFourthUom = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdFifthUom;
it("#16. should success when create new data using status IN", function (done) {
    uomDataUtil.getFifthTestData()
        .then((data) => {
            data.should.instanceof(Object);
            validateUom(data);
            createdFourthUom = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

var createdSixthUom;
it("#17. should success when create new data using status IN", function (done) {
    uomDataUtil.getSixthTestData()
        .then((data) => {
            data.should.instanceof(Object);
            validateUom(data);
            createdFourthUom = data;
            done();
        })
        .catch((e) => {
            done(e);
        });
});

it('#18. should error when create new data with non exist uom in summary', function (done) {
    inventoryDocumentDataUtil.getNewData()
        .then((data) => {

            data.items[1].secondUomId = createdFourthUom._id;
            data.items[1].thirdUomId = createdFifthUom._id;

            inventoryDocumentManager.create(data)
                .then((id) => {
                    done("should error create new data with duplicate uom");
                })
                .catch((e) => {
                    try {
                        e.errors.should.have.property('items');
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
