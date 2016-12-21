'use strict'
var helper = require('../../helper');
var UnitPaymentOrderManager = require('../../../src/managers/purchasing/unit-payment-order-manager');
var codeGenerator = require('../../../src/utils/code-generator');
var supplier = require('../master/supplier-data-util');
var division = require('../master/division-data-util');
var currency = require('../master/currency-data-util');
var category = require('../master/category-data-util');
var vat = require('../master/vat-data-util');
var unitReceiptNote = require('./unit-receipt-note-data-util');

class UnitPaymentOrderDataUtil {
    getNew() {
        return new Promise((resolve, reject) => {
            helper
                .getManager(UnitPaymentOrderManager)
                .then(manager => {
                    Promise.all([division.getTestData(), category.getTestData(), currency.getTestData(), vat.getTestData(), supplier.getTestData(), unitReceiptNote.getNew()])
                        .then(results => {
                            var dataDivision=results[0];
                            var dataCategory=results[1];
                            var dataCurrency=results[2];
                            var dataVat=results[3]; 
                            var dataSupplier=results[4];
                            var dataUnitReceiptNote=results[5];
                            var data = {
                                no: `UT/UPO/${codeGenerator()}`,
                                divisionId: dataDivision._id,
                                division: dataDivision,
                                date: new Date(),
                                categoryId: dataCategory._id,
                                category: dataCategory,
                                currency: dataCurrency,
                                vat: dataVat,
                                paymentMethod: 'CASH',
                                supplierId: dataSupplier._id,
                                supplier: dataSupplier,
                                invoceNo: `UT/INVOICE/${codeGenerator()}`,
                                invoceDate: new Date(),
                                incomeTaxNo: `UT/PPN/${codeGenerator()}`,
                                incomeTaxDate: new Date(),
                                useVat: true,
                                useIncomeTax: true,
                                vatNo: `UT/PPH/${codeGenerator()}`,
                                vatDate: new Date(),
                                dueDate: new Date(),
                                vatRate: 2,
                                remark: 'Unit Test Unit Payment Order',
                                items: [{
                                    unitReceiptNoteId: dataUnitReceiptNote._id,
                                    unitReceiptNote: dataUnitReceiptNote
                                }]
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

module.exports = new UnitPaymentOrderDataUtil(); 