'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var PurchaseRequestManager = require("../managers/purchasing/purchase-request-manager");
var PurchaseOrderManager = require('../managers/purchasing/purchase-order-manager');
var PurchaseOrderExternalManager = require('../managers/purchasing/purchase-order-external-manager');
var DeliveryOrderManager = require('../managers/purchasing/delivery-order-manager');
var UnitReceiptNoteManager = require('../managers/purchasing/unit-receipt-note-manager');
var UnitPaymentOrderManager = require('../managers/purchasing/unit-payment-order-manager');

module.exports = class FactPurchasingEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }

    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: "Fact Pembelian from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.extract()
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Fact Pembelian from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: "Successful"
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            })
            .catch((err) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Fact Pembelian from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: err
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            });
    }

    timestamp() {
        return this.migrationLog.find({
            description: "Fact Pembelian from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({ finish: -1 }).limit(1).toArray()
    }

    extractPR(time) {
        var timestamp = new Date(time[0].finish);
        return this.purchaseRequestManager.collection.find({
            _deleted: false,
            _createdBy: {
                "$nin": ["dev", "unit-test"]
            },
            _updatedDate: {
                "$gt": timestamp
            }
        }).toArray()
    }

    extractPO(time) {
        var timestamp = new Date(time[0].finish);
        return this.purchaseOrderManager.collection.find({
            _deleted: false,
            _createdBy: {
                "$nin": ["dev", "unit-test"]
            },
            _updatedDate: {
                "$gt": timestamp
            }
        }).toArray()
    }

    getPRFromPO(datas) {
        var joinExtractedPR = datas.map((data) => {
            return data.purchaseRequest;
        })
        return Promise.all(joinExtractedPR)
    }

    extractPRFromPO() {
        return this.timestamp()
            .then((time) => this.extractPO(time))
            .then((datas) => this.getPRFromPO(datas))
    }

    extractPRfromPR() {
        return this.timestamp()
            .then((time) => this.extractPR(time))
    }

    joinPurchaseOrder(purchaseRequests) {
        var joinPurchaseOrders = purchaseRequests.map((purchaseRequest) => {
            return this.purchaseOrderManager.collection.find({
                _deleted: false,
                _createdBy: {
                    $nin: ["dev", "unit-test"]
                },
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
                _deleted: false,
                _createdBy: {
                    $nin: ["dev", "unit-test"]
                },
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
                _deleted: false,
                _createdBy: {
                    $nin: ["dev", "unit-test"]
                },
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
                _deleted: false,
                _createdBy: {
                    $nin: ["dev", "unit-test"]
                },
                deliveryOrderId: item.deliveryOrder._id,
                items: {
                    "$elemMatch": {
                        purchaseOrderId: item.purchaseOrder._id
                    }
                }
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
                _deleted: false,
                _createdBy: {
                    $nin: ["dev", "unit-test"]
                },
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

    collectPR() {
        var purchaseRequest = this.extractPRfromPR();
        var prFromPOInternal = this.extractPRFromPO();
        return Promise.all([purchaseRequest, prFromPOInternal])
            .then((data) => {
                var purchaseRequest = data[0];
                var prFromPOInternal = data[1];
                return Promise.resolve(purchaseRequest.concat(prFromPOInternal))
            })
    }

    extract() {
        return this.collectPR()
            .then((data) => this.removeDuplicates(data))
            .then((purchaseRequest) => this.joinPurchaseOrder(purchaseRequest))
            .then((data) => this.joinPurchaseOrderExternal(data))
            .then((data) => this.joinDeliveryOrder(data))
            .then((data) => this.joinUnitReceiptNote(data))
            .then((data) => this.joinUnitPaymentOrder(data))
    }

    removeDuplicates(arr) {
        var new_arr = [];
        var lookup = {};

        for (var i in arr) {
            lookup[arr[i].no] = arr[i];
        }

        for (i in lookup) {
            new_arr.push(lookup[i]);
        }

        return Promise.resolve(new_arr);
    }

    getRangeMonth(days) {
        if (days <= 0) {
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
        if (days <= 0) {
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

    getStatus(poDate, doDate) {
        var poDates = moment(poDate).startOf("day");
        var doDates = moment(doDate).startOf("day");
        var result = moment(doDates).diff(moment(poDates), "days")
        if (result <= 0) {
            return "Tepat Waktu";
        } else {
            return "Tidak Tepat Waktu";
        }
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

                var results = purchaseOrder.items.map((poItem) => {
                    var prPoExtDays = purchaseOrderExternal ? moment(moment(purchaseOrderExternal.date).startOf("day")).diff(moment(moment(purchaseRequest.date).startOf("day")), "days") : null;
                    var poIntDays = purchaseOrder ? moment(moment(purchaseOrder._createdDate).startOf("day")).diff(moment(moment(purchaseRequest.date).startOf("day")), "days") : null;
                    var poExtDays = purchaseOrderExternal ? moment(moment(purchaseOrderExternal.date).startOf("day")).diff(moment(moment(purchaseOrder._createdDate).startOf("day")), "days") : null;
                    var doDays = deliveryOrder ? moment(moment(deliveryOrder.date).startOf("day")).diff(moment(moment(purchaseOrderExternal.date).startOf("day")), "days") : null;
                    var urnDays = unitReceiptNote ? moment(moment(unitReceiptNote.date).startOf("day")).diff(moment(moment(deliveryOrder.date).startOf("day")), "days") : null;
                    var upoDays = unitPaymentOrder ? moment(moment(unitPaymentOrder.date).startOf("day")).diff(moment(moment(unitReceiptNote.date).startOf("day")), "days") : null;
                    var poDays = unitPaymentOrder ? moment(moment(unitPaymentOrder.date).startOf("day")).diff(moment(moment(purchaseOrder._createdDate).startOf("day")), "days") : null;
                    var lastDeliveredDate = (poItem.fulfillments.length > 0) ? poItem.fulfillments[poItem.fulfillments.length - 1].deliveryOrderDate : null;
                    var catType = purchaseOrder.purchaseRequest.category.name;

                    return {
                        purchaseRequestId: purchaseOrder ? `'${purchaseOrder.purchaseRequest._id}'` : null,
                        purchaseRequestNo: purchaseOrder ? `'${purchaseOrder.purchaseRequest.no}'` : null,
                        purchaseRequestDate: purchaseOrder ? `'${moment(purchaseOrder.purchaseRequest.date).format('L')}'` : null,
                        expectedPRDeliveryDate: purchaseOrder ? `'${moment(purchaseOrder.purchaseRequest.expectedDeliveryDate).format('L')}'` : null,
                        budgetCode: purchaseOrder ? `'${purchaseOrder.purchaseRequest.budget.code}'` : null,
                        budgetName: purchaseOrder ? `'${purchaseOrder.purchaseRequest.budget.name}'` : null,
                        unitCode: purchaseOrder ? `'${purchaseOrder.purchaseRequest.unit.code}'` : null,
                        unitName: purchaseOrder ? `'${purchaseOrder.purchaseRequest.unit.name}'` : null,
                        divisionCode: purchaseOrder ? `'${purchaseOrder.purchaseRequest.unit.division.code}'` : null,
                        divisionName: purchaseOrder ? `'${purchaseOrder.purchaseRequest.unit.division.name}'` : null,
                        categoryCode: purchaseOrder ? `'${purchaseOrder.purchaseRequest.category.code}'` : null,
                        categoryName: purchaseOrder ? `'${purchaseOrder.purchaseRequest.category.name}'` : null,
                        categoryType: purchaseOrder ? `'${this.getCategoryType(catType)}'` : null,
                        productCode: purchaseOrder ? `'${poItem.product.code}'` : null,
                        productName: purchaseOrder ? `'${poItem.product.name.replace(/'/g, '"')}'` : null,
                        purchaseRequestDays: purchaseOrder ? `${poIntDays}` : null,
                        purchaseRequestDaysRange: purchaseOrder ? `'${this.getRangeWeek(poIntDays)}'` : null,
                        prPurchaseOrderExternalDays: purchaseOrderExternal ? `${prPoExtDays}` : null,
                        prPurchaseOrderExternalDaysRange: purchaseOrderExternal ? `'${this.getRangeWeek(prPoExtDays)}'` : null,

                        purchaseOrderId: purchaseOrder ? `'${purchaseOrder._id}'` : null,
                        purchaseOrderNo: purchaseOrder ? `'${purchaseOrder.no}'` : null,
                        purchaseOrderDate: purchaseOrder ? `'${moment(purchaseOrder._createdDate).format('L')}'` : null,
                        purchaseOrderExternalDays: purchaseOrderExternal ? `${poExtDays}` : null,
                        purchaseOrderExternalDaysRange: purchaseOrderExternal ? `'${this.getRangeWeek(poExtDays)}'` : null,
                        purchasingStaffName: purchaseOrder ? `'${purchaseOrder._createdBy}'` : null,
                        prNoAtPo: purchaseOrder ? `'${purchaseOrder.purchaseRequest.no}'` : null,

                        purchaseOrderExternalId: purchaseOrderExternal ? `'${purchaseOrderExternal._id}'` : null,
                        purchaseOrderExternalNo: purchaseOrderExternal ? `'${purchaseOrderExternal.no}'` : null,
                        purchaseOrderExternalDate: purchaseOrderExternal ? `'${moment(purchaseOrderExternal.date).format('L')}'` : null,
                        deliveryOrderDays: (poItem.fulfillments.length > 0 && deliveryOrder) ? `${doDays}` : null,
                        deliveryOrderDaysRange: (poItem.fulfillments.length > 0 && deliveryOrder) ? `'${this.getRangeMonth(doDays)}'` : null,
                        supplierCode: purchaseOrderExternal ? `'${purchaseOrderExternal.supplier.code}'` : null,
                        supplierName: purchaseOrderExternal ? `'${purchaseOrderExternal.supplier.name.replace(/'/g, '"')}'` : null,
                        currencyCode: purchaseOrderExternal ? `'${purchaseOrderExternal.currency.code}'` : null,
                        currencyName: purchaseOrderExternal ? `'${purchaseOrderExternal.currency.description}'` : null,
                        paymentMethod: purchaseOrderExternal ? `'${purchaseOrderExternal.paymentMethod}'` : null,
                        currencyRate: purchaseOrderExternal ? `${purchaseOrderExternal.currencyRate}` : null,
                        purchaseQuantity: purchaseOrderExternal ? `${poItem.dealQuantity}` : null,
                        uom: purchaseOrderExternal ? `'${poItem.dealUom.unit}'` : null,
                        pricePerUnit: purchaseOrderExternal ? `${poItem.pricePerDealUnit}` : null,
                        totalPrice: purchaseOrderExternal ? `${poItem.dealQuantity * poItem.pricePerDealUnit * purchaseOrderExternal.currencyRate}` : null,
                        expectedDeliveryDate: purchaseOrderExternal ? `'${moment(purchaseOrderExternal.expectedDeliveryDate).format('L')}'` : null,
                        prNoAtPoExt: purchaseOrderExternal ? `'${purchaseOrder.purchaseRequest.no}'` : null,

                        deliveryOrderId: (poItem.fulfillments.length > 0 && deliveryOrder) ? `'${deliveryOrder._id}'` : null,
                        deliveryOrderNo: (poItem.fulfillments.length > 0 && deliveryOrder) ? `'${deliveryOrder.no}'` : null,
                        deliveryOrderDate: (poItem.fulfillments.length > 0 && deliveryOrder) ? `'${moment(deliveryOrder.date).format('L')}'` : null,
                        unitReceiptNoteDays: unitReceiptNote ? `${urnDays}` : null,
                        unitReceiptNoteDaysRange: unitReceiptNote ? `'${this.getRangeWeek(urnDays)}'` : null,
                        status: (poItem.fulfillments.length > 0 && deliveryOrder) ? `'${this.getStatus(purchaseOrderExternal.expectedDeliveryDate, lastDeliveredDate)}'` : null,
                        prNoAtDo: (poItem.fulfillments.length > 0 && deliveryOrder) ? `'${purchaseOrder.purchaseRequest.no}'` : null,

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
                        invoicePrice: unitPaymentOrder ? `'${poItem.pricePerDealUnit}'` : null,
                    };
                });
                return [].concat.apply([], results);
            }
            else if (item.purchaseRequest) {
                var results = purchaseRequest.items.map((poItem) => {
                    var catType = purchaseRequest.category.name;

                    return {
                        purchaseRequestId: purchaseRequest ? `'${purchaseRequest._id}'` : null,
                        purchaseRequestNo: purchaseRequest ? `'${purchaseRequest.no}'` : null,
                        purchaseRequestDate: purchaseRequest ? `'${moment(purchaseRequest.date).format('L')}'` : null,
                        expectedPRDeliveryDate: purchaseRequest ? `'${moment(purchaseRequest.expectedDeliveryDate).format('L')}'` : null,
                        budgetCode: purchaseRequest ? `'${purchaseRequest.budget.code}'` : null,
                        budgetName: purchaseRequest ? `'${purchaseRequest.budget.name}'` : null,
                        unitCode: purchaseRequest ? `'${purchaseRequest.unit.code}'` : null,
                        unitName: purchaseRequest ? `'${purchaseRequest.unit.name}'` : null,
                        divisionCode: purchaseRequest ? `'${purchaseRequest.unit.division.code}'` : null,
                        divisionName: purchaseRequest ? `'${purchaseRequest.unit.division.name}'` : null,
                        categoryCode: purchaseRequest ? `'${purchaseRequest.category.code}'` : null,
                        categoryName: purchaseRequest ? `'${purchaseRequest.category.name}'` : null,
                        categoryType: purchaseRequest ? `'${this.getCategoryType(catType)}'` : null,
                        productCode: purchaseRequest ? `'${poItem.product.code}'` : null,
                        productName: purchaseRequest ? `'${poItem.product.name.replace(/'/g, '"')}'` : null,
                        purchaseRequestDays: null,
                        purchaseRequestDaysRange: null,
                        prPurchaseOrderExternalDays: null,
                        prPurchaseOrderExternalDaysRange: null,

                        purchaseOrderId: null,
                        purchaseOrderNo: null,
                        purchaseOrderDate: null,
                        purchaseOrderExternalDays: null,
                        purchaseOrderExternalDaysRange: null,
                        purchasingStaffName: null,
                        prNoAtPo: null,

                        purchaseOrderExternalId: null,
                        purchaseOrderExternalNo: null,
                        purchaseOrderExternalDate: null,
                        deliveryOrderDays: null,
                        deliveryOrderDaysRange: null,
                        supplierCode: null,
                        supplierName: null,
                        currencyCode: null,
                        currencyName: null,
                        paymentMethod: null,
                        currencyRate: null,
                        purchaseQuantity: null,
                        uom: null,
                        pricePerUnit: null,
                        totalPrice: null,
                        expectedDeliveryDate: null,
                        prNoAtPoExt: null,

                        deliveryOrderId: null,
                        deliveryOrderNo: null,
                        deliveryOrderDate: null,
                        unitReceiptNoteDays: null,
                        unitReceiptNoteDaysRange: null,
                        status: null,
                        prNoAtDo: null,

                        unitReceiptNoteId: null,
                        unitReceiptNoteNo: null,
                        unitReceiptNoteDate: null,
                        unitPaymentOrderDays: null,
                        unitPaymentOrderDaysRange: null,

                        unitPaymentOrderId: null,
                        unitPaymentOrderNo: null,
                        unitPaymentOrderDate: null,
                        purchaseOrderDays: null,
                        purchaseOrderDaysRange: null,
                        invoicePrice: null,
                    };
                });
                return [].concat.apply([], results);
            }
        });
        return Promise.resolve([].concat.apply([], result));
    }

    insertQuery(sql, query) {
        return new Promise((resolve, reject) => {
            sql.query(query, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            })
        })
    }

    load(data) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();

                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);

                        var command = [];

                        var sqlQuery = '';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `INSERT INTO dl_fact_pembelian_temp([id fact pembelian], [id pr], [nomor pr], [tanggal pr], [jumlah selisih hari pr-po internal], [selisih hari pr-po internal], [jumlah selisih hari pr-po eksternal], [selisih hari pr-po eksternal], [tanggal diminta datang], [kode budget], [nama budget], [kode unit], [nama unit], [kode divisi], [nama divisi], [kode kategori], [nama kategori], [jenis kategori], [kode produk], [nama produk], [id po internal], [nomor po internal], [tanggal po internal], [jumlah selisih hari po eksternal-po internal], [selisih hari po internal], [nama staff pembelian], [id po eksternal], [nomor po eksternal], [nomor pr di po eksternal], [tanggal po eksternal], [jumlah selisih hari do-po eksternal], [selisih hari do-po eksternal], [tanggal rencana kedatangan], [kode supplier], [nama supplier], [kode mata uang], [nama mata uang], [metode pembayaran], [nilai mata uang], [jumlah barang], [uom], [harga per unit], [total harga], [id do], [nomor do], [nomor pr di do], [tanggal do], [jumlah selisih hari urn-do], [selisih hari urn-do], [status ketepatan waktu], [id urn], [nomor urn], [tanggal urn], [jumlah selisih hari upo-urn], [selisih hari upo-urn], [id upo], [nomor upo], [tanggal upo], [jumlah selisih hari upo-po internal], [selisih hari upo-po internal], [invoice price], [po internal]) VALUES(${count}, ${item.purchaseRequestId}, ${item.purchaseRequestNo}, ${item.purchaseRequestDate}, ${item.purchaseRequestDays}, ${item.purchaseRequestDaysRange}, ${item.prPurchaseOrderExternalDays}, ${item.prPurchaseOrderExternalDaysRange}, ${item.expectedPRDeliveryDate}, ${item.budgetCode}, ${item.budgetName}, ${item.unitCode}, ${item.unitName}, ${item.divisionCode}, ${item.divisionName}, ${item.categoryCode}, ${item.categoryName}, ${item.categoryType}, ${item.productCode}, ${item.productName}, ${item.purchaseOrderId}, ${item.purchaseOrderNo}, ${item.purchaseOrderDate}, ${item.purchaseOrderExternalDays}, ${item.purchaseOrderExternalDaysRange}, ${item.purchasingStaffName}, ${item.purchaseOrderExternalId}, ${item.purchaseOrderExternalNo}, ${item.prNoAtPoExt}, ${item.purchaseOrderExternalDate}, ${item.deliveryOrderDays}, ${item.deliveryOrderDaysRange}, ${item.expectedDeliveryDate}, ${item.supplierCode}, ${item.supplierName}, ${item.currencyCode}, ${item.currencyName}, ${item.paymentMethod}, ${item.currencyRate}, ${item.purchaseQuantity}, ${item.uom}, ${item.pricePerUnit}, ${item.totalPrice}, ${item.deliveryOrderId}, ${item.deliveryOrderNo}, ${item.prNoAtDo}, ${item.deliveryOrderDate}, ${item.unitReceiptNoteDays}, ${item.unitReceiptNoteDaysRange}, ${item.status}, ${item.unitReceiptNoteId}, ${item.unitReceiptNoteNo}, ${item.unitReceiptNoteDate}, ${item.unitPaymentOrderDays}, ${item.unitPaymentOrderDaysRange}, ${item.unitPaymentOrderId}, ${item.unitPaymentOrderNo}, ${item.unitPaymentOrderDate}, ${item.purchaseOrderDays}, ${item.purchaseOrderDaysRange}, ${item.invoicePrice}, ${item.prNoAtPo}); \n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 == 0) {
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        if (sqlQuery != "")
                            command.push(this.insertQuery(request, `${sqlQuery}`));

                        this.sql.multiple = true;

                        // var fs = require("fs");
                        // var path = "C:\\Users\\daniel.nababan.MOONLAY\\Desktop\\sqlQuery.txt";

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("DL_UPSERT_FACT_PEMBELIAN").then((execResult) => {
                                    request.execute("DL_INSERT_DIMTIME").then((execResult) => {
                                        transaction.commit((err) => {
                                            if (err)
                                                reject(err);
                                            else
                                                resolve(results);
                                        });
                                    }).catch((error) => {
                                        transaction.rollback((err) => {
                                            console.log("rollback")
                                            if (err)
                                                reject(err)
                                            else
                                                reject(error);
                                        });
                                    })
                                }).catch((error) => {
                                    transaction.rollback((err) => {
                                        console.log("rollback")
                                        if (err)
                                            reject(err)
                                        else
                                            reject(error);
                                    });
                                })
                            })
                            .catch((error) => {
                                transaction.rollback((err) => {
                                    console.log("rollback");
                                    if (err)
                                        reject(err)
                                    else
                                        reject(error);
                                });
                            });
                    })
                    .catch((err) => {
                        reject(err);
                    })
                })
                .catch((err) => {
                    reject(err);
                })
        })
        .catch((err) => {
            reject(err);
        })
    }
}