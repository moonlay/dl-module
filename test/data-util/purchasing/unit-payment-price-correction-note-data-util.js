'use strict'
var helper = require('../../helper');
var UnitPaymentPriceCorrectionNote = require('../../../src/managers/purchasing/unit-payment-price-correction-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var unitPaymentOrder = require('./unit-payment-order-data-util');

class UnitPaymentPriceCorrectionNoteDataUtil {
    getNewData() {
        return helper
            .getManager(UnitPaymentPriceCorrectionNote)
            .then(manager => {
                return Promise.all([unitPaymentOrder.getNewTestData()])
                    .then(results => {
                        var dataUnitPaymentOrder = results[0];
                        var itemsUnitPaymentPriceCorrectionNote = dataUnitPaymentOrder.items.map(unitPaymentOrder => {
                            return unitPaymentOrder.unitReceiptNote.items.map(unitReceiptNoteItem => {
                                return {
                                    purchaseOrderId: unitReceiptNoteItem.purchaseOrderId,
                                    purchaseOrder: unitReceiptNoteItem.purchaseOrder,
                                    productId: unitReceiptNoteItem.product._id,
                                    product: unitReceiptNoteItem.product,
                                    quantity: unitReceiptNoteItem.deliveredQuantity,
                                    uomId: unitReceiptNoteItem.deliveredUom._id,
                                    uom: unitReceiptNoteItem.deliveredUom,
                                    pricePerUnit: unitReceiptNoteItem.pricePerDealUnit-1,
                                    priceTotal: (unitReceiptNoteItem.pricePerDealUnit-1 * unitReceiptNoteItem.deliveredQuantity),
                                    currency: unitReceiptNoteItem.currency,
                                    currencyRate: unitReceiptNoteItem.currencyRate,
                                    unitReceiptNoteNo : unitPaymentOrder.unitReceiptNote.no,
                                    remark: ''
                                }
                            })
                        });

                        itemsUnitPaymentPriceCorrectionNote = [].concat.apply([], itemsUnitPaymentPriceCorrectionNote);

                        var data = {
                            no: `UT/UPPCN/${codeGenerator()}`,
                            date: new Date(),
                            unitPaymentOrderId: dataUnitPaymentOrder._id,
                            unitPaymentOrder: dataUnitPaymentOrder,
                            invoiceCorrectionNo: `UT/UPPCN/Invoice/${codeGenerator()}`,
                            invoiceCorrectionDate: new Date(),
                            incomeTaxCorrectionNo: `UT/UPPCN/PPN/${codeGenerator()}`,
                            incomeTaxCorrectionDate: new Date(),
                            vatTaxCorrectionNo: `UT/UPPCN/PPH/${codeGenerator()}`,
                            vatTaxCorrectionDate: new Date(),
                            unitCoverLetterNo: `UT/UPPCN/Letter/${codeGenerator()}`,
                            correctionType: 'Harga Satuan',
                            remark: 'Unit Test Unit payment price correction',
                            items: itemsUnitPaymentPriceCorrectionNote
                        };
                        return Promise.resolve(data);
                    });
            });
    }

    getNewTestData() {
        return helper
            .getManager(UnitPaymentPriceCorrectionNote)
            .then((manager) => {
                return this.getNewData().then((data) => {
                    return manager.create(data)
                        .then((id) => manager.getSingleById(id));
                });
            });
    }
}

module.exports = new UnitPaymentPriceCorrectionNoteDataUtil();