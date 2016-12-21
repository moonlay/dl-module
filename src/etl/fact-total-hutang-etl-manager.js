'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");
var sqlConnect = require('./sqlConnect');

// internal deps 
require('mongodb-toolkit');

var UnitReceiptNoteManager = require('../managers/purchasing/unit-receipt-note-manager');
var UnitPaymentOrderManager = require('../managers/purchasing/unit-payment-order-manager');

module.exports = class FactTotalHutang {
    constructor(db, user) {
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
    }
    run() {
        return this.extract()
            .then((data) => {
                return this.transform(data)
            })
            .then((data) => {
                return this.load(data)
            });
    }

    extract() {
        var timestamp = new Date(1970, 1, 1);
        return this.unitReceiptNoteManager.collection.find({
            _deleted: false
        }).toArray()
            .then((unitReceiptNotes) => {
                return this.joinUnitPaymentOrder(unitReceiptNotes)
            })
    }

    joinUnitPaymentOrder(data) {

        var joinUnitPaymentOrders = data.map((unitReceiptNote) => {
            return this.unitPaymentOrderManager.collection.find({
                items: {
                    "$elemMatch": {
                        unitReceiptNoteId: unitReceiptNote._id
                    }
                }
            }).toArray()
                .then((unitPaymentOrders) => {
                    var arr = unitPaymentOrders.map((unitPaymentOrder) => {
                        return {
                            unitPaymentOrder: unitPaymentOrder,
                            unitReceiptNote: unitReceiptNote
                        };
                    });

                    return Promise.resolve(arr);
                });
        });
        return Promise.all(joinUnitPaymentOrders)
            .then((joinUnitPaymentOrder => {
                return Promise.resolve([].concat.apply([], joinUnitPaymentOrder));
            }));
    }

    transform(data) {
        var result = data.map((item) => {
            var unitPaymentOrder = item.unitPaymentOrder;
            var unitReceiptNote = item.unitReceiptNote;

            var results = unitReceiptNote.items.map((unitReceiptNoteItem) => {

                return {
                    unitPaymentOrderNo: unitPaymentOrder.no,
                    unitPaymentOrderDate: moment(unitPaymentOrder.date).format('L'),
                    unitPaymentOrderDueDate: moment(unitPaymentOrder.dueDate).format('L'),
                    supplierName: unitPaymentOrder.supplier.name,
                    categoryName: unitPaymentOrder.category.name,
                    categoryType: unitPaymentOrder.category.name.toLowerCase() == 'bahan baku' ? 'BAHAN BAKU' : 'NON BAHAN BAKU',
                    divisionName: unitPaymentOrder.division.name,
                    unitName: unitReceiptNote.unit.name,
                    invoicePrice: unitReceiptNoteItem.pricePerDealUnit,
                    unitReceiptNoteQuantity: unitReceiptNoteItem.deliveredQuantity,
                    purchaseOrderExternalCurrencyRate: unitReceiptNoteItem.currencyRate,
                    total: unitReceiptNoteItem.pricePerDealUnit * unitReceiptNoteItem.deliveredQuantity * unitReceiptNoteItem.currencyRate
                };
            });

            return [].concat.apply([], results);
        });
        return Promise.resolve([].concat.apply([], result));
    }

    load(data) {
        return sqlConnect.getConnect()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {
                    sqlQuery = sqlQuery.concat("insert into fact_total_hutang([ID Total Hutang], [Nomor Nota Intern], [Tanggal Nota Intern], [Nama Supplier], [Jenis Kategori], [Harga Sesuai Invoice], [Jumlah Sesuai Bon Unit], [Rate yang disepakati], [Total harga Nota Intern], [Nominal Bayar], [Nama Kategori], [Nama Divisi], [Nama Unit], [Tanggal Jatuh Tempo]) values(" + count + ", '" + item.unitPaymentOrderNo + "', '" + item.unitPaymentOrderDate + "', '" + item.supplierName + "', '" + item.categoryType + "', " + item.invoicePrice + ", " + item.unitReceiptNoteQuantity + ", " + item.purchaseOrderExternalCurrencyRate + ", " + item.total + ", '', '" + item.categoryName + "', '" + item.divisionName + "', '" + item.unitName + "', '" + item.unitPaymentOrderDueDate + "'); ");

                    count = count + 1;
                }

                request.multiple = true;

                return request.query(sqlQuery)
                // return request.query('select count(*) from fact_total_hutang')
                // return request.query('select top 1 * from fact_total_hutang')
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
