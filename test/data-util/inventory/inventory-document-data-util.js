'use strict'
var helper = require("../../helper");
var InventoryDocumentManager = require("../../../src/managers/inventory/inventory-document-manager");
var productDataUtil = require('../master/product-data-util');
var storageDataUtil = require('../master/storage-data-util');
var uomDataUtil = require('../master/uom-data-util');

var codeGenerator = require('../../../src/utils/code-generator');

var Models = require("dl-models");
var Map = Models.map;
var InventoryMovementModel = Models.inventory.InventoryMovement;


class InventoryDocumentDataUtil {
    getNewData() {
        return Promise.all([productDataUtil.getTestData(), productDataUtil.getTestData2(), storageDataUtil.getTestData(), uomDataUtil.getTestData(), uomDataUtil.getSecondTestData(), uomDataUtil.getThirdTestData()])
            .then(result => {
                var product = result[0];
                var product2 = result[1];
                var storage = result[2];
                var uom = result[3];
                var secondUom = result[4];
                var thirdUom = result[5];

                var code = codeGenerator()
                var data = {
                    code: code,
                    referenceNo: `RFNO-${code}`,
                    referenceType: 'unit-test-doc',
                    type: "IN",
                    date: new Date(),
                    storageId: storage._id,
                    items: [{
                        productId: product._id,
                        quantity: 1000,
                        uomId: uom._id,
                        secondUomId: secondUom._id,
                        secondQuantity: 5000,
                        thirdUomId: thirdUom._id,
                        thirdQuantity: 10000
                    }, {
                        productId: product2._id,
                        quantity: 2000,
                        uomId: uom._id,
                        secondUomId: secondUom._id,
                        secondQuantity: 6000,
                        thirdUomId: thirdUom._id,
                        thirdQuantity: 11000
                    }]
                };

                return data;
            })
    }

    getNewTestData() {
        return helper
            .getManager(InventoryDocumentManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }

    getPackingNewData() {
        return Promise.all([productDataUtil.getTestData(), storageDataUtil.getPackingTestData(), uomDataUtil.getTestData()])
            .then(result => {
                var product = result[0];
                var storage = result[1];
                var uom = result[2];

                var code = codeGenerator()
                var data = {
                    code: code,
                    referenceNo: `RFNO-${code}`,
                    referenceType: 'unit-test-doc',
                    type: "IN",
                    date: new Date(),
                    storageId: storage._id,
                    items: [{
                        productId: product._id,
                        quantity: 1000,
                        uomId: uom._id
                    }]
                };

                return data;
            });
    }

     getPackingNewTestData() {
        return helper
            .getManager(InventoryDocumentManager)
            .then((manager) => {
                return this.getPackingNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }
}
module.exports = new InventoryDocumentDataUtil();
