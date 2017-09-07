'use strict'
var helper = require('../../helper');
var PurchaseOrderManager = require('../../../src/managers/garment-purchasing/purchase-order-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var PurchaseRequest = require('./purchase-request-data-util');
var DLModels = require('dl-models');

class PurchaseOrderDataUtil {
    getNewData(pr) {
        var getPr = pr ? Promise.resolve(pr) : PurchaseRequest.getNewTestData();

        return helper
            .getManager(PurchaseOrderManager)
            .then(manager => {
                return Promise.all([getPr])
                    .then(results => {
                        var purchaseRequest = results[0];

                        var poItems = purchaseRequest.items.map(prItem => {
                            return {
                                refNo: prItem.refNo,
                                productId: prItem.productId,
                                product: prItem.product,
                                defaultQuantity: prItem.quantity,
                                budgetPrice: prItem.budgetPrice,
                                defaultUom: prItem.uom,
                                categoryId: prItem.categoryId,
                                category: prItem.category,
                                vat: purchaseRequest.vat,
                                id_po: prItem.id_po
                            };
                        });

                        var data = {
                            no: `UT/PO/${codeGenerator()}`,
                            refNo: purchaseRequest.no,
                            iso: 'FM-6.00-06-005',
                            purchaseRequestId: purchaseRequest._id,
                            purchaseRequest: purchaseRequest,
                            buyerId: purchaseRequest.buyerId,
                            buyer: purchaseRequest.buyer,
                            artikel: purchaseRequest.artikel,
                            unitId: purchaseRequest.unit._id,
                            unit: purchaseRequest.unit,
                            date:purchaseRequest.date,
                            expectedDeliveryDate:purchaseRequest.expectedDeliveryDate,
                            actualDeliveryDate: new Date(),
                            shipmentDate: purchaseRequest.shipmentDate,
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