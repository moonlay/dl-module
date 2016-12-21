'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");
var sqlConnect = require('./sqlConnect');

// internal deps 
require('mongodb-toolkit');

var PurchaseOrderManager = require('../managers/purchasing/purchase-order-manager');
var PurchaseOrderExternalManager = require('../managers/purchasing/purchase-order-external-manager');

module.exports = class FactTopTenSupplierEtlManager {
    constructor(db, user) {
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
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
        return this.purchaseOrderManager.collection.find({
            _deleted: false
        }).toArray()
            .then((purchaseOrders) => {
                return this.joinPurchaseOrderExternal(purchaseOrders)
            })
    }

    joinPurchaseOrderExternal(data) {

        var joinPurchaseOrderExternals = data.map((purchaseOrder) => {
            return this.purchaseOrderExternalManager.collection.find({
                items: {
                    "$elemMatch": {
                        _id: purchaseOrder._id
                    }
                }
            }).toArray()
                .then((purchaseOrderExternals) => {
                    var arr = purchaseOrderExternals.map((purchaseOrderExternal) => {
                        return {
                            purchaseOrderExternal: purchaseOrderExternal,
                            purchaseOrder: purchaseOrder
                        };
                    });

                    return Promise.resolve(arr);
                });
        });
        return Promise.all(joinPurchaseOrderExternals)
            .then((joinPurchaseOrderExternal => {
                return Promise.resolve([].concat.apply([], joinPurchaseOrderExternal));
            }));
    }

    transform(data) {
        var result = data.map((item) => {
            var purchaseOrderExternal = item.purchaseOrderExternal;
            var purchaseOrder = item.purchaseOrder;

            var results = purchaseOrder.items.map((purchaseOrderItem) => {

                return {
                    supplierName: purchaseOrderExternal.supplier.name,
                    categoryType: purchaseOrder.category.name.toLowerCase() == 'bahan baku' ? 'BAHAN BAKU' : 'NON BAHAN BAKU',
                    categoryName: purchaseOrder.category.name,
                    poExternalNo: purchaseOrderExternal.no,
                    poExternalDate: moment(purchaseOrderExternal.date).format('L'),
                    quantity: purchaseOrderItem.dealQuantity,
                    pricePerUnit: purchaseOrderItem.pricePerDealUnit,
                    currencyRate: purchaseOrderExternal.currencyRate,
                    total: purchaseOrderItem.dealQuantity * purchaseOrderItem.pricePerDealUnit * purchaseOrderExternal.currencyRate,
                    divisionName: purchaseOrder.unit.division.name,
                    unitName: purchaseOrder.unit.name
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
                    sqlQuery = sqlQuery.concat("insert into fact_top_ten_supplier([ID Top Ten Supplier], [Nama Supplier], [Jenis Kategori], [Nama Kategori], [Nomor PO Eksternal], [Tanggal PO Eksternal], [Jumlah Beli], [Harga Satuan Barang], [Rate yang disepakati], [Total Harga], [Nama Divisi], [Nama Unit]) values(" + count + ", '" + item.supplierName + "', '" + item.categoryType + "', '" + item.categoryName + "', '" + item.poExternalNo + "', '" + item.poExternalDate + "', " + item.quantity + ", " + item.pricePerUnit + ", " + item.currencyRate + ", " + item.total + ", '" + item.divisionName + "', '" + item.unitName + "'); ");

                    count = count + 1;
                }

                request.multiple = true;

                return request.query(sqlQuery)
                    // return request.query('select count(*) from fact_top_ten_supplier')
                    // return request.query('select top 1 * from fact_top_ten_supplier')
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
