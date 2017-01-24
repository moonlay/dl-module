'use strict'
var helper = require('../../helper');
var PurchaseOrderManager = require('../../../src/managers/purchasing/purchase-order-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var unit = require('../master/unit-data-util');
var vat = require('../master/vat-data-util');
var category = require('../master/category-data-util');
var PurchaseRequest = require('./purchase-request-data-util');
var product = require('../master/product-data-util');
var DLModels = require('dl-models');
var Currency = DLModels.master.Currency;
var Buyer = DLModels.master.Buyer;
var Supplier = DLModels.master.Supplier;

class PurchaseOrderDataUtil {
    getNewData(pr) {
        var getPr = pr ? Promise.resolve(pr) : PurchaseRequest.getPostedData();

        return helper
            .getManager(PurchaseOrderManager)
            .then(manager => {
                return Promise.all([getPr]) //, unit.getTestData(), category.getTestData(), vat.getTestData(), product.getTestData()])
                    .then(results => {
                        var purchaseRequest = results[0];
                        // var unit = results[1];
                        // var category = results[2];
                        // var vat = results[3];
                        // var product = results[4];

                        var poItems = purchaseRequest.items.map(prItem => {
                            return {
                                productId:prItem.productId,
                                product: prItem.product,
                                defaultQuantity: prItem.quantity,
                                defaultUom: prItem.uom
                                    // dealQuantity: 0,
                                    // dealUom: product.uom,
                                    // realizationQuantity: 0,
                                    // pricePerDealUnit: 500,
                                    // currency: new Currency(),
                                    // currencyRate: 1,
                                    // conversion: 1,
                                    // isClosed: false,
                                    // remark: '',
                                    // fulfillments: []
                            };
                        });

                        var data = {
                            no: `UT/PO/${codeGenerator()}`,
                            refNo: purchaseRequest.no,
                            iso: 'FM-6.00-06-005',
                            realizationOrderId: {},
                            realizationOrder: {},
                            purchaseRequestId: purchaseRequest._id,
                            purchaseRequest: purchaseRequest,
                            buyerId: {},
                            buyer: new Buyer(),
                            purchaseOrderExternalId: {},
                            purchaseOrderExternal: {},
                            sourcePurchaseOrderId: null,
                            sourcePurchaseOrder: null,
                            supplierId: {},
                            supplier: new Supplier(),
                            unitId: purchaseRequest.unit._id,
                            unit: purchaseRequest.unit,
                            categoryId: purchaseRequest.category._id,
                            category: purchaseRequest.category,

                            vat: purchaseRequest.vat,
                            useVat: false,
                            vatRate: 0,
                            useIncomeTax: false,
                            date: new Date(),
                            expectedDeliveryDate: new Date(),
                            actualDeliveryDate: new Date(),
                            isPosted: false,
                            isClosed: false,
                            remark: 'Unit Test PO Internal',

                            items: poItems
                        };
                        return Promise.resolve(data);
                    });
            });
    }

    getNewTestData() {
        return helper
            .getManager(PurchaseOrderManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}

module.exports = new PurchaseOrderDataUtil();
