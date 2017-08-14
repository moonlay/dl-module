'use strict'
var helper = require('../../helper');
var InvoiceNoteManager = require('../../../src/managers/garment-purchasing/invoice-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');

var supplierDataUtil = require('../master/garment-supplier-data-util');
var currencyDataUtil = require('../master/currency-data-util');
var vatDataUtil = require('../master/vat-data-util');
var deliveryOderDataUtil = require('../garment-purchasing/delivery-order-data-util');

class InvoiceNoteDataUtil {
    getNewData() {
        return helper
            .getManager(InvoiceNoteManager)
            .then(manager => {
                return Promise.all([supplierDataUtil.getTestData(), currencyDataUtil.getTestData(), vatDataUtil.getTestData(), deliveryOderDataUtil.getNewTestData()])
                    .then(results => {
                        var dataSupplier = results[0];
                        var dataCurrency = results[1];
                        var dataVat = results[2];
                        var deliveryOder = results[3];
                        var items = deliveryOder.items.map(doItem => {
                            var fulfillment = doItem.fulfillments.map(doFulfillment => {
                                return {
                                    purchaseOrderExternalId: doItem.purchaseOrderExternalId,
                                    purchaseOrderExternalNo: doItem.purchaseOrderExternalNo,
                                    purchaseOrderId: doFulfillment.purchaseOrderId,
                                    purchaseOrderNo: doFulfillment.purchaseOrderNo,
                                    purchaseRequestId: doFulfillment.purchaseRequestId,
                                    purchaseRequestNo: doFulfillment.purchaseRequestNo,
                                    productId: doFulfillment.productId,
                                    product: doFulfillment.product,
                                    purchaseOrderQuantity: doFulfillment.purchaseOrderQuantity,
                                    purchaseOrderUom: doFulfillment.purchaseOrderUom,
                                    deliveredQuantity: doFulfillment.deliveredQuantity
                                }
                            });
                            fulfillment = [].concat.apply([], fulfillment);
                            return fulfillment;
                        });

                        items = [].concat.apply([], items);
                        var invoiceNoteItem = {
                            deliveryOrderId: deliveryOder._id,
                            deliveryOrderNo: deliveryOder.no,
                            items: items
                        }

                        var data = {
                            no: `UT/IN/${codeGenerator()}`,
                            date: new Date(),
                            supplierId: dataSupplier._id,
                            supplier: dataSupplier,
                            currency: dataCurrency,
                            useIncomeTax: true,
                            incomeTaxNo: `UT/PPN/${codeGenerator()}`,
                            incomeTaxDate: new Date(),
                            vatNo: `UT/PPH/${codeGenerator()}`,
                            vatDate: new Date(),
                            useVat: true,
                            vat: dataVat,
                            isPayTax: false,
                            remark: 'Unit Test Invoice Note',
                            items: invoiceNoteItem
                        };
                        return Promise.resolve(data);
                    });
            })
    }

    getNewTestData() {
        return helper
            .getManager(InvoiceNoteManager)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

}

module.exports = new InvoiceNoteDataUtil();
