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

module.exports = class FactPurchasingEtlManager {
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

            if (item.purchaseRequest) {

                var results = purchaseRequest.items.map((poItem) => {
                    var poExtDays = purchaseOrderExternal ? moment(purchaseOrderExternal.date).diff(moment(purchaseOrder.date), "days") : null;
                    var doDays = deliveryOrder ? moment(deliveryOrder.date).diff(moment(purchaseOrderExternal.date), "days") : null;
                    var urnDays = unitReceiptNote ? moment(unitReceiptNote.date).diff(moment(deliveryOrder.date), "days") : null;
                    var upoDays = unitPaymentOrder ? moment(unitPaymentOrder.date).diff(moment(unitReceiptNote.date), "days") : null;
                    var poDays = unitPaymentOrder ? moment(unitPaymentOrder.date).diff(moment(purchaseOrder.date), "days") : null;
                    var catType = purchaseRequest.category.name;

                    return {
                        purchaseRequestId: purchaseRequest ? `'${purchaseRequest._id}'` : null,
                        purchaseRequestNo: purchaseRequest ? `'${purchaseRequest.no}'` : null,
                        purchaseRequestDate: purchaseRequest ? `'${moment(purchaseRequest.date).format('L')}'` : null,
                        expectedDeliveryDate: purchaseRequest ? `'${moment(purchaseRequest.expectedDeliveryDate).format('L')}'` : null,
                        budgetCode: purchaseRequest ? `'${purchaseRequest.budget.code}'` : null,
                        budgetName: purchaseRequest ? `'${purchaseRequest.budget.name}'` : null,
                        unitCode: purchaseRequest ? `'${purchaseRequest.unit.code}'` : null,
                        unitName: purchaseRequest ? `'${purchaseRequest.unit.name}'` : null,
                        divisionCode: purchaseRequest ? `'${purchaseRequest.unit.division.code}'` : null,
                        divisionName: purchaseRequest ? `'${purchaseRequest.unit.division.name}'` : null,
                        categoryCode: purchaseRequest ? `'${purchaseRequest.category.code}'` : null,
                        categoryName: purchaseRequest ? `'${purchaseRequest.category.name}'` : null,
                        categoryType: purchaseRequest ? `'${this.getCategoryType(catType)}'` : null,
                        productCode: purchaseRequest ? `'${purchaseRequest.items[0].product.code}'` : null,
                        productName: purchaseRequest ? `'${purchaseRequest.items[0].product.name.replace("'", ".")}'` : null,

                        purchaseOrderId: purchaseOrder ? `'${purchaseOrder._id}'` : null,
                        purchaseOrderNo: purchaseOrder ? `'${purchaseOrder.no}'` : null,
                        purchaseOrderDate: purchaseOrder ? `'${moment(purchaseOrder.date).format('L')}'` : null,
                        purchaseOrderExternalDays: purchaseOrderExternal ? `${poExtDays}` : null,
                        purchaseOrderExternalDaysRange: purchaseOrderExternal ? `'${this.getRangeMonth(poExtDays)}'` : null,
                        purchasingStaffName: purchaseOrder ? `'${purchaseOrder._createdBy}'` : null,

                        purchaseOrderExternalId: purchaseOrderExternal ? `'${purchaseOrderExternal._id}'` : null,
                        purchaseOrderExternalNo: purchaseOrderExternal ? `'${purchaseOrderExternal.no}'` : null,
                        purchaseOrderExternalDate: purchaseOrderExternal ? `'${moment(purchaseOrderExternal.date).format('L')}'` : null,
                        deliveryOrderDays: deliveryOrder ? `${doDays}` : null,
                        deliveryOrderDaysRange: deliveryOrder ? `'${this.getRangeWeek(doDays)}'` : null,
                        supplierCode: purchaseOrderExternal ? `'${purchaseOrderExternal.supplier.code}'` : null,
                        supplierName: purchaseOrderExternal ? `'${purchaseOrderExternal.supplier.name}'` : null,
                        currencyCode: purchaseOrderExternal ? `'${purchaseOrderExternal.currency.code}'` : null,
                        currencyName: purchaseOrderExternal ? `'${purchaseOrderExternal.currency.description}'` : null,
                        paymentMethod: purchaseOrderExternal ? `'${purchaseOrderExternal.paymentMethod}'` : null,
                        currencyRate: purchaseOrderExternal ? `${purchaseOrderExternal.currencyRate}` : null,
                        purchaseQuantity: purchaseOrderExternal ? `${purchaseOrderExternal.items[0].items[0].dealQuantity}` : null,
                        uom: purchaseOrderExternal ? `'${purchaseOrderExternal.items[0].items[0].dealUom.unit}'` : null,
                        pricePerUnit: purchaseOrderExternal ? `${purchaseOrderExternal.items[0].items[0].pricePerDealUnit}` : null,
                        totalPrice: purchaseOrderExternal ? `${purchaseOrderExternal.items[0].items[0].dealQuantity * purchaseOrderExternal.items[0].items[0].pricePerDealUnit * purchaseOrderExternal.currencyRate}` : null,

                        deliveryOrderId: deliveryOrder ? `'${deliveryOrder._id}'` : null,
                        deliveryOrderNo: deliveryOrder ? `'${deliveryOrder.no}'` : null,
                        deliveryOrderDate: deliveryOrder ? `'${moment(deliveryOrder.date).format('L')}'` : null,
                        unitReceiptNoteDays: unitReceiptNote ? `${urnDays}` : null,
                        unitReceiptNoteDaysRange: unitReceiptNote ? `'${this.getRangeWeek(urnDays)}'` : null,


                        unitReceiptNoteId: unitReceiptNote ? `'${unitReceiptNote._id}'` : null,
                        unitReceiptNoteNo: unitReceiptNote ? `'${unitReceiptNote.no}'` : null,
                        unitReceiptNoteDate: unitReceiptNote ? `'${moment(unitReceiptNote.date).format('L')}'` : null,
                        unitPaymentOrderDays: unitPaymentOrder ? `${upoDays}` : null,
                        unitPaymentOrderDaysRange: unitPaymentOrder ? `'${this.getRangeWeek(upoDays)}'` : null,

                        unitPaymentOrderId: unitPaymentOrder ? `'${unitPaymentOrder._id}'` : null,
                        unitPaymentOrderNo: unitPaymentOrder ? `'${unitPaymentOrder.no}'` : null,
                        unitPaymentOrderDate: unitPaymentOrder ? `'${moment(unitPaymentOrder.date).format('L')}'` : null,
                        purchaseOrderDays: unitPaymentOrder ? `${poDays}` : null,
                        purchaseOrderDaysRange: unitPaymentOrder ? `'${this.getRangeMonth(poDays)}'` : null,
                        invoicePrice: unitPaymentOrder ? `'${unitReceiptNote.items[0].pricePerDealUnit}'` : null
                    };
                });
                return [].concat.apply([], results);
            }
        });
        return Promise.resolve([].concat.apply([], result));
    }

    lastSynchDate() {
        return sqlConnect.getConnect()
            .then((request) => {
                var lastSynch = 'Fact Pembelian';
                return request.query(`insert into [fact last synchronized date]([fact name], [last synchronized]) values ('${lastSynch}', '${moment().format('L')}'); `)
                    .then((results) => {
                        console.log(results);
                        return Promise.resolve();
                    });
            })
            .catch((err) => {
                console.log(err);
                return Promise.reject(err);
            });
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
                        sqlQuery = sqlQuery.concat(`insert into [fact pembelian]([id fact pembelian], [id pr], [nomor pr], [tanggal pr], [tanggal kedatangan yang diharapkan], [kode budget], [nama budget], [kode unit], [nama unit], [kode divisi], [nama divisi], [kode kategori], [nama kategori], [jenis kategori], [kode produk], [nama produk], [id po internal], [nomor po internal], [tanggal po internal], [jumlah selisih hari po eksternal-po internal], [selisih hari po internal], [nama staff pembelian], [id po eksternal], [nomor po eksternal], [tanggal po eksternal], [jumlah selisih hari do-po eksternal], [selisih hari do-po eksternal], [kode supplier], [nama supplier], [kode mata uang], [nama mata uang], [metode pembayaran], [nilai mata uang], [jumlah barang], [uom], [harga per unit], [total harga], [id do], [nomor do], [tanggal do], [jumlah selisih hari urn-do], [selisih hari urn-do], [id urn], [nomor urn], [tanggal urn], [jumlah selisih hari upo-urn], [selisih hari upo-urn], [id upo], [nomor upo], [tanggal upo], [jumlah selisih hari upo-po internal], [selisih hari upo-po internal], [invoice price]) values(${count}, ${item.purchaseRequestId}, ${item.purchaseRequestNo}, ${item.purchaseRequestDate}, ${item.expectedDeliveryDate}, ${item.budgetCode}, ${item.budgetName}, ${item.unitCode}, ${item.unitName}, ${item.divisionCode}, ${item.divisionName}, ${item.categoryCode}, ${item.categoryName}, ${item.categoryType}, ${item.productCode}, ${item.productName}, ${item.purchaseOrderId}, ${item.purchaseOrderNo}, ${item.purchaseOrderDate}, ${item.purchaseOrderExternalDays}, ${item.purchaseOrderExternalDaysRange}, ${item.purchasingStaffName}, ${item.purchaseOrderExternalId}, ${item.purchaseOrderExternalNo}, ${item.purchaseOrderExternalDate}, ${item.deliveryOrderDays}, ${item.deliveryOrderDaysRange}, ${item.supplierCode}, ${item.supplierName}, ${item.currencyCode}, ${item.currencyName}, ${item.paymentMethod}, ${item.currencyRate}, ${item.purchaseQuantity}, ${item.uom}, ${item.pricePerUnit}, ${item.totalPrice}, ${item.deliveryOrderId}, ${item.deliveryOrderNo}, ${item.deliveryOrderDate}, ${item.unitReceiptNoteDays}, ${item.unitReceiptNoteDaysRange}, ${item.unitReceiptNoteId}, ${item.unitReceiptNoteNo}, ${item.unitReceiptNoteDate}, ${item.unitPaymentOrderDays}, ${item.unitPaymentOrderDaysRange}, ${item.unitPaymentOrderId}, ${item.unitPaymentOrderNo}, ${item.unitPaymentOrderDate}, ${item.purchaseOrderDays}, ${item.purchaseOrderDaysRange}, ${item.invoicePrice}); `);

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
                    // return request.query('select top 1 * from [fact pembelian]')
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
