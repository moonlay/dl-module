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

module.exports = class FactPurchaseOrderComparisonEtlManager {
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

            if (item.purchaseOrder) {

                var results = purchaseRequest.items.map((poItem) => {

                    return {
                        purchaseRequestNo: purchaseRequest ? `'${purchaseRequest.no}'` : null,
                        poNoAtPoExt: purchaseOrderExternal ? `'${purchaseOrderExternal.items[0].no}'` : null,
                        poNoAtDeliveryOrderNo: deliveryOrder ? `'${deliveryOrder.items[0].purchaseOrderExternal.items[0].no}'` : null,
                        purchaseOrderExternalNo: purchaseOrderExternal ? `'${purchaseOrderExternal.no}'` : null,
                        deliveryOrderNo: deliveryOrder ? `'${deliveryOrder.no}'` : null,
                        purchaseRequestDate: purchaseRequest ? `'${moment(purchaseRequest.date).format('L')}'` : null,
                        divisionName: purchaseRequest ? `'${purchaseRequest.unit.division.name}'` : null,
                        categoryName: purchaseRequest ? `'${purchaseRequest.category.name}'` : null,
                        purchasingStaffName: purchaseOrder ? `'${purchaseOrder._createdBy}'` : null,
                        expectedDeliveryDate: purchaseOrderExternal ? `'${moment(purchaseOrderExternal.expectedDeliveryDate).format('L')}'` : null,
                        askedDeliveryDate: purchaseRequest ? `'${moment(purchaseRequest.expectedDeliveryDate).format('L')}'` : null,
                        unitName: purchaseRequest ? `'${purchaseRequest.unit.name}'` : null,
                        unitCode: purchaseRequest ? `'${purchaseRequest.unit.code}'` : null,
                        supplierName: purchaseOrderExternal ? `'${purchaseOrderExternal.supplier.name}'` : null,
                        divisionCode: purchaseRequest ? `'${purchaseRequest.unit.division.code}'` : null,
                        purchaseOrderExternalDate: purchaseOrderExternal ? `'${moment(purchaseOrderExternal.date).format('L')}'` : null,
                    };
                });
                return [].concat.apply([], results);
            }
        });
        return Promise.resolve([].concat.apply([], result));
    }

    load(data) {
        return sqlConnect.getConnect()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {

                    if (item) {
                        sqlQuery = sqlQuery.concat(`insert into fact_perbandingan_purchase_order([ID Perbandingan Purchase Order], [Nomor PO Internal], [PO Eksternal], [PO Datang], [Nomor PO Eksternal], [Nomor Surat Jalan], [Tanggal PO Internal], [Nama Divisi], [Nama Kategori], [Staff Pembelian Yang Menerima PR], [Nama Unit], [Nama Supplier], [Tanggal Diminta Datang], [Tanggal Expected Delivery], [Kode Divisi], [Kode Unit], [Tanggal PO Eksternal]) values(${count}, ${item.purchaseRequestNo}, ${item.poNoAtPoExt}, ${item.poNoAtDeliveryOrderNo}, ${item.purchaseOrderExternalNo}, ${item.deliveryOrderNo}, ${item.purchaseRequestDate}, ${item.divisionName}, ${item.categoryName}, ${item.purchasingStaffName}, ${item.unitName}, ${item.supplierName}, ${item.askedDeliveryDate}, ${item.expectedDeliveryDate}, ${item.divisionCode}, ${item.unitCode}, ${item.purchaseOrderExternalDate}); `);

                        count++;

                    }

                }

                request.multiple = true;

                // var fs = require("fs");
                // var path = "C:\\Users\\leslie.aula\\Desktop\\tttt.txt";

                // fs.writeFile(path, sqlQuery, function (error) {
                //     if (error) {
                //         console.error("write error:  " + error.message);
                //     } else {
                //         console.log("Successful Write to " + path);
                //     }
                // });

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