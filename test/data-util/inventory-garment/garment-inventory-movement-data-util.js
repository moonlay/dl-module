'use strict'
var helper = require("../../helper");
var GarmentInventoryMovementManager = require("../../../src/managers/inventory-garment/garment-inventory-movement-manager");
var productDataUtil = require('../master/garment-product-data-util');
var storageDataUtil = require('../master/storage-data-util');
var uomDataUtil = require('../master/uom-data-util');

var codeGenerator = require('../../../src/utils/code-generator');

var Models = require("dl-models");
var Map = Models.map;
var GarmentInventoryMovementModel = Models.garmentInventory.GarmentInventoryMovement;


class GarmentInventoryMovementDataUtil {
    getNewData() {
        return Promise.all([productDataUtil.getTestData(), storageDataUtil.getTestData(), uomDataUtil.getTestData()])
            .then(result => {
                var product = result[0];
                var storage = result[1];
                var uom = result[2];
                var code =codeGenerator() 
                var data = {
                    code: code,
                    referenceNo:`RFNO-${code}`,
                    referenceType:'unit-test-doc',
                    date:new Date(),
                    productId: product._id,
                    storageId: storage._id,
                    uomId: uom._id,
                    quantity: 1000 
                };

                return data;
            })
    }

    getNewTestData() {
        return helper
            .getManager(GarmentInventoryMovementManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                            return manager.getSingleById(id)
                        });
                });
            });
    }
}
module.exports = new GarmentInventoryMovementDataUtil();
