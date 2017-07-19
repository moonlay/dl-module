"use strict";
var helper = require("../../helper");
var PurchaseRequestManager = require("../../../src/managers/garment-purchasing/purchase-request-manager");
var codeGenerator = require("../../../src/utils/code-generator");

var buyer = require("../master/buyer-data-util");
var unit = require("../master/unit-data-util");
var category = require("../master/category-data-util");
var product = require("../master/garment-product-data-util");
var budget = require("../master/budget-data-util");
var uom = require("../master/uom-data-util");

class PurchaseRequestDataUtil {
    getNewData() {
        return Promise.all([unit.getTestData(), category.getTestData(), product.getTestData(), product.getTestData2(), budget.getTestData(), uom.getTestData(), buyer.getTestData()])
            .then((results) => {
                var unit = results[0];
                var category = results[1];
                var product01 = results[2];
                var product02 = results[3];
                var budget = results[4];
                var uom = results[5];
                var buyer = results[6];

                var data = {
                    no: `UT/PR/GARMENT${codeGenerator()}`,
                    refNo: "UT/PR/GARMENT",
                    roNo: "UT/RO/PR/GARMENT",
                    buyerId: buyer._id,
                    buyer: buyer,
                    artikel: "UT/ARTIKEL1",
                    date: new Date(),
                    expectedDeliveryDate: new Date(),
                    shipmentDate: new Date(),
                    unitId: unit._id,
                    unit: unit,
                    isPosted: true,

                    remark: "Unit Test",
                    items: [{
                        productId: product01._id,
                        product: product01,
                        quantity: 10,
                        budgetPrice: 10000,
                        categoryId: category._id,
                        category: category,
                        remark: ""
                    }, {
                            productId: product02._id,
                            product: product02,
                            quantity: 20,
                            budgetPrice: 20000,
                            categoryId: category._id,
                            category: category,
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
