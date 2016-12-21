'use strict'
var helper = require('../../helper');
var UnitPaymentQuantityCorrectionNote = require('../../../src/managers/purchasing/unit-payment-quantity-correction-note-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var unitPaymentOrder = require('./unit-payment-order-data-util');

class UnitPaymentQuantityCorrectionNoteDataUtil {
    getNew() {
        return new Promise((resolve, reject) => {
            helper
                .getManager(UnitPaymentQuantityCorrectionNote)
                .then(manager => {
                    Promise.all([unitPaymentOrder.getNew()])
                        .then(results => {
                            var dataUnitPaymentOrder=results[0];
                            var itemsUnitPaymentQuantityCorrectionNote = dataUnitPaymentOrder.items.map(unitPaymentOrder => {
                                return unitPaymentOrder.unitReceiptNote.items.map(unitReceiptNoteItem => { 
                                        return {
                                            purchaseOrderId: unitReceiptNoteItem.purchaseOrderId,
                                            purchaseOrder: unitReceiptNoteItem.purchaseOrder,
                                            productId: unitReceiptNoteItem.product._id,
                                            product: unitReceiptNoteItem.product,
                                            quantity: unitReceiptNoteItem.deliveredQuantity,
                                            uomId: unitReceiptNoteItem.deliveredUom._id,
                                            uom: unitReceiptNoteItem.deliveredUom,
                                            pricePerUnit: unitReceiptNoteItem.pricePerDealUnit,
                                            priceTotal: (unitReceiptNoteItem.pricePerDealUnit * unitReceiptNoteItem.deliveredQuantity),
                                            currency: unitReceiptNoteItem.currency,
                                            currencyRate: unitReceiptNoteItem.currencyRate,
                                            remark: ''
                                        }
                                    }) 
                            });

                            itemsUnitPaymentQuantityCorrectionNote = [].concat.apply([], itemsUnitPaymentQuantityCorrectionNote);

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
                                priceCorrectionType: 'Jumlah',
                                remark: 'Unit Test Unit payment quantity correction',
                                items:  itemsUnitPaymentQuantityCorrectionNote
                            };

                            manager.create(data)
                                .then(id => {
                                    manager.getSingleById(id)
                                        .then(data => {
                                            resolve(data);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
}

module.exports = new UnitPaymentQuantityCorrectionNoteDataUtil();
