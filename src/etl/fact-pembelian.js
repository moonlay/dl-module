'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var PurchaseRequestManager = require("../managers/purchasing/purchase-request-manager");
var PurchaseOrderManager = require('../managers/purchasing/purchase-order-manager');

module.exports = class FactPurchasingEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
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
            .then((purchaseRequest) => this.joinPurchaseOrder(purchaseRequest));
    }

    removeDuplicates(arr) {
        var new_arr = [];
        var lookup = {};

        for (var i in arr) {

            if (arr) {
                lookup[arr[i].no] = arr[i];
            }
        }

        for (i in lookup) {
            if (lookup) {
                new_arr.push(lookup[i]);
            }
        }

        return Promise.resolve(new_arr);
    }

    getRangeMonth(days) {
        if (days <= 30) {
            return "0-30 hari";
        } else if (days >= 31 && days <= 60) {
            return "31-60 hari";
        } else if (days >= 61 && days <= 90) {
            return "61-90 hari";
        } else if (days > 90) {
            return ">90 hari";
        }
    };

    getRangeWeek(days) {
        if (days <= 7) {
            return "0-7 hari";
        } else if (days >= 8 && days <= 14) {
            return "8-14 hari";
        } else if (days >= 15 && days <= 30) {
            return "15-30 hari";
        } else if (days > 30) {
            return ">30 hari";
        }
    };

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

            if (item.purchaseOrder) {

                var results = purchaseOrder.items.map((poItem) => {
                    var catType = purchaseRequest.category ? purchaseRequest.category.name : null;

                    if (poItem.fulfillments.length > 0) {

                        return poItem.fulfillments.map((poFulfillment) => {
                            var prPoExtDays = purchaseOrder.purchaseOrderExternal ? moment(moment(purchaseOrder.purchaseOrderExternal.date).startOf("day")).diff(moment(moment(purchaseRequest.date).startOf("day")), "days") : null;
                            var poIntDays = purchaseOrder._createdDate ? moment(moment(purchaseOrder._createdDate).startOf("day")).diff(moment(moment(purchaseRequest.date).startOf("day")), "days") : null;
                            var poExtDays = purchaseOrder.purchaseOrderExternal ? moment(moment(purchaseOrder.purchaseOrderExternal.date).startOf("day")).diff(moment(moment(purchaseOrder._createdDate).startOf("day")), "days") : null;
                            var doDays = poFulfillment.deliveryOrderDate ? moment(moment(poFulfillment.deliveryOrderDate).startOf("day")).diff(moment(moment(purchaseOrder.purchaseOrderExternal.date).startOf("day")), "days") : null;
                            var urnDays = poFulfillment.unitReceiptNoteDate ? moment(moment(poFulfillment.unitReceiptNoteDate).startOf("day")).diff(moment(moment(poFulfillment.deliveryOrderDate).startOf("day")), "days") : null;
                            var upoDays = poFulfillment.interNoteDate ? moment(moment(poFulfillment.interNoteDate).startOf("day")).diff(moment(moment(poFulfillment.unitReceiptNoteDate).startOf("day")), "days") : null;
                            var poDays = poFulfillment.interNoteDate ? moment(moment(poFulfillment.interNoteDate).startOf("day")).diff(moment(moment(purchaseOrder._createdDate).startOf("day")), "days") : null;
                            var lastDeliveredDate = poFulfillment.deliveryOrderDate ? poItem.fulfillments[poItem.fulfillments.length - 1].deliveryOrderDate : null;
                            var catType = purchaseRequest.category ? purchaseRequest.category.name : null;

                            return {
                                purchaseRequestNo: purchaseRequest.no ? `'${purchaseRequest.no}'` : null,
                                purchaseRequestDate: purchaseRequest.date ? `'${moment(purchaseRequest.date).format('L')}'` : null,
                                expectedPRDeliveryDate: purchaseRequest.expectedDeliveryDate ? `'${moment(purchaseRequest.expectedDeliveryDate).format('L')}'` : null,
                                budgetCode: purchaseRequest.budget ? `'${purchaseRequest.budget.code}'` : null,
                                budgetName: purchaseRequest.budget ? `'${purchaseRequest.budget.name}'` : null,
                                unitCode: purchaseRequest.unit ? `'${purchaseRequest.unit.code}'` : null,
                                unitName: purchaseRequest.unit ? `'${purchaseRequest.unit.name}'` : null,
                                divisionCode: purchaseRequest.unit ? `'${purchaseRequest.unit.division.code}'` : null,
                                divisionName: purchaseRequest.unit ? `'${purchaseRequest.unit.division.name}'` : null,
                                categoryCode: purchaseRequest.category ? `'${purchaseRequest.category.code}'` : null,
                                categoryName: purchaseRequest.category ? `'${purchaseRequest.category.name}'` : null,
                                categoryType: purchaseRequest.category ? `'${this.getCategoryType(catType)}'` : null,
                                productCode: poItem.product ? `'${poItem.product.code}'` : null,
                                productName: poItem.product ? `'${poItem.product.name.replace(/'/g, '"')}'` : null,
                                purchaseRequestDays: purchaseOrder._createdDate ? `${poIntDays}` : null,
                                purchaseRequestDaysRange: purchaseOrder._createdDate ? `'${this.getRangeWeek(poIntDays)}'` : null,
                                prPurchaseOrderExternalDays: purchaseOrder.purchaseOrderExternal ? `${prPoExtDays}` : null,
                                prPurchaseOrderExternalDaysRange: purchaseOrder.purchaseOrderExternal ? `'${this.getRangeWeek(prPoExtDays)}'` : null,

                                purchaseOrderNo: purchaseOrder.no ? `'${purchaseOrder.no}'` : null,
                                purchaseOrderDate: purchaseOrder._createdDate ? `'${moment(purchaseOrder._createdDate).format('L')}'` : null,
                                purchaseOrderExternalDays: purchaseOrder.purchaseOrderExternal ? `${poExtDays}` : null,
                                purchaseOrderExternalDaysRange: purchaseOrder.purchaseOrderExternal ? `'${this.getRangeWeek(poExtDays)}'` : null,
                                purchasingStaffName: purchaseOrder._createdBy ? `'${purchaseOrder._createdBy}'` : null,
                                prNoAtPo: purchaseRequest.no ? `'${purchaseRequest.no}'` : null,

                                purchaseOrderExternalNo: purchaseOrder.purchaseOrderExternal ? `'${purchaseOrder.purchaseOrderExternal.no}'` : null,
                                purchaseOrderExternalDate: purchaseOrder.purchaseOrderExternal ? `'${moment(purchaseOrder.purchaseOrderExternal.date).format('L')}'` : null,
                                deliveryOrderDays: poFulfillment.deliveryOrderDate ? `${doDays}` : null,
                                deliveryOrderDaysRange: poFulfillment.deliveryOrderDate ? `'${this.getRangeMonth(doDays)}'` : null,
                                supplierCode: purchaseOrder.purchaseOrderExternal && purchaseOrder.purchaseOrderExternal.supplier ? `'${purchaseOrder.purchaseOrderExternal.supplier.code}'` : null,
                                supplierName: purchaseOrder.purchaseOrderExternal && purchaseOrder.purchaseOrderExternal.supplier ? `'${purchaseOrder.purchaseOrderExternal.supplier.name.replace(/'/g, '"')}'` : null,
                                currencyCode: purchaseOrder.purchaseOrderExternal && purchaseOrder.purchaseOrderExternal.currency ? `'${purchaseOrder.purchaseOrderExternal.currency.code}'` : null,
                                currencyName: purchaseOrder.purchaseOrderExternal && purchaseOrder.purchaseOrderExternal.currency ? `'${purchaseOrder.purchaseOrderExternal.currency.description}'` : null,
                                paymentMethod: purchaseOrder.purchaseOrderExternal && purchaseOrder.purchaseOrderExternal.paymentMethod ? `'${purchaseOrder.purchaseOrderExternal.paymentMethod}'` : null,
                                currencyRate: purchaseOrder.purchaseOrderExternal && purchaseOrder.purchaseOrderExternal.currencyRate ? `${purchaseOrder.purchaseOrderExternal.currencyRate}` : null,
                                purchaseQuantity: poItem.dealQuantity ? `${poItem.dealQuantity}` : null,
                                uom: poItem.dealUom ? `'${poItem.dealUom.unit}'` : null,
                                pricePerUnit: poItem.pricePerDealUnit ? `${poItem.pricePerDealUnit}` : null,
                                totalPrice: (purchaseOrder.purchaseOrderExternal && poItem.pricePerDealUnit && poItem.dealQuantity) ? `${poItem.dealQuantity * poItem.pricePerDealUnit * purchaseOrder.purchaseOrderExternal.currencyRate}` : null,
                                expectedDeliveryDate: purchaseOrder.purchaseOrderExternal ? `'${moment(purchaseOrder.purchaseOrderExternal.expectedDeliveryDate).format('L')}'` : null,
                                prNoAtPoExt: purchaseOrder.purchaseOrderExternal ? `'${purchaseRequest.no}'` : null,

                                deliveryOrderNo: poFulfillment.deliveryOrderNo ? `'${poFulfillment.deliveryOrderNo}'` : null,
                                deliveryOrderDate: poFulfillment.deliveryOrderDate ? `'${moment(poFulfillment.deliveryOrderDate).format('L')}'` : null,
                                unitReceiptNoteDays: poFulfillment.unitReceiptNoteDate ? `${urnDays}` : null,
                                unitReceiptNoteDaysRange: poFulfillment.unitReceiptNoteDate ? `'${this.getRangeWeek(urnDays)}'` : null,
                                status: poFulfillment.deliveryOrderDate ? `'${this.getStatus(purchaseOrder.purchaseOrderExternal.expectedDeliveryDate, lastDeliveredDate)}'` : null,
                                prNoAtDo: poFulfillment.deliveryOrderNo ? `'${purchaseRequest.no}'` : null,

                                unitReceiptNoteNo: poFulfillment.unitReceiptNoteNo ? `'${poFulfillment.unitReceiptNoteNo}'` : null,
                                unitReceiptNoteDate: poFulfillment.unitReceiptNoteDate ? `'${moment(poFulfillment.unitReceiptNoteDate).format('L')}'` : null,
                                unitPaymentOrderDays: poFulfillment.interNoteDate ? `${upoDays}` : null,
                                unitPaymentOrderDaysRange: poFulfillment.interNoteDate ? `'${this.getRangeWeek(upoDays)}'` : null,

                                unitPaymentOrderNo: poFulfillment.interNoteNo ? `'${poFulfillment.interNoteNo}'` : null,
                                unitPaymentOrderDate: poFulfillment.interNoteDate ? `'${moment(poFulfillment.interNoteDate).format('L')}'` : null,
                                purchaseOrderDays: poFulfillment.interNoteDate ? `${poDays}` : null,
                                purchaseOrderDaysRange: poFulfillment.interNoteDate ? `'${this.getRangeMonth(poDays)}'` : null,
                                invoicePrice: poFulfillment.interNoteDate ? `'${poItem.pricePerDealUnit}'` : null
                            };
                        });
                    } else if (poItem.fulfillments.length === 0) {
                        var prPoExtDays = purchaseOrder.purchaseOrderExternal ? moment(moment(purchaseOrder.purchaseOrderExternal.date).startOf("day")).diff(moment(moment(purchaseRequest.date).startOf("day")), "days") : null;
                        var poExtDays = purchaseOrder.purchaseOrderExternal ? moment(moment(purchaseOrder.purchaseOrderExternal.date).startOf("day")).diff(moment(moment(purchaseOrder._createdDate).startOf("day")), "days") : null;
                        var poIntDays = purchaseOrder ? moment(moment(purchaseOrder._createdDate).startOf("day")).diff(moment(moment(purchaseRequest.date).startOf("day")), "days") : null;
                        return {
                            purchaseRequestNo: purchaseRequest ? `'${purchaseRequest.no}'` : null,
                            purchaseRequestDate: purchaseRequest ? `'${moment(purchaseRequest.date).format('L')}'` : null,
                            expectedPRDeliveryDate: purchaseRequest ? `'${moment(purchaseRequest.expectedDeliveryDate).format('L')}'` : null,
                            budgetCode: purchaseRequest ? `'${purchaseRequest.budget.code}'` : null,
                            budgetName: purchaseRequest ? `'${purchaseOrder.purchaseRequest.budget.name}'` : null,
                            unitCode: purchaseRequest ? `'${purchaseRequest.unit.code}'` : null,
                            unitName: purchaseRequest ? `'${purchaseRequest.unit.name}'` : null,
                            divisionCode: purchaseRequest ? `'${purchaseRequest.unit.division.code}'` : null,
                            divisionName: purchaseRequest ? `'${purchaseRequest.unit.division.name}'` : null,
                            categoryCode: purchaseRequest ? `'${purchaseRequest.category.code}'` : null,
                            categoryName: purchaseRequest ? `'${purchaseRequest.category.name}'` : null,
                            categoryType: purchaseRequest ? `'${this.getCategoryType(catType)}'` : null,
                            productCode: purchaseRequest ? `'${poItem.product.code}'` : null,
                            productName: purchaseRequest ? `'${poItem.product.name.replace(/'/g, '"')}'` : null,
                            purchaseRequestDays: purchaseRequest ? `${poIntDays}` : null,
                            purchaseRequestDaysRange: purchaseRequest ? `'${this.getRangeWeek(poIntDays)}'` : null,
                            prPurchaseOrderExternalDays: purchaseOrder.purchaseOrderExternal ? `${prPoExtDays}` : null,
                            prPurchaseOrderExternalDaysRange: purchaseOrder.purchaseOrderExternal ? `'${this.getRangeWeek(prPoExtDays)}'` : null,

                            purchaseOrderNo: purchaseOrder ? `'${purchaseOrder.no}'` : null,
                            purchaseOrderDate: purchaseOrder ? `'${moment(purchaseOrder._createdDate).format('L')}'` : null,
                            purchaseOrderExternalDays: purchaseOrder.purchaseOrderExternal ? `${poExtDays}` : null,
                            purchaseOrderExternalDaysRange: purchaseOrder.purchaseOrderExternal ? `'${this.getRangeWeek(poExtDays)}'` : null,
                            purchasingStaffName: purchaseOrder ? `'${purchaseOrder._createdBy}'` : null,
                            prNoAtPo: purchaseOrder ? `'${purchaseRequest.no}'` : null,

                            purchaseOrderExternalNo: purchaseOrder.purchaseOrderExternal.no ? `'${purchaseOrder.purchaseOrderExternal.no}'` : null,
                            purchaseOrderExternalDate: purchaseOrder.purchaseOrderExternal.date ? `'${moment(purchaseOrder.purchaseOrderExternal.date).format('L')}'` : null,
                            deliveryOrderDays: null,
                            deliveryOrderDaysRange: null,
                            supplierCode: purchaseOrder.purchaseOrderExternal.supplier ? `'${purchaseOrder.purchaseOrderExternal.supplier.code}'` : null,
                            supplierName: purchaseOrder.purchaseOrderExternal.supplier ? `'${purchaseOrder.purchaseOrderExternal.supplier.name.replace(/'/g, '"')}'` : null,
                            currencyCode: purchaseOrder.purchaseOrderExternal.currency ? `'${purchaseOrder.purchaseOrderExternal.currency.code}'` : null,
                            currencyName: purchaseOrder.purchaseOrderExternal.currency ? `'${purchaseOrder.purchaseOrderExternal.currency.description}'` : null,
                            paymentMethod: purchaseOrder.purchaseOrderExternal.paymentMethod ? `'${purchaseOrder.purchaseOrderExternal.paymentMethod}'` : null,
                            currencyRate: purchaseOrder.purchaseOrderExternal.currencyRate ? `${purchaseOrder.purchaseOrderExternal.currencyRate}` : null,
                            purchaseQuantity: poItem.defaultQuantity ? `${poItem.defaultQuantity}` : null,
                            uom: poItem.defaultUom ? `'${poItem.defaultUom.unit}'` : null,
                            pricePerUnit: purchaseOrder.purchaseOrderExternal.no ? `${poItem.pricePerDealUnit}` : null,
                            totalPrice: (purchaseOrder.purchaseOrderExternal.currencyRate && poItem.pricePerDealUnit && poItem.dealQuantity) ? `${poItem.dealQuantity * poItem.pricePerDealUnit * purchaseOrder.purchaseOrderExternal.currencyRate}` : null,
                            expectedDeliveryDate: purchaseOrder.purchaseOrderExternal.no ? `'${moment(purchaseOrder.purchaseOrderExternal.expectedDeliveryDate).format('L')}'` : null,
                            prNoAtPoExt: purchaseOrder.purchaseOrderExternal.no ? `'${purchaseRequest.no}'` : null,

                            deliveryOrderNo: null,
                            deliveryOrderDate: null,
                            unitReceiptNoteDays: null,
                            unitReceiptNoteDaysRange: null,
                            status: null,
                            prNoAtDo: null,

                            unitReceiptNoteNo: null,
                            unitReceiptNoteDate: null,
                            unitPaymentOrderDays: null,
                            unitPaymentOrderDaysRange: null,

                            unitPaymentOrderNo: null,
                            unitPaymentOrderDate: null,
                            purchaseOrderDays: null,
                            purchaseOrderDaysRange: null,
                            invoicePrice: null
                        }
                    }
                });
                return [].concat.apply([], results);
            }
            else if (item.purchaseRequest) {
                var results = purchaseRequest.items.map((poItem) => {
                    var catType = purchaseRequest.category.name;

                    return {
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

                        purchaseOrderNo: null,
                        purchaseOrderDate: null,
                        purchaseOrderExternalDays: null,
                        purchaseOrderExternalDaysRange: null,
                        purchasingStaffName: null,
                        prNoAtPo: null,

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
                        purchaseQuantity: poItem.quantity ? `${poItem.quantity}` : null,
                        uom: poItem.product.uom ? `'${poItem.product.uom.unit}'` : null,
                        pricePerUnit: null,
                        totalPrice: null,
                        expectedDeliveryDate: null,
                        prNoAtPoExt: null,

                        deliveryOrderNo: null,
                        deliveryOrderDate: null,
                        unitReceiptNoteDays: null,
                        unitReceiptNoteDaysRange: null,
                        status: null,
                        prNoAtDo: null,

                        unitReceiptNoteNo: null,
                        unitReceiptNoteDate: null,
                        unitPaymentOrderDays: null,
                        unitPaymentOrderDaysRange: null,

                        unitPaymentOrderNo: null,
                        unitPaymentOrderDate: null,
                        purchaseOrderDays: null,
                        purchaseOrderDaysRange: null,
                        invoicePrice: null
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
                                var queryString = `INSERT INTO dl_fact_pembelian_temp([Nomor PR], [Tanggal PR], [Tanggal Diminta Datang], [Kode Budget], [Nama Budget], [Kode Unit], [Nama Unit], [Kode Divisi], [Nama Divisi], [Kode Kategori], [Nama Kategori], [Jenis Kategori], [Kode Produk], [Nama Produk], [Jumlah Selisih Hari PR-PO Internal], [Selisih Hari PR-PO Internal], [Jumlah Selisih Hari PR-PO Eksternal], [Selisih Hari PR-PO Eksternal], [Nomor PO Internal], [Tanggal PO Internal], [Jumlah Selisih Hari PO Eksternal-PO Internal], [Selisih Hari PO Eksternal-PO Internal], [Nama Staff Pembelian], [Nomor PR di PO Internal], [Nomor PO Eksternal], [Tanggal PO Eksternal], [Jumlah Selisih Hari DO-PO Eksternal], [Selisih Hari DO-PO Eksternal], [Kode Supplier], [Nama Supplier], [Kode Mata Uang], [Nama Mata Uang], [Metode Pembayaran], [Nilai Mata Uang], [Jumlah Barang], [UOM], [Harga Per Unit], [Total Harga], [Tanggal Rencana Kedatangan], [Nomor PR di PO Eksternal], [Nomor DO], [Tanggal DO], [Jumlah Selisih Hari URN-DO], [Selisih Hari URN-DO], [Status Ketepatan Waktu], [Nomor PR di DO], [Nomor URN], [Tanggal URN], [Jumlah Selisih Hari UPO-URN], [Selisih Hari UPO-URN], [Nomor UPO], [Tanggal UPO], [Jumlah Selisih Hari UPO-PO Internal], [Selisih Hari UPO-PO Internal], [Harga Sesuai Invoice]) VALUES(${item.purchaseRequestNo}, ${item.purchaseRequestDate}, ${item.expectedPRDeliveryDate}, ${item.budgetCode}, ${item.budgetName}, ${item.unitCode}, ${item.unitName}, ${item.divisionCode}, ${item.divisionName}, ${item.categoryCode}, ${item.categoryName}, ${item.categoryType}, ${item.productCode}, ${item.productName}, ${item.purchaseRequestDays}, ${item.purchaseRequestDaysRange}, ${item.prPurchaseOrderExternalDays}, ${item.prPurchaseOrderExternalDaysRange}, ${item.purchaseOrderNo}, ${item.purchaseOrderDate}, ${item.purchaseOrderExternalDays}, ${item.purchaseOrderExternalDaysRange}, ${item.purchasingStaffName}, ${item.prNoAtPo}, ${item.purchaseOrderExternalNo}, ${item.purchaseOrderExternalDate}, ${item.deliveryOrderDays}, ${item.deliveryOrderDaysRange}, ${item.supplierCode}, ${item.supplierName}, ${item.currencyCode}, ${item.currencyName}, ${item.paymentMethod}, ${item.currencyRate}, ${item.purchaseQuantity}, ${item.uom}, ${item.pricePerUnit}, ${item.totalPrice}, ${item.expectedDeliveryDate}, ${item.prNoAtPoExt}, ${item.deliveryOrderNo}, ${item.deliveryOrderDate}, ${item.unitReceiptNoteDays}, ${item.unitReceiptNoteDaysRange}, ${item.status}, ${item.prNoAtDo}, ${item.unitReceiptNoteNo}, ${item.unitReceiptNoteDate}, ${item.unitPaymentOrderDays}, ${item.unitPaymentOrderDaysRange}, ${item.unitPaymentOrderNo}, ${item.unitPaymentOrderDate}, ${item.purchaseOrderDays}, ${item.purchaseOrderDaysRange}, ${item.invoicePrice});\n`;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 == 0) {
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = "";
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }


                        if (sqlQuery !== "")

                            command.push(this.insertQuery(request, `${sqlQuery}`));

                        this.sql.multiple = true;

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