'use strict'
var helper = require('../../helper');
var InvoiceNoteManager = require('../../../src/managers/garment-purchasing/invoice-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');

var vat = require('../master/vat-data-util');
var supplierDataUtil = require('../master/garment-supplier-data-util');
var currencyDataUtil = require('../master/currency-data-util');
var vatDataUtil = require('../master/vat-data-util');
var deliveryOderDataUtil = require('../garment-purchasing/delivery-order-data-util');

class InvoiceNoteDataUtil {
    getNewData(_deliveryOder) {
        return helper
            .getManager(InvoiceNoteManager)
            .then(manager => {
                return Promise.all([_deliveryOder ? _deliveryOder : deliveryOderDataUtil.getNewTestData(), currencyDataUtil.getTestData(), vatDataUtil.getTestData()])
                    .then(results => {
                        var deliveryOder = results[0];
                        var dataCurrency = results[1];
                        var dataVat = results[2];
                        var items = deliveryOder.items.map(doItem => {
                            var fulfillment = doItem.fulfillments.map(doFulfillment => {
                                return {
                                    purchaseOrderExternalId: doItem.purchaseOrderExternalId,
                                    purchaseOrderExternalNo: doItem.purchaseOrderExternalNo,
                                    paymentMethod: doItem.paymentMethod,
                                    paymentType: doItem.paymentType,
                                    paymentDueDays: doItem.paymentDueDays,
                                    purchaseOrderId: doFulfillment.purchaseOrderId,
                                    purchaseOrderNo: doFulfillment.purchaseOrderNo,
                                    purchaseRequestId: doFulfillment.purchaseRequestId,
                                    purchaseRequestNo: doFulfillment.purchaseRequestNo,
                                    purchaseRequestRefNo: doFulfillment.purchaseRequestRefNo,
                                    roNo: doFulfillment.roNo,
                                    productId: doFulfillment.productId,
                                    product: doFulfillment.product,
                                    purchaseOrderQuantity: doFulfillment.purchaseOrderQuantity,
                                    purchaseOrderUom: doFulfillment.purchaseOrderUom,
                                    deliveredQuantity: doFulfillment.deliveredQuantity,
                                    pricePerDealUnit: doFulfillment.pricePerDealUnit
                                }
                            });
                            fulfillment = [].concat.apply([], fulfillment);
                            return fulfillment;
                        });

                        items = [].concat.apply([], items);
                        var invoiceNoteItem = [{
                            deliveryOrderId: deliveryOder._id,
                            deliveryOrderNo: deliveryOder.no,
                            deliveryOrderDate: deliveryOder.date,
                            deliveryOrderSupplierDoDate: deliveryOder.supplierDoDate,
                            items: items
                        }]

                        var data = {
                            no: `UT/IN/${codeGenerator()}`,
                            date: new Date(),
                            supplierId: deliveryOder.supplier._id,
                            supplier: deliveryOder.supplier,
                            currency: dataCurrency,
                            useIncomeTax: true,
                            incomeTaxNo: `UT/PPN/${codeGenerator()}`,
                            incomeTaxDate: new Date(),
                            vatNo: `UT/PPH/${codeGenerator()}`,
                            vatDate: new Date(),
                            useVat: true,
                            vat: dataVat,
                            isPayTax: true,
                            hasInternNote: false,
                            remark: 'Unit Test Invoice Note',
                            items: invoiceNoteItem
                        };
                        return Promise.resolve(data);
                    });
            })
    }

    getNewData2() {
        return helper
            .getManager(InvoiceNoteManager)
            .then(manager => {
                return Promise.all([deliveryOderDataUtil.getNewTestData(), currencyDataUtil.getTestData(), vat.getTestData()])
                    .then(results => {
                        var deliveryOder = results[0];
                        var dataCurrency = results[1];
                        var vat = results[2];
                        var items = deliveryOder.items.map(doItem => {
                            var fulfillment = doItem.fulfillments.map(doFulfillment => {
                                return {
                                    purchaseOrderExternalId: doItem.purchaseOrderExternalId,
                                    purchaseOrderExternalNo: doItem.purchaseOrderExternalNo,
                                    paymentMethod: doItem.paymentMethod,
                                    paymentType: doItem.paymentType,
                                    paymentDueDays: doItem.paymentDueDays,
                                    purchaseOrderId: doFulfillment.purchaseOrderId,
                                    purchaseOrderNo: doFulfillment.purchaseOrderNo,
                                    purchaseRequestId: doFulfillment.purchaseRequestId,
                                    purchaseRequestNo: doFulfillment.purchaseRequestNo,
                                    purchaseRequestRefNo: doFulfillment.purchaseRequestRefNo,
                                    roNo: doFulfillment.roNo,
                                    productId: doFulfillment.productId,
                                    product: doFulfillment.product,
                                    purchaseOrderQuantity: doFulfillment.purchaseOrderQuantity,
                                    purchaseOrderUom: doFulfillment.purchaseOrderUom,
                                    deliveredQuantity: doFulfillment.deliveredQuantity,
                                    pricePerDealUnit: doFulfillment.pricePerDealUnit
                                }
                            });
                            fulfillment = [].concat.apply([], fulfillment);
                            return fulfillment;
                        });

                        items = [].concat.apply([], items);
                        var invoiceNoteItem = [{
                            deliveryOrderId: deliveryOder._id,
                            deliveryOrderNo: deliveryOder.no,
                            deliveryOrderDate: deliveryOder.date,
                            deliveryOrderSupplierDoDate: deliveryOder.supplierDoDate,
                            items: items
                        }]

                        var data = {
                            no: `UT/IN/${codeGenerator()}`,
                            refNo: `REF/NO/UT/NI/${codeGenerator()}`,
                            date: new Date(),
                            supplierId: deliveryOder.supplier._id,
                            supplier: deliveryOder.supplier,
                            currency: dataCurrency,
                            useIncomeTax: false,
                            incomeTaxNo: `UT/PPN/${codeGenerator()}`,
                            incomeTaxDate: new Date(),
                            vatNo: `UT/PPH/${codeGenerator()}`,
                            vatDate: new Date(),
                            useVat: false,
                            vat: vat,
                            isPayTax: false,
                            hasInternNote: false,
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

    getNewTestData2(deliveryOder) {
        return helper
            .getManager(InvoiceNoteManager)
            .then((manager) => {
                return this.getNewData(deliveryOder).then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

}

module.exports = new InvoiceNoteDataUtil();
