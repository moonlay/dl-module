"use strict";
var helper = require("../../helper");
var PurchaseRequestManager = require("../../../src/managers/purchasing/purchase-request-manager");
var codeGenerator = require("../../../src/utils/code-generator");

var unit = require("../master/unit-data-util");
var category = require("../master/category-data-util");
var product = require("../master/product-data-util");
var budget = require("../master/budget-data-util");

class PurchaseRequestDataUtil {
    getNewData() {
        return Promise.all([unit.getTestData(), category.getTestData(), product.getTestData(), product.getTestData2(), budget.getTestData()])
            .then((results) => {
                var unit = results[0];
                var category = results[1];
                var product01 = results[2];
                var product02 = results[3];
                var budget = results[4];

                var data = {
                    no: `UT/PR/${codeGenerator()}`,
                    date: new Date(),
                    expectedDeliveryDate: new Date(),
                    budgetId: budget._id,
                    budget: budget,
                    unitId: unit._id,
                    unit: unit,
                    categoryId: category._id,
                    category: category,
                    internal: false,

                    isPosted: false,
                    remark: "Unit Test",
                    items: [{
                        productId: product01._id,
                        product: product01,
                        quantity: 10,
                        uom: product01.uom,
                        remark: ""
                    }, {
                        productId: product02._id,
                        product: product02,
                        quantity: 20,
                        uom: product02.uom,
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

    getNewTestData2() {
        return helper
            .getManager(PurchaseRequestManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    data.internal = true;
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

    getPostedData() {
        return this.getNewTestData()
            .then((pr) => {
                return helper
                    .getManager(PurchaseRequestManager)
                    .then((prManager) => {
                        return prManager.post([pr])
                            .then((prs) => {
                                var id = prs[0]._id;
                                return prManager.getSingleById(id);
                            });
                    });
            });
    }
}

module.exports = new PurchaseRequestDataUtil();
