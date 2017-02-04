'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");

// internal deps 
require('mongodb-toolkit');

var UnitReceiptNoteManager = require('../managers/purchasing/unit-receipt-note-manager');
var UnitPaymentOrderManager = require('../managers/purchasing/unit-payment-order-manager');

module.exports = class FactTotalHutang {
    constructor(db, user, sql) {
        this.sql = sql;
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
    }
    run() {
        return this.extract()
            .then((data) => this.transform(data))
            .then((data) => this.load(data));
    }

    extract() {
        // var trueFalse = false;
        return this.unitReceiptNoteManager.collection.find({
            _deleted: false,
            _createdBy: {
                $nin: ["dev", "unit-test"]
            }
        }).limit(50).toArray()
            .then((unitReceiptNotes) => this.joinUnitPaymentOrder(unitReceiptNotes));
    }

    joinUnitPaymentOrder(unitReceiptNotes) {
        var joinUnitPaymentOrders = unitReceiptNotes.map((unitReceiptNote) => {
            return this.unitPaymentOrderManager.collection.find({
                _deleted: false,
                _createdBy: {
                    $nin: ["dev", "unit-test"]
                },
                items: {
                    $elemMatch: {
                        unitReceiptNoteId: unitReceiptNote._id
                    }
                }
            }).toArray()
                .then((unitPaymentOrders) => {
                    var arr = unitPaymentOrders.map((unitPaymentOrder) => {
                        return {
                            unitReceiptNote: unitReceiptNote,
                            unitPaymentOrder: unitPaymentOrder
                        };
                    });
                    if (arr.length === 0)
                        arr.push({
                            unitReceiptNote: unitReceiptNote,
                            unitPaymentOrder: null
                        });
                    return Promise.resolve(arr);
                });
        });
        return Promise.all(joinUnitPaymentOrders)
        .then((joinUnitPaymentOrder) => {
            return Promise.resolve([].concat.apply([], joinUnitPaymentOrder));
        })
    }

    transform(data) {
        var result = data.map((item) => {
            var unitPaymentOrder = item.unitPaymentOrder;
            var unitReceiptNote = item.unitReceiptNote;

            var results = unitReceiptNote.items.map((unitReceiptNoteItem) => {

                return {
                    unitPaymentOrderNo: unitPaymentOrder ? `'${unitPaymentOrder.no}'` : null,
                    unitPaymentOrderDate: unitPaymentOrder ? `'${moment(unitPaymentOrder.date).format('L')}'` : null,
                    unitPaymentOrderDueDate: unitPaymentOrder ? `'${moment(unitPaymentOrder.dueDate).format('L')}'` : null,
                    supplierName: unitPaymentOrder ? `'${unitPaymentOrder.supplier.name}'` : null,
                    categoryName: unitPaymentOrder ? `'${unitPaymentOrder.category.name}'` : null,
                    categoryType: unitPaymentOrder ? unitPaymentOrder.category.name.toLowerCase() == 'bahan baku' ? 'BAHAN BAKU' : 'NON BAHAN BAKU' : null,
                    divisionName: unitPaymentOrder ? `'${unitPaymentOrder.division.name}'` : null,
                    unitName: `'${unitReceiptNote.unit.name}'`,
                    invoicePrice: `${unitReceiptNoteItem.pricePerDealUnit}`,
                    unitReceiptNoteQuantity: `${unitReceiptNoteItem.deliveredQuantity}`,
                    purchaseOrderExternalCurrencyRate: `${unitReceiptNoteItem.currencyRate}`,
                    total: `${unitReceiptNoteItem.pricePerDealUnit * unitReceiptNoteItem.deliveredQuantity * unitReceiptNoteItem.currencyRate}`,
                    unitReceiptNoteNo: `'${unitReceiptNote.no}'`,
                    productName: `'${unitReceiptNoteItem.product.name}'`,
                    productCode: `'${unitReceiptNoteItem.product.code}'`
                };
            });

            return [].concat.apply([], results);
        });
        return Promise.resolve([].concat.apply([], result));
    }

    load(data) {
        return this.sql.getConnection()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {
                    sqlQuery = sqlQuery.concat(`insert into fact_total_hutang([ID Total Hutang], [Nomor Nota Intern], [Tanggal Nota Intern], [Nama Supplier], [Jenis Kategori], [Harga Sesuai Invoice], [Jumlah Sesuai Bon Unit], [Rate yang disepakati], [Total harga Nota Intern], [Nominal Bayar], [Nama Kategori], [Nama Divisi], [Nama Unit], [Tanggal Jatuh Tempo]) values(${count}, ${item.unitPaymentOrderNo}, ${item.unitPaymentOrderDate}, ${item.supplierName}, ${item.categoryType}, ${item.invoicePrice}, ${item.unitReceiptNoteQuantity}, ${item.purchaseOrderExternalCurrencyRate}, ${item.total}, ${item.categoryName}, ${item.divisionName}, ${item.unitName}, ${item.unitPaymentOrderDueDate}); `);

                    count = count + 1;
                }

                request.multiple = true;

                // return request.query(sqlQuery)
                // return request.query('select count(*) from fact_total_hutang')
                return request.query('select top 1 * from fact_total_hutang')
                    .then((results) => {
                        console.log(results);
                        return Promise.resolve();
                    })
            })
            .catch((err) => {
                console.log(err);
                return Promise.reject(err);
            });
    }
}
