'use strict'
var helper = require('../../helper');
var UnitPaymentQuantityCorrectionNote = require('../../../src/managers/purchasing/unit-payment-quantity-correction-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var unitPaymentOrder = require('./unit-payment-order-data-util');

class UnitPaymentQuantityCorrectionNoteDataUtil {
    getNewData() {
        return helper
            .getManager(UnitPaymentQuantityCorrectionNote)
            .then(manager => {
                return Promise.all([unitPaymentOrder.getNewTestData()])
                    .then(results => {
                        var dataUnitPaymentOrder = results[0];
                        var itemsUnitPaymentQuantityCorrectionNote = dataUnitPaymentOrder.items.map(unitPaymentOrder => {
                            return unitPaymentOrder.unitReceiptNote.items.map(unitReceiptNoteItem => {
                                return {
                                    purchaseOrderId: unitReceiptNoteItem.purchaseOrderId,
                                    purchaseOrder: unitReceiptNoteItem.purchaseOrder,
                                    productId: unitReceiptNoteItem.product._id,
                                    product: unitReceiptNoteItem.product,
                                    quantity: unitReceiptNoteItem.deliveredQuantity - 1,
                                    uomId: unitReceiptNoteItem.deliveredUom._id,
                                    uom: unitReceiptNoteItem.deliveredUom,
                                    pricePerUnit: unitReceiptNoteItem.pricePerDealUnit,
                                    priceTotal: (unitReceiptNoteItem.pricePerDealUnit * unitReceiptNoteItem.deliveredQuantity),
                                    currency: unitReceiptNoteItem.currency,
                                    currencyRate: unitReceiptNoteItem.currencyRate,
                                    unitReceiptNoteNo: unitPaymentOrder.unitReceiptNote.no,
                                    remark: ''
                                }
                            })
                        });

                        itemsUnitPaymentQuantityCorrectionNote = [].concat.apply([], itemsUnitPaymentQuantityCorrectionNote);

                        var data = {
                            //no: `UT/UPPCN/${codeGenerator()}`,
                            date: new Date(),
                            unitPaymentOrderId: dataUnitPaymentOrder._id,
                            unitPaymentOrder: dataUnitPaymentOrder,
                            invoiceCorrectionNo: `UT/UPPCN/Invoice/${codeGenerator()}`,
                            invoiceCorrectionDate: new Date(),
                            incomeTaxCorrectionNo: `UT/UPPCN/PPN/${codeGenerator()}`,
                            incomeTaxCorrectionDate: new Date(),
                            useVat: false,
                            useIncomeTax: false,
                            vatTaxCorrectionNo: `UT/UPPCN/PPH/${codeGenerator()}`,
                            vatTaxCorrectionDate: new Date(),
                            unitCoverLetterNo: `UT/UPPCN/Letter/${codeGenerator()}`,
                            releaseOrderNoteNo: `UT/RO/PPH/${codeGenerator()}`,
                            correctionType: 'Jumlah',
                            remark: 'Unit Test Unit payment quantity correction',
                            items: itemsUnitPaymentQuantityCorrectionNote
                        };
                        return Promise.resolve(data);
                    });
            });
    }

    getNewTestData() {
        return helper
            .getManager(UnitPaymentQuantityCorrectionNote)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }

    getNewTestDataInsertTwice() {
        return helper
            .getManager(UnitPaymentQuantityCorrectionNote)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => {
                                return manager.create(data)
                                    .then((id) => manager.getSingleById(id));
                        });
                });
            });
    }
}

module.exports = new UnitPaymentQuantityCorrectionNoteDataUtil();
