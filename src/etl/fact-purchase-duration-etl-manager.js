"use strict"

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");
var sqlConnect = require("./sqlConnect");

// internal deps 
require("mongodb-toolkit");

var PurchaseRequestManager = require("../managers/purchasing/purchase-request-manager");
var PurchaseOrderManager = require('../managers/purchasing/purchase-order-manager');
var PurchaseOrderExternalManager = require('../managers/purchasing/purchase-order-external-manager');
var DeliveryOrderManager = require('../managers/purchasing/delivery-order-manager');
var UnitReceiptNoteManager = require('../managers/purchasing/unit-receipt-note-manager');
var UnitPaymentOrderManager = require('../managers/purchasing/unit-payment-order-manager');
var SupplierManager = require('../managers/master/supplier-manager');

module.exports = class FactPurchaseDurationEtlManager {
    constructor(db, user) {
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
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

    joinUnitReceiptNote(data) {
        var joinUnitReceiptNotes = data.map((item) => {
            var getUnitReceiptNotes = item.deliveryOrder ? this.unitReceiptNoteManager.collection.find({
                deliveryOrderId: item.deliveryOrder._id
            }).toArray() : Promise.resolve([]);

            return getUnitReceiptNotes.then((unitReceiptNotes) => {


                var arr = unitReceiptNotes.map((unitReceiptNote) => {
                    var obj = Object.assign({}, item);
                    obj.unitReceiptNote = unitReceiptNote;
                    return obj;
                });
                if (arr.length == 0) {
                    arr.push(Object.assign({}, item, {
                        unitReceiptNote: null
                    }));
                }
                return Promise.resolve(arr);
            });
        });
        return Promise.all(joinUnitReceiptNotes)
            .then((joinUnitReceiptNote => {
                return Promise.resolve([].concat.apply([], joinUnitReceiptNote));
            }));
    }

    joinUnitPaymentOrder(data) {
        var joinUnitPaymentOrders = data.map((item) => {
            var getUnitPaymentOrders = item.unitReceiptNote ? this.unitPaymentOrderManager.collection.find({
                items: {
                    "$elemMatch": {
                        unitReceiptNoteId: item.unitReceiptNote._id
                    }
                }
            }).toArray() : Promise.resolve([]);

            return getUnitPaymentOrders.then((unitPaymentOrders) => {

                var arr = unitPaymentOrders.map((unitPaymentOrder) => {
                    var obj = Object.assign({}, item);
                    obj.unitPaymentOrder = unitPaymentOrder;
                    return obj;
                });
                if (arr.length == 0) {
                    arr.push(Object.assign({}, item, {
                        unitPaymentOrder: null
                    }));
                }
                return Promise.resolve(arr);
            });
        });
        return Promise.all(joinUnitPaymentOrders)
            .then((joinUnitPaymentOrder => {
                return Promise.resolve([].concat.apply([], joinUnitPaymentOrder));
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
            .then((results) => this.joinUnitReceiptNote(results))
            .then((results) => this.joinUnitPaymentOrder(results));
    }

    transform(data) {
        var result = data.map((item) => {
            var purchaseRequest = item.purchaseRequest;
            var purchaseOrder = item.purchaseOrder;
            var purchaseOrderExternal = item.purchaseOrderExternal;
            var deliveryOrder = item.deliveryOrder;
            var unitReceiptNote = item.unitReceiptNote;
            var unitPaymentOrder = item.unitPaymentOrder;

            if (item.purchaseOrder) {

                var results = purchaseRequest.items.map((poItem) => {
                    var poExtDays = purchaseOrderExternal ? moment(purchaseOrderExternal.date).diff(moment(purchaseOrder.date), "days") : null;
                    var doDays = deliveryOrder ? moment(deliveryOrder.date).diff(moment(purchaseOrderExternal.date), "days") : null;
                    var uroDays = unitReceiptNote ? moment(unitReceiptNote.date).diff(moment(deliveryOrder.date), "days") : null;
                    var upoDays = unitPaymentOrder ? moment(unitPaymentOrder.date).diff(moment(unitReceiptNote.date), "days") : null;
                    var poDays = unitPaymentOrder ? moment(unitPaymentOrder.date).diff(moment(purchaseOrder.date), "days") : null;                    
                    var catType = purchaseRequest.category.name;

                    return {
                        purchaseRequestNo: purchaseRequest ? `'${purchaseRequest.no}'` : null,
                        purchaseOrderNo: purchaseOrder ? `'${purchaseOrder.no}'` : null,
                        purchaseOrderExternalNo: purchaseOrderExternal ? `'${purchaseOrderExternal.no}'` : null,
                        deliveryOrderNo: deliveryOrder ? `'${deliveryOrder.no}'` : null,
                        unitReceiptNoteNo: unitReceiptNote ? `'${unitReceiptNote.no}'` : null,
                        unitPaymentOrderNo: unitPaymentOrder ? `'${unitPaymentOrder.no}'` : null,

                        purchaseRequestDate: purchaseRequest ? `'${moment(purchaseRequest.date).format('L')}'` : null,
                        purchaseOrderDays: poDays,
                        purchaseOrderDate: purchaseOrder ? `'${moment(purchaseOrder.date).format('L')}'` : null,
                        purchaseOrderExternalDays: poExtDays,
                        purchaseOrderExternalDate: purchaseOrderExternal ? `'${moment(purchaseOrderExternal.date).format('L')}'` : null,
                        deliveryOrderDays: doDays,
                        deliveryOrderDate: deliveryOrder ? `'${moment(deliveryOrder.date).format('L')}'` : null,
                        unitReceiptNoteDays: uroDays,
                        unitReceiptNoteDate: unitReceiptNote ? `'${moment(unitReceiptNote.date).format('L')}'` : null,
                        unitPaymentOrderDays: upoDays,
                        unitPaymentOrderDate: unitPaymentOrder ? `'${moment(unitPaymentOrder.date).format('L')}'` : null,
                        purchaseOrderDaysRange: this.getRangeWeek(poDays) ? `'${this.getRangeWeek(poDays)}'` : null,
                        purchaseOrderExternalDaysRange: this.getRangeMonth(poExtDays) ? `'${this.getRangeMonth(poExtDays)}'` : null,
                        deliveryOrderDaysRange: this.getRangeWeek(doDays) ? `'${this.getRangeWeek(doDays)}'` : null,
                        unitReceiptNoteDaysRange: this.getRangeWeek(uroDays) ? `'${this.getRangeWeek(uroDays)}'` : null,
                        unitPaymentOrderDaysRange: this.getRangeMonth(upoDays) ? `'${this.getRangeMonth(upoDays)}'` : null,
                        divisionName: purchaseRequest ? `'${purchaseRequest.unit.division.name}'` : null,
                        unitName: purchaseRequest ? `'${purchaseRequest.unit.name}'` : null,
                        categoryName: purchaseRequest ? `'${purchaseRequest.category.name}'` : null,
                        categoryType: purchaseRequest ? `'${this.getCategoryType(catType)}'` : null,
                        supplierName: purchaseOrderExternal ? `'${purchaseOrderExternal.supplier.name}'` : null,
                        buyerName: purchaseOrder ? `'${purchaseOrder._createdBy}'` : null,
                        divisionCode: purchaseRequest ? `'${purchaseRequest.unit.division.code}'` : null,
                        supplierCode: unitPaymentOrder ? `'${unitPaymentOrder.supplier.code}'` : null,
                        buyerCode: purchaseOrder ? `'${purchaseOrder.buyer.code}'` : null,
                    };
                });
                return [].concat.apply([], results);
            }
        });
        return Promise.resolve([].concat.apply([], result));
    }



    getRangeMonth(days) {
        if (days === 0) {
            return "0 hari";
        } else if (days >= 1 && days <= 30) {
            return "1-30 hari";
        } else if (days >= 31 && days <= 60) {
            return "31-60 hari";
        } else if (days >= 61 && days <= 90) {
            return "61-90 hari";
        } else if (days > 90) {
            return ">90 hari";
        }
    }

    getRangeWeek(days) {
        if (days === 0) {
            return "0 hari";
        } else if (days >= 1 && days <= 7) {
            return "1-7 hari";
        } else if (days >= 8 && days <= 14) {
            return "8-14 hari";
        } else if (days >= 15 && days <= 21) {
            return "15-21 hari";
        } else if (days >= 22 && days <= 30) {
            return "22-30 hari";
        } else if (days > 30) {
            return ">30 hari";
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
                        sqlQuery = sqlQuery.concat(`insert into fact_durasi_pembelian([ID Durasi Pembelian], [Nomor PO Internal], [Nomor PO Eksternal], [Nomor Surat Jalan], [Nomor Bon Unit], [Nomor Nota Intern], [Selisih Day PR_PO], [Selisih Day PO_SJ], [Selisih Day SJ_BU], [Selisih Day BU_NI], [Selisih Day PR_NI], [Range PR_PO], [Range PO_SJ], [Range SJ_BU], [Range BU_NI], [Range PR_NI], [Tanggal PO Internal], [Tanggal PO Eksternal], [Tanggal Surat Jalan], [Tanggal Bon Unit], [Tanggal Nota Intern], [Nama Divisi], [Nama Unit], [Nama Kategori], [Jenis Kategori], [Nama Supplier], [Staff Pembelian yang menerima PR], [Kode_Divisi], [Kode_Supplier], [Kode_Staff_Pembelian]) values(${count}, ${item.purchaseRequestNo}, ${item.purchaseOrderExternalNo}, ${item.deliveryOrderNo}, ${item.unitReceiptNoteNo}, ${item.unitPaymentOrderNo}, ${item.purchaseOrderExternalDays}, ${item.deliveryOrderDays}, ${item.unitReceiptNoteDays}, ${item.unitPaymentOrderDays}, ${item.purchaseOrderDays}, ${item.purchaseOrderExternalDaysRange}, ${item.deliveryOrderDaysRange}, ${item.unitReceiptNoteDaysRange}, ${item.unitPaymentOrderDaysRange}, ${item.purchaseOrderDaysRange}, ${item.purchaseOrderDate}, ${item.purchaseOrderExternalDate}, ${item.deliveryOrderDate}, ${item.unitReceiptNoteDate}, ${item.unitPaymentOrderDate}, ${item.divisionName}, ${item.unitName}, ${item.categoryName}, ${item.categoryType}, ${item.supplierName}, ${item.buyerName}, ${item.divisionCode}, ${item.supplierCode}, ${item.buyerCode}); `);

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
