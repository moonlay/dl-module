"use strict";
var helper = require("../../helper");
var PurchaseRequestManager = require("../../../src/managers/garment-purchasing/purchase-request-manager");
var codeGenerator = require("../../../src/utils/code-generator");

var buyer = require("../master/garment-buyer-data-util");
var unit = require("../master/unit-data-util");
var category = require("../master/garment-category-data-util");
var product = require("../master/garment-product-data-util");
var uom = require("../master/uom-data-util");

class PurchaseRequestDataUtil {
    getNewData() {
        return Promise.all([unit.getTestData(), category.getTestData(), product.getTestData(), product.getTestData2(), uom.getTestData(), buyer.getTestData()])
            .then((results) => {
                var unit = results[0];
                var category = results[1];
                var product01 = results[2];
                var product02 = results[3];
                var uom = results[4];
                var buyer = results[5];

                var data = {
                    no: `UT/PR/GARMENT${codeGenerator()}`,
                    roNo: `UT/RO/PR/GARMENT${codeGenerator()}`,
                    buyerId: buyer._id,
                    buyer: buyer,
                    artikel: "UT/ARTIKEL1",
                    date: new Date(),
                    expectedDeliveryDate: new Date(),
                    shipmentDate: new Date(),
                    unitId: unit._id,
                    unit: unit,
                    isPosted: true,
                    isUsed: false,

                    remark: "Unit Test",
                    items: [{
                        refNo: "UT/PR/GARMENT/01",
                        id_po: `UT/PR/IDPO/01${codeGenerator("UT/PR/IDPO/01")}`,
                        productId: product01._id,
                        product: product01,
                        quantity: 10,
                        budgetPrice: 10000,
                        uom: uom,
                        categoryId: category._id,
                        category: category,
                        isUsed: false,
                        purchaseOrderIds: [],
                        colors:["WHITE","BLACK"],
                        remark: ""
                    }, {
                        refNo: "UT/PR/GARMENT/02",
                        id_po: `UT/PR/IDPO/02${codeGenerator("UT/PR/IDPO/02")}`,
                        productId: product02._id,
                        product: product02,
                        quantity: 20,
                        budgetPrice: 20000,
                        uom: uom,
                        categoryId: category._id,
                        category: category,
                        isUsed: false,
                        purchaseOrderIds: [],
                        colors:["WHITE","BLACK"],
                        remark: ""
                    }]
                };
                return Promise.resolve(data);
            });
    }

    getNewTestData() {
        return helper
            .getManager(PurchaseRequestManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}

module.exports = new PurchaseRequestDataUtil();
