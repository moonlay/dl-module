'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");
var sqlConnect = require("./sqlConnect");

// internal deps 
require('mongodb-toolkit');

var PurchaseRequestManager = require("../managers/purchasing/purchase-request-manager");
var PurchaseOrderManager = require('../managers/purchasing/purchase-order-manager');
var PurchaseOrderExternalManager = require('../managers/purchasing/purchase-order-external-manager');
var DeliveryOrderManager = require('../managers/purchasing/delivery-order-manager');

module.exports = class FactTimelinessSuplier {
    constructor(db, user) {
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
    }

    run() {
        return this.extract()
            .then((data) => this.transform(data))
            .then((data) => this.load(data));
    }

    joinPurchaseOrder(purchaseRequests) {
        var joinPurchaseOrders = purchaseRequests.map((purchaseRequest) => {
            return this.purchaseOrderManager.collection.find({
                purchaseRequestId: purchaseRequest._id
            })
                .toArray()
                .then((purchaseOrders) => {
                    var arr = purchaseOrders.map((purchaseOrder) => {
                        return {
                            purchaseRequest: purchaseRequest,
                            purchaseOrder: purchaseOrder
                        };
                    });

                    if (arr.length == 0)
                        arr.push({
                            purchaseRequest: purchaseRequest,
                            purchaseOrder: null
                        });
                    return Promise.resolve(arr);
                });
        });
        return Promise.all(joinPurchaseOrders)
            .then((joinPurchaseOrder => {
                return Promise.resolve([].concat.apply([], joinPurchaseOrder));
            }));
    }

    joinPurchaseOrderExternal(data) {
        var joinPurchaseOrderExternals = data.map((item) => {
            var getPurchaseOrderExternal = item.purchaseOrder ? this.purchaseOrderExternalManager.collection.find({
                items: {
                    "$elemMatch": {
                        _id: item.purchaseOrder._id
                    }
                }
            }).toArray() : Promise.resolve([]);

            return getPurchaseOrderExternal.then((purchaseOrderExternals) => {
                var arr = purchaseOrderExternals.map((purchaseOrderExternal) => {
                    var obj = Object.assign({}, item);
                    obj.purchaseOrderExternal = purchaseOrderExternal;
                    return obj;
                });

                if (arr.length == 0) {
                    arr.push(Object.assign({}, item, {
                        purchaseOrderExternal: null
                    }));
                }
                return Promise.resolve(arr);
            });
        });

        return Promise.all(joinPurchaseOrderExternals)
            .then(((joinPurchaseOrderExternal) => {
                return Promise.resolve([].concat.apply([], joinPurchaseOrderExternal));
            }));
    }

    joinDeliveryOrder(data) {
        var joinDeliveryOrders = data.map((item) => {
            var getDeliveryOrders = item.purchaseOrderExternal ? this.deliveryOrderManager.collection.find({
                items: {
                    "$elemMatch": {
                        purchaseOrderExternalId: item.purchaseOrderExternal._id
                    }
                }
            }).toArray() : Promise.resolve([]);

            return getDeliveryOrders.then((deliveryOrders) => {

                var arr = deliveryOrders.map((deliveryOrder) => {
                    var obj = Object.assign({}, item);
                    obj.deliveryOrder = deliveryOrder;
                    return obj;
                });
                if (arr.length == 0) {
                    arr.push(Object.assign({}, item, {
                        deliveryOrder: null
                    }));
                }
                return Promise.resolve(arr);
            });
        });
        return Promise.all(joinDeliveryOrders)
            .then((joinDeliveryOrder => {
                return Promise.resolve([].concat.apply([], joinDeliveryOrder));
            }));
    }

    extract() {
        var timestamp = new Date(1970, 1, 1);
        return this.purchaseRequestManager.collection.find({
            _updatedDate: {
                "$gt": timestamp
            }
        }).toArray()
            .then((puchaseRequests) => this.joinPurchaseOrder(puchaseRequests))
            .then((results) => this.joinPurchaseOrderExternal(results))
            .then((results) => this.joinDeliveryOrder(results))
            
    }

    transform(data) {
        var result = data.map((item) => {
            var purchaseRequest = item.purchaseRequest;
            var purchaseOrder = item.purchaseOrder;
            var purchaseOrderExternal = item.purchaseOrderExternal;
            var deliveryOrder = item.deliveryOrder;

            if (item.purchaseOrderExternal) {

                var results = purchaseRequest.items.map((poItem) => {
                    var catType = purchaseRequest.category.name;
                    var lastDeliveredDate = deliveryOrder ? purchaseOrder.items.slice(-1)[0].fulfillments.slice(-1)[0].deliveryOderDate : null;
                    // var poItemsLength = purchaseOrder.items.length;
                    // var doDateLength = purchaseOrder.items[poItemsLength - 1].fulfillments.length;
                    // var lastDeliveredDate = purchaseOrder.items[poItemsLength - 1].fulfillments[fulfillments.length - 1].deliveryOrderDate;

                    return {
                        supplierName: purchaseOrderExternal ? `'${purchaseOrderExternal.supplier.name}'` : null,                        
                        purchaseOrderExternalNo: purchaseOrderExternal ? `'${purchaseOrderExternal.no}'` : null,
                        expectedDeliveryDate: purchaseOrderExternal ? `'${moment(purchaseOrderExternal.expectedDeliveryDate).format('L')}'` : null,
                        deliveryOrderDate: deliveryOrder ? `'${moment(deliveryOrder.date).format('L')}'` : null,
                        status: purchaseOrder ? `'${this.getStatus(purchaseOrderExternal.expectedDeliveryDate, lastDeliveredDate)}'` : null,                        
                        divisionName: purchaseRequest ? `'${purchaseRequest.unit.division.name}'` : null,
                        unitName: purchaseRequest ? `'${purchaseRequest.unit.name}'` : null,
                        categoryName: purchaseRequest ? `'${purchaseRequest.category.name}'` : null,
                        categoryType: purchaseRequest ? `'${this.getCategoryType(catType)}'` : null,
                        categoryCode: purchaseRequest ? `'${purchaseRequest.category.code}'` : null
                    };
                });
                return [].concat.apply([], results);
            }
        });
        return Promise.resolve([].concat.apply([], result));
    }

    getStatus(poDate, doDate) {
        if (doDate <= poDate) {
            return "Tepat Waktu";
        } else if (doDate > poDate) {
            return "Tidak Tepat Waktu";
        }
    }

    getCategoryType(catType) {
        if (catType === "BAHAN BAKU") {
            return "BAHAN BAKU";
        } else {
            return "NON BAHAN BAKU";
        }
    }

    load(data) {
        return sqlConnect.getConnect()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {

                    if (item) {
                        sqlQuery = sqlQuery.concat(`insert into fact_supplier_ketepatan_waktu([ID Supplier Ketepatan Waktu], [Nama Supplier], [Nomor PO Eksternal], [Tanggal Rencana Kedatangan], [Tanggal Surat Jalan], [Status], [Nama Divisi], [Nama Unit], [Nama Kategori], [Jenis Kategori], [kode_kategori]) values(${count}, ${item.supplierName}, ${item.purchaseOrderExternalNo}, ${item.expectedDeliveryDate}, ${item.deliveryOrderDate}, ${item.status}, ${item.divisionName}, ${item.unitName}, ${item.categoryName}, ${item.categoryType}, ${item.categoryCode}); `);

                        count++;

                    }

                }

                request.multiple = true;

                return request.query(sqlQuery)
                    // return request.query('select count(*) from fact_durasi_pembelian')
                    // return request.query('select top 1 * from fact_durasi_pembelian')
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