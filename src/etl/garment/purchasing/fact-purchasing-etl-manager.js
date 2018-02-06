'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");

// internal deps 
require("mongodb-toolkit");

var PurchaseRequestManager = require("../../../managers/garment-purchasing/purchase-request-manager");
var PurchaseOrderManager = require("../../../managers/garment-purchasing/purchase-order-manager");

const PR_FIELDS = {
    "_createdBy": 1,
    "_createdDate": 1,
    "_deleted": 1,
    "no": 1,
    "roNo": 1,
    "buyer.code": 1,
    "buyer.name": 1,
    "artikel": 1,
    "date": 1,
    "expectedDeliveryDate": 1,
    "shipmentDate": 1,
    "unit.code": 1,
    "unit.name": 1,
    "unit.division.code": 1,
    "unit.division.name": 1,
    "isPosted": 1,
    "isUsed": 1,
    "items.refNo": 1,
    "items.id_po": 1,
    "items.product.code": 1,
    "items.product.name": 1,
    "items.product.price": 1,
    "items.product.currency.code": 1,
    "items.product.currency.symbol": 1,
    "items.product.currency.rate": 1,
    "items.quantity": 1,
    "items.budgetPrice": 1,
    "items.uom.unit": 1,
    "items.category.code": 1,
    "items.category.name": 1,
    "items.isUsed": 1,
};

const PO_INTERNAL_FIELDS = {
    "_createdBy": 1,
    "_createdDate": 1,
    "_deleted": 1,
    "iso": 1,
    "no": 1,
    "refNo": 1,
    "roNo": 1,
    "buyer.code": 1,
    "buyer.name": 1,
    "artikel": 1,
    "unit.code": 1,
    "unit.name": 1,
    "unit.division.code": 1,
    "date": 1,
    "expectedDeliveryDate": 1,
    "shipmentDate": 1,
    "isPosted": 1,
    "isClosed": 1,
    "isSplit": 1,
    "items.refNo": 1,
    "items.product.code": 1,
    "items.product.name": 1,
    "items.product.price": 1,
    "items.product.currency.code": 1,
    "items.product.currency.symbol": 1,
    "items.product.currency.rate": 1,
    "items.product.uom.unit": 1,
    "items.defaultQuantity": 1,
    "items.defaultUom.unit": 1,
    "items.dealQuantity": 1,
    "items.dealUom.unit": 1,
    "items.realizationQuantity": 1,
    "items.pricePerDealUnit": 1,
    "items.priceBeforeTax": 1,
    "items.budgetPrice": 1,
    "items.currency.code": 1,
    "items.currency.symbol": 1,
    "items.currency.rate": 1,
    "items.category.code": 1,
    "items.category.name": 1,
    "items.conversion": 1,
    "items.isPosted": 1,
    "items.isClosed": 1,
    "items.purchaseOrderExternal._createdDate": 1,
    "items.purchaseOrderExternal.no": 1,
    "items.purchaseOrderExternal.paymentType": 1,
    "items.purchaseOrderExternal.date": 1,
    "items.purchaseOrderExternal.expectedDeliveryDate": 1,
    "items.purchaseOrderExternal.isPosted": 1,
    "items.purchaseOrderExternal.isClosed": 1,
    "items.purchaseOrderExternal.status.name": 1,
    "items.purchaseOrderExternal.status.label": 1,
    "items.supplier.code": 1,
    "items.supplier.name": 1,
    "items.freightCostBy": 1,
    "items.paymentMethod": 1,
    "items.paymentDueDays": 1,
    "items.useVat": 1,
    "items.vatRate": 1,
    "items.useIncomeTax": 1,
    "items.status.name": 1,
    "items.status.label": 1,
    "items.id_po": 1,
    "items.fulfillments.deliveryOrderNo": 1,
    "items.fulfillments.deliveryOrderDeliveredQuantity": 1,
    "items.fulfillments.deliveryOrderDate": 1,
    "items.fulfillments.supplierDoDate": 1,
    "items.fulfillments.unitReceiptNoteNo": 1,
    "items.fulfillments.unitReceiptNoteDate": 1,
    "items.fulfillments.unitReceiptNoteDeliveredQuantity": 1,
    "items.fulfillments.unitReceiptNoteDeliveredUom.unit": 1,
    "items.fulfillments.interNoteNo": 1,
    "items.fulfillments.interNoteDate": 1,
    "items.fulfillments.interNotePrice": 1,
    "items.fulfillments.interNoteQuantity": 1,
    "items.fulfillments.interNoteDueDate": 1
};

const DESCRIPTION = "Fact Pembelian Garment from MongoDB to Azure DWH";

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
            description: DESCRIPTION,
            start: startedDate,
        })
        return this.timestamp()
            .then((times) => this.extract(times))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then((results) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: DESCRIPTION,
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
                    description: DESCRIPTION,
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
            description: DESCRIPTION,
            status: "Successful"
        }, { "start": 1 }).sort({ finish: -1 }).limit(1).toArray()
    }

    extractPOInternal(timestamp) { //Mengambil PO Internal Terbaru
        return this.purchaseOrderManager.collection.find({
            _createdBy: {
                "$nin": ["dev", "unit-test"]
            },
            _updatedDate: {
                "$gte": timestamp
            }
        }, { "purchaseRequest.no": 1, "purchaseRequestId": 1 }).toArray()
    }

    // getPRNumbersFromPOInternal(purchaseOrders) { //Mengambil Nomor Purchase Request dari PO Internal Terbaru
    //     var purchaseRequestNumbers = purchaseOrders.map((purchaseOrder) => {
    //         return purchaseOrder.purchaseRequest.no;
    //     })
    //     return Promise.all(purchaseRequestNumbers)
    // }

    extract(times) {
        var timestamp = times.length > 0 ? new Date(times[0].start) : new Date("1970-01-01");
        return this.extractPOInternal(timestamp)
            .then((purchaseOrders) => {
                var purchaseRequestNumbers = purchaseOrders.map((purchaseOrder) => {
                    return purchaseOrder.purchaseRequest.no;
                })
                return this.purchaseRequestManager.collection.find({
                    "$or": [
                        { "_updatedDate": { "$gte": timestamp } },
                        { "no": { "$in": purchaseRequestNumbers } }
                    ]
                }, PR_FIELDS).toArray()
            }).then((purchaseRequests) => {
                return this.joinPurchaseOrder(purchaseRequests)
            });
    }

    joinPurchaseOrder(purchaseRequests) {
        var joinPurchaseOrders = purchaseRequests.map((purchaseRequest) => {
            return this.purchaseOrderManager.collection.find({
                _deleted: false,
                purchaseRequestId: new ObjectId(purchaseRequest._id)
            }, PO_INTERNAL_FIELDS).toArray()
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
            .then(((joinPurchaseOrder) => {
                return Promise.resolve([].concat.apply([], joinPurchaseOrder));
            }));
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

    getCategoryType(categoryCode) {
        var categoryList = ["emb", "wsh", "pls", "prn", "tes", "qlt"];
        var found = categoryList.find((category) => category === categoryCode.toString().toLowerCase());
        if (categoryCode.toString().toLowerCase() === "fab") {
            return "Bahan Baku";
        } else if (found) {
            return "Jasa";
        } else {
            return "Accessories";
        }
    }

    getStatus(poDate, doDate) {
        var result = moment(moment(doDate).add(7, "h").startOf("day")).diff(moment(moment(poDate).add(7, "h").startOf("day")), "days")
        if (result <= 0) {
            return "Tepat Waktu";
        } else {
            return "Tidak Tepat Waktu";
        }
    }

    transform(objects) {
        var result = objects.map((object) => {
            var purchaseRequest = object.purchaseRequest;
            var purchaseOrder = object.purchaseOrder;

            if (purchaseOrder) {

                var results = purchaseOrder.items.map((poItem) => {
                    // var catType = (purchaseRequest.category && purchaseRequest.category.name) ? purchaseRequest.category.name : null;

                    if (poItem.fulfillments.length > 0) {

                        return poItem.fulfillments.map((poFulfillment) => {
                            var prPoExtDays = (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal._createdDate) ? moment(moment(poItem.purchaseOrderExternal._createdDate).add(7, "h").startOf("day")).diff(moment(moment(purchaseRequest._createdDate).add(7, "h").startOf("day")), "days") : null;
                            var poExtDays = (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal._createdDate) ? moment(moment(poItem.purchaseOrderExternal._createdDate).add(7, "h").startOf("day")).diff(moment(moment(purchaseOrder._createdDate).add(7, "h").startOf("day")), "days") : null;
                            var poIntDays = purchaseOrder._createdDate ? moment(moment(purchaseOrder._createdDate).add(7, "h").startOf("day")).diff(moment(moment(purchaseRequest._createdDate).add(7, "h").startOf("day")), "days") : null;
                            var doDays = (poFulfillment.deliveryOrderDate && poItem.purchaseOrderExternal && poItem.purchaseOrderExternal._createdDate) ? moment(moment(poFulfillment.deliveryOrderDate).add(7, "h").startOf("day")).diff(moment(moment(poItem.purchaseOrderExternal._createdDate).add(7, "h").startOf("day")), "days") : null;
                            var urnDays = poFulfillment.unitReceiptNoteDate ? moment(moment(poFulfillment.unitReceiptNoteDate).add(7, "h").startOf("day")).diff(moment(moment(poFulfillment.deliveryOrderDate).add(7, "h").startOf("day")), "days") : null;
                            var upoDays = poFulfillment.interNoteDate ? moment(moment(poFulfillment.interNoteDate).add(7, "h").startOf("day")).diff(moment(moment(poFulfillment.unitReceiptNoteDate).add(7, "h").startOf("day")), "days") : null;
                            var poDays = poFulfillment.interNoteDate ? moment(moment(poFulfillment.interNoteDate).add(7, "h").startOf("day")).diff(moment(moment(purchaseOrder._createdDate).add(7, "h").startOf("day")), "days") : null;
                            var lastDeliveredDate = poFulfillment.deliveryOrderDate ? poItem.fulfillments[poItem.fulfillments.length - 1].deliveryOrderDate : null;

                            return {
                                purchaseRequestNo: purchaseRequest.no ? `'${purchaseRequest.no.replace(/'/g, '"')}'` : null, //Nomor PR
                                purchaseRequestDate: purchaseRequest._createdDate ? `'${moment(purchaseRequest._createdDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal PR
                                expectedPRDeliveryDate: purchaseRequest.expectedDeliveryDate ? `'${moment(purchaseRequest.expectedDeliveryDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal Diminta Datang
                                unitCode: (purchaseRequest.unit && purchaseRequest.unit.code) ? `'${purchaseRequest.unit.code.replace(/'/g, '"')}'` : null, //Kode Unit
                                unitName: (purchaseRequest.unit && purchaseRequest.unit.name) ? `'${purchaseRequest.unit.name.replace(/'/g, '"')}'` : null, //Nama Unit
                                divisionCode: (purchaseRequest.unit && purchaseRequest.unit.division && purchaseRequest.unit.division.code) ? `'${purchaseRequest.unit.division.code.replace(/'/g, '"')}'` : null, //Kode Divisi
                                divisionName: (purchaseRequest.unit && purchaseRequest.unit.division && purchaseRequest.unit.division.name) ? `'${purchaseRequest.unit.division.name.replace(/'/g, '"')}'` : null, //Nama Divisi
                                categoryCode: (poItem.category && poItem.category.code) ? `'${poItem.category.code.replace(/'/g, '"')}'` : null, //Kode Kategori
                                categoryName: (poItem.category && poItem.category.name) ? `'${poItem.category.name.replace(/'/g, '"')}'` : null, //Nama Kategori
                                categoryType: (poItem.category && poItem.category.code) ? `'${this.getCategoryType(poItem.category.code.replace(/'/g, '"'))}'` : null, //Jenis Kategori
                                productCode: (poItem.product && poItem.product.code) ? `'${poItem.product.code}'` : null, //Kode Produk
                                productName: (poItem.product && poItem.product.name) ? `'${poItem.product.name.replace(/'/g, '"')}'` : null, //Nama Produk
                                purchaseRequestDays: `${poIntDays}`, //Jumlah Selisih Hari PR-PO Internal
                                purchaseRequestDaysRange: poIntDays !== null ? `'${this.getRangeWeek(poIntDays)}'` : null, //Selisih Hari PR-PO Internal
                                prPurchaseOrderExternalDays: `${prPoExtDays}`, //Jumlah Selisih Hari PR-PO Eksternal
                                prPurchaseOrderExternalDaysRange: prPoExtDays !== null ? `'${this.getRangeWeek(prPoExtDays)}'` : null, //Selisih Hari PR-PO Eksternal
                                deletedPR: `'${purchaseRequest._deleted}'`,

                                purchaseOrderNo: purchaseOrder.no ? `'${purchaseOrder.no}'` : null, //Nomor PO Internal
                                purchaseOrderDate: purchaseOrder._createdDate ? `'${moment(purchaseOrder._createdDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal PO Internal
                                purchaseOrderExternalDays: `${poExtDays}`, //Jumlah Selisih Hari PO Internal-PO Eksternal
                                purchaseOrderExternalDaysRange: poExtDays !== null ? `'${this.getRangeWeek(poExtDays)}'` : null, //Selisih Hari PO Internal-PO Eksternal
                                purchasingStaffName: purchaseOrder._createdBy ? `'${purchaseOrder._createdBy}'` : null, //Nama Staff Pembelian
                                prNoAtPo: purchaseRequest.no ? `'${purchaseRequest.no}'` : null, //Nomor PR di PO Internal
                                deletedPO: `'${purchaseOrder._deleted}'`,

                                purchaseOrderExternalNo: (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal.no) ? `'${poItem.purchaseOrderExternal.no}'` : null, // Nomor PO Eksternal
                                purchaseOrderExternalDate: (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal._createdDate) ? `'${moment(poItem.purchaseOrderExternal._createdDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal PO Eksternal
                                deliveryOrderDays: poFulfillment.deliveryOrderDate ? `${doDays}` : null, //Jumlah Selisih Hari DO-PO Eksternal
                                deliveryOrderDaysRange: poFulfillment.deliveryOrderDate ? `'${this.getRangeMonth(doDays)}'` : null, //Selisih Hari DO-PO Eksternal
                                supplierCode: (poItem.purchaseOrderExternal && poItem.supplier && poItem.supplier.code !== "") ? `'${poItem.supplier.code}'` : null, //Kode Supplier
                                supplierName: (poItem.purchaseOrderExternal && poItem.supplier && poItem.supplier.name !== "") ? `'${poItem.supplier.name}'` : null, //Nama Supplier
                                currencyCode: (poItem.purchaseOrderExternal && poItem.currency && poItem.currency.code !== "") ? `'${poItem.currency.code}'` : null, //Kode Mata Uang
                                currencySymbol: (poItem.purchaseOrderExternal && poItem.currency && poItem.currency.symbol !== "") ? `'${poItem.currency.symbol}'` : null, //Simbol Mata Uang
                                paymentMethod: (poItem.purchaseOrderExternal && poItem.paymentMethod !== "") ? `'${poItem.paymentMethod}'` : null, //Metode Pembayaran
                                currencyRate: (poItem.purchaseOrderExternal && poItem.currency.rate) ? `${poItem.currency.rate}` : null, //Nilai Mata Uang
                                purchaseQuantity: poItem.defaultQuantity ? `${poItem.defaultQuantity}` : null, //Jumlah Barang
                                uom: (poItem.defaultUom && poItem.defaultUom.unit) ? `'${poItem.defaultUom.unit}'` : null, //UOM
                                pricePerUnit: (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal.no) ? `${poItem.pricePerDealUnit}` : null, //Harga Per Unit
                                totalPrice: (poItem.currency.rate && poItem.pricePerDealUnit && poItem.dealQuantity) ? `${poItem.dealQuantity * poItem.pricePerDealUnit * poItem.currency.rate}` : null, //Total Harga
                                expectedDeliveryDate: (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal.expectedDeliveryDate) ? `'${moment(poItem.purchaseOrderExternal.expectedDeliveryDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal Rencana Kedatangan
                                prNoAtPoExt: purchaseRequest.no ? `'${purchaseRequest.no}'` : null, //Nomor PR di PO Eksternal

                                deliveryOrderNo: poFulfillment.deliveryOrderNo ? `'${poFulfillment.deliveryOrderNo}'` : null, //Nomor Surat Jalan (Delivery Order)
                                deliveryOrderDate: poFulfillment.deliveryOrderDate ? `'${moment(poFulfillment.deliveryOrderDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal Surat Jalan
                                unitReceiptNoteDays: poFulfillment.unitReceiptNoteDate ? `${urnDays}` : null, //Jumlah Selisih Hari URN-DO
                                unitReceiptNoteDaysRange: poFulfillment.unitReceiptNoteDate ? `'${this.getRangeWeek(urnDays)}'` : null, //Selisih Hari URN-DO
                                status: poFulfillment.deliveryOrderDate ? `'${this.getStatus(poItem.purchaseOrderExternal.expectedDeliveryDate, lastDeliveredDate)}'` : null, //Status Ketepatan Waktu
                                prNoAtDo: purchaseRequest.no ? `'${purchaseRequest.no}'` : null, //Nomor PR di DO

                                unitReceiptNoteNo: poFulfillment.unitReceiptNoteNo ? `'${poFulfillment.unitReceiptNoteNo}'` : null, //Nomor Bon Terima Unit (Unit Receipt Note)
                                unitReceiptNoteDate: poFulfillment.unitReceiptNoteDate ? `'${moment(poFulfillment.unitReceiptNoteDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal URN
                                unitPaymentOrderDays: poFulfillment.interNoteDate ? `${upoDays}` : null, //Jumlah Selisih Hari UPO-URN
                                unitPaymentOrderDaysRange: poFulfillment.interNoteDate ? `'${this.getRangeWeek(upoDays)}'` : null, //Selisih Hari UPO-URN

                                unitPaymentOrderNo: poFulfillment.interNoteNo ? `'${poFulfillment.interNoteNo}'` : null, //Nomor Surat Perintah Bayar
                                unitPaymentOrderDate: poFulfillment.interNoteDate ? `'${moment(poFulfillment.interNoteDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal SPB
                                purchaseOrderDays: poFulfillment.interNoteDate ? `${poDays}` : null, //Jumlah Selisih Hari UPO-PO Internal
                                purchaseOrderDaysRange: poFulfillment.interNoteDate ? `'${this.getRangeMonth(poDays)}'` : null, //Selisih Hari UPO-PO Internal
                                invoicePrice: poFulfillment.interNotePrice ? `'${poFulfillment.interNotePrice}'` : null, //Harga Sesuai Invoice
                                unitPaymentOrderPrice: poFulfillment.interNotePrice ? `'${poFulfillment.interNotePrice}'` : null,
                                unitPaymentOrderQuantity: poFulfillment.interNoteQuantity ? `'${poFulfillment.interNoteQuantity}'` : null,
                                unitPaymentOrderDueDate: poFulfillment.interNoteDueDate ? `'${moment(poFulfillment.interNoteDueDate).add(7, "h").format('YYYY-MM-DD')}'` : null,
                                unitReceiptNoteDeliveredQuantity: poFulfillment.unitReceiptNoteDeliveredQuantity ? `'${poFulfillment.unitReceiptNoteDeliveredQuantity}'` : null
                            };
                        });
                    } else if (poItem.fulfillments.length === 0) {
                        var prPoExtDays = (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal._createdDate) ? moment(moment(poItem.purchaseOrderExternal._createdDate).add(7, "h").startOf("day")).diff(moment(moment(purchaseRequest._createdDate).add(7, "h").startOf("day")), "days") : null;
                        var poExtDays = (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal._createdDate) ? moment(moment(poItem.purchaseOrderExternal._createdDate).add(7, "h").startOf("day")).diff(moment(moment(purchaseOrder._createdDate).add(7, "h").startOf("day")), "days") : null;
                        var poIntDays = purchaseOrder._createdDate ? moment(moment(purchaseOrder._createdDate).add(7, "h").startOf("day")).diff(moment(moment(purchaseRequest._createdDate).add(7, "h").startOf("day")), "days") : null;
                        return {
                            purchaseRequestNo: purchaseRequest.no ? `'${purchaseRequest.no.replace(/'/g, '"')}'` : null, //Nomor PR
                            purchaseRequestDate: purchaseRequest._createdDate ? `'${moment(purchaseRequest._createdDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal PR
                            expectedPRDeliveryDate: purchaseRequest.expectedDeliveryDate ? `'${moment(purchaseRequest.expectedDeliveryDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal Diminta Datang
                            unitCode: (purchaseRequest.unit && purchaseRequest.unit.code) ? `'${purchaseRequest.unit.code.replace(/'/g, '"')}'` : null, //Kode Unit
                            unitName: (purchaseRequest.unit && purchaseRequest.unit.name) ? `'${purchaseRequest.unit.name.replace(/'/g, '"')}'` : null, //Nama Unit
                            divisionCode: (purchaseRequest.unit && purchaseRequest.unit.division && purchaseRequest.unit.division.code) ? `'${purchaseRequest.unit.division.code.replace(/'/g, '"')}'` : null, //Kode Divisi
                            divisionName: (purchaseRequest.unit && purchaseRequest.unit.division && purchaseRequest.unit.division.name) ? `'${purchaseRequest.unit.division.name.replace(/'/g, '"')}'` : null, //Nama Divisi
                            categoryCode: (poItem.category && poItem.category.code) ? `'${poItem.category.code.replace(/'/g, '"')}'` : null, //Kode Kategori
                            categoryName: (poItem.category && poItem.category.name) ? `'${poItem.category.name.replace(/'/g, '"')}'` : null, //Nama Kategori
                            categoryType: (poItem.category && poItem.category.code) ? `'${this.getCategoryType(poItem.category.code.replace(/'/g, '"'))}'` : null, //Jenis Kategori
                            productCode: (poItem.product && poItem.product.code) ? `'${poItem.product.code}'` : null, //Kode Produk
                            productName: (poItem.product && poItem.product.name) ? `'${poItem.product.name.replace(/'/g, '"')}'` : null, //Nama Produk
                            purchaseRequestDays: `${poIntDays}`, //Jumlah Selisih Hari PR-PO Internal
                            purchaseRequestDaysRange: poIntDays !== null ? `'${this.getRangeWeek(poIntDays)}'` : null, //Selisih Hari PR-PO Internal
                            prPurchaseOrderExternalDays: `${prPoExtDays}`, //Jumlah Selisih Hari PR-PO Eksternal
                            prPurchaseOrderExternalDaysRange: prPoExtDays !== null ? `'${this.getRangeWeek(prPoExtDays)}'` : null, //Selisih Hari PR-PO Eksternal
                            deletedPR: `'${purchaseRequest._deleted}'`,

                            purchaseOrderNo: purchaseOrder.no ? `'${purchaseOrder.no}'` : null, //Nomor PO Internal
                            purchaseOrderDate: purchaseOrder._createdDate ? `'${moment(purchaseOrder._createdDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal PO Internal
                            purchaseOrderExternalDays: `${poExtDays}`, //Jumlah Selisih Hari PO Internal-PO Eksternal
                            purchaseOrderExternalDaysRange: poExtDays !== null ? `'${this.getRangeWeek(poExtDays)}'` : null, //Selisih Hari PO Internal-PO Eksternal
                            purchasingStaffName: purchaseOrder._createdBy ? `'${purchaseOrder._createdBy}'` : null, //Nama Staff Pembelian
                            prNoAtPo: purchaseRequest.no ? `'${purchaseRequest.no}'` : null, //Nomor PR di PO Internal
                            deletedPO: `'${purchaseOrder._deleted}'`,

                            purchaseOrderExternalNo: (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal.no) ? `'${poItem.purchaseOrderExternal.no}'` : null, // Nomor PO Eksternal
                            purchaseOrderExternalDate: (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal._createdDate) ? `'${moment(poItem.purchaseOrderExternal._createdDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal PO Eksternal
                            deliveryOrderDays: null, //Jumlah Selisih Hari DO-PO Eksternal
                            deliveryOrderDaysRange: null, //Selisih Hari DO-PO Eksternal
                            supplierCode: (poItem.purchaseOrderExternal && poItem.supplier && poItem.supplier.code !== "") ? `'${poItem.supplier.code}'` : null, //Kode Supplier
                            supplierName: (poItem.purchaseOrderExternal && poItem.supplier && poItem.supplier.name !== "") ? `'${poItem.supplier.name}'` : null, //Nama Supplier
                            currencyCode: (poItem.purchaseOrderExternal && poItem.currency && poItem.currency.code !== "") ? `'${poItem.currency.code}'` : null, //Kode Mata Uang
                            currencySymbol: (poItem.purchaseOrderExternal && poItem.currency && poItem.currency.symbol !== "") ? `'${poItem.currency.symbol}'` : null, //Simbol Mata Uang
                            paymentMethod: (poItem.purchaseOrderExternal && poItem.paymentMethod !== "") ? `'${poItem.paymentMethod}'` : null, //Metode Pembayaran
                            currencyRate: (poItem.purchaseOrderExternal && poItem.currency.rate) ? `${poItem.currency.rate}` : null, //Nilai Mata Uang
                            purchaseQuantity: poItem.defaultQuantity ? `${poItem.defaultQuantity}` : null, //Jumlah Barang
                            uom: (poItem.defaultUom && poItem.defaultUom.unit) ? `'${poItem.defaultUom.unit}'` : null, //UOM
                            pricePerUnit: (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal.no) ? `${poItem.pricePerDealUnit}` : null, //Harga Per Unit
                            totalPrice: (poItem.currency.rate && poItem.pricePerDealUnit && poItem.dealQuantity) ? `${poItem.dealQuantity * poItem.pricePerDealUnit * poItem.currency.rate}` : null, //Total Harga
                            expectedDeliveryDate: (poItem.purchaseOrderExternal && poItem.purchaseOrderExternal.expectedDeliveryDate) ? `'${moment(poItem.purchaseOrderExternal.expectedDeliveryDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal Rencana Kedatangan
                            prNoAtPoExt: purchaseRequest.no ? `'${purchaseRequest.no}'` : null, //Nomor PR di PO Eksternal

                            deliveryOrderNo: null, //Nomor Surat Jalan (Delivery Order)
                            deliveryOrderDate: null, //Tanggal Surat Jalan
                            unitReceiptNoteDays: null, //Jumlah Selisih Hari URN-DO
                            unitReceiptNoteDaysRange: null, //Selisih Hari URN-DO
                            status: null, //Status Ketepatan Waktu
                            prNoAtDo: null, //Nomor PR di DO

                            unitReceiptNoteNo: null, //Nomor Bon Terima Unit (Unit Receipt Note)
                            unitReceiptNoteDate: null, //Tanggal URN
                            unitPaymentOrderDays: null, //Jumlah Selisih Hari UPO-URN
                            unitPaymentOrderDaysRange: null, //Selisih Hari UPO-URN

                            unitPaymentOrderNo: null, //Nomor Surat Perintah Bayar
                            unitPaymentOrderDate: null, //Tanggal SPB
                            purchaseOrderDays: null, //Jumlah Selisih Hari UPO-PO Internal
                            purchaseOrderDaysRange: null, //Selisih Hari UPO-PO Internal
                            invoicePrice: null, //Harga Sesuai Invoice,
                            unitPaymentOrderPrice: null,
                            unitPaymentOrderQuantity: null,
                            unitPaymentOrderDueDate: null,
                            unitReceiptNoteDeliveredQuantity: null
                        }
                    }
                });
                return [].concat.apply([], results);
            }
            else if (purchaseRequest) {
                var results = purchaseRequest.items.map((poItem) => {

                    return {
                        purchaseRequestNo: purchaseRequest.no ? `'${purchaseRequest.no.replace(/'/g, '"')}'` : null, //Nomor PR
                        purchaseRequestDate: purchaseRequest._createdDate ? `'${moment(purchaseRequest._createdDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal PR
                        expectedPRDeliveryDate: purchaseRequest.expectedDeliveryDate ? `'${moment(purchaseRequest.expectedDeliveryDate).add(7, "h").format('YYYY-MM-DD')}'` : null, //Tanggal Diminta Datang
                        unitCode: (purchaseRequest.unit && purchaseRequest.unit.code) ? `'${purchaseRequest.unit.code.replace(/'/g, '"')}'` : null, //Kode Unit
                        unitName: (purchaseRequest.unit && purchaseRequest.unit.name) ? `'${purchaseRequest.unit.name.replace(/'/g, '"')}'` : null, //Nama Unit
                        divisionCode: (purchaseRequest.unit && purchaseRequest.unit.division && purchaseRequest.unit.division.code) ? `'${purchaseRequest.unit.division.code.replace(/'/g, '"')}'` : null, //Kode Divisi
                        divisionName: (purchaseRequest.unit && purchaseRequest.unit.division && purchaseRequest.unit.division.name) ? `'${purchaseRequest.unit.division.name.replace(/'/g, '"')}'` : null, //Nama Divisi
                        categoryCode: (poItem.category && poItem.category.code) ? `'${poItem.category.code.replace(/'/g, '"')}'` : null, //Kode Kategori
                        categoryName: (poItem.category && poItem.category.name) ? `'${poItem.category.name.replace(/'/g, '"')}'` : null, //Nama Kategori
                        categoryType: (poItem.category && poItem.category.code) ? `'${this.getCategoryType(poItem.category.code.replace(/'/g, '"'))}'` : null, //Jenis Kategori
                        productCode: (poItem.product && poItem.product.code) ? `'${poItem.product.code}'` : null, //Kode Produk
                        productName: (poItem.product && poItem.product.name) ? `'${poItem.product.name.replace(/'/g, '"')}'` : null, //Nama Produk
                        purchaseRequestDays: null, //Jumlah Selisih Hari PR-PO Internal
                        purchaseRequestDaysRange: null, //Selisih Hari PR-PO Internal
                        prPurchaseOrderExternalDays: null, //Jumlah Selisih Hari PR-PO Eksternal
                        prPurchaseOrderExternalDaysRange: null, //Selisih Hari PR-PO Eksternal
                        deletedPR: `'${purchaseRequest._deleted}'`,

                        purchaseOrderNo: null, //Nomor PO Internal
                        purchaseOrderDate: null, //Tanggal PO Internal
                        purchaseOrderExternalDays: null, //Jumlah Selisih Hari PO Internal-PO Eksternal
                        purchaseOrderExternalDaysRange: null, //Selisih Hari PO Internal-PO Eksternal
                        purchasingStaffName: purchaseRequest._createdBy ? `'${purchaseRequest._createdBy}'` : null, //Nama Staff Pembelian
                        prNoAtPo: null, //Nomor PR di PO Internal
                        deletedPO: null,

                        purchaseOrderExternalNo: null, // Nomor PO Eksternal
                        purchaseOrderExternalDate: null, //Tanggal PO Eksternal
                        deliveryOrderDays: null, //Jumlah Selisih Hari DO-PO Eksternal
                        deliveryOrderDaysRange: null, //Selisih Hari DO-PO Eksternal
                        supplierCode: null, //Kode Supplier
                        supplierName: null, //Nama Supplier
                        currencyCode: null, //Kode Mata Uang
                        currencySymbol: null, //Simbol Mata Uang
                        paymentMethod: null, //Metode Pembayaran
                        currencyRate: null, //Nilai Mata Uang
                        purchaseQuantity: poItem.quantity ? `${poItem.quantity}` : null, //Jumlah Barang
                        uom: (poItem.uom && poItem.uom.unit) ? `'${poItem.uom.unit}'` : null, //UOM
                        pricePerUnit: null, //Harga Per Unit
                        totalPrice: null, //Total Harga
                        expectedDeliveryDate: null, //Tanggal Rencana Kedatangan
                        prNoAtPoExt: null, //Nomor PR di PO Eksternal

                        deliveryOrderNo: null, //Nomor Surat Jalan (Delivery Order)
                        deliveryOrderDate: null, //Tanggal Surat Jalan
                        unitReceiptNoteDays: null, //Jumlah Selisih Hari URN-DO
                        unitReceiptNoteDaysRange: null, //Selisih Hari URN-DO
                        status: null, //Status Ketepatan Waktu
                        prNoAtDo: null, //Nomor PR di DO

                        unitReceiptNoteNo: null, //Nomor Bon Terima Unit (Unit Receipt Note)
                        unitReceiptNoteDate: null, //Tanggal URN
                        unitPaymentOrderDays: null, //Jumlah Selisih Hari UPO-URN
                        unitPaymentOrderDaysRange: null, //Selisih Hari UPO-URN

                        unitPaymentOrderNo: null, //Nomor Surat Perintah Bayar
                        unitPaymentOrderDate: null, //Tanggal SPB
                        purchaseOrderDays: null, //Jumlah Selisih Hari UPO-PO Internal
                        purchaseOrderDaysRange: null, //Selisih Hari UPO-PO Internal
                        invoicePrice: null, //Harga Sesuai Invoice
                        unitPaymentOrderPrice: null,
                        unitPaymentOrderQuantity: null,
                        unitPaymentOrderDueDate: null,
                        unitReceiptNoteDeliveredQuantity: null
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

                        var sqlQuery = 'INSERT INTO [DL_Fact_Pembelian_Garment_Temp] ';

                        var count = 1;

                        for (var item of data) {
                            if (item) {
                                var queryString = `\nSELECT ${item.purchaseRequestNo}, ${item.purchaseRequestDate}, ${item.expectedPRDeliveryDate}, ${item.unitCode}, ${item.unitName}, ${item.divisionCode}, ${item.divisionName}, ${item.categoryCode}, ${item.categoryName}, ${item.categoryType}, ${item.productCode}, ${item.productName}, ${item.purchaseRequestDays}, ${item.purchaseRequestDaysRange}, ${item.prPurchaseOrderExternalDays}, ${item.prPurchaseOrderExternalDaysRange}, ${item.deletedPR}, ${item.purchaseOrderNo}, ${item.purchaseOrderDate}, ${item.purchaseOrderExternalDays}, ${item.purchaseOrderExternalDaysRange}, ${item.purchasingStaffName}, ${item.prNoAtPo}, ${item.deletedPO}, ${item.purchaseOrderExternalNo}, ${item.purchaseOrderExternalDate}, ${item.deliveryOrderDays}, ${item.deliveryOrderDaysRange}, ${item.supplierCode}, ${item.supplierName}, ${item.currencyCode}, ${item.currencySymbol}, ${item.paymentMethod}, ${item.currencyRate}, ${item.purchaseQuantity}, ${item.uom}, ${item.pricePerUnit}, ${item.totalPrice}, ${item.expectedDeliveryDate}, ${item.prNoAtPoExt}, ${item.deliveryOrderNo}, ${item.deliveryOrderDate}, ${item.unitReceiptNoteDays}, ${item.unitReceiptNoteDaysRange}, ${item.status}, ${item.prNoAtDo}, ${item.unitReceiptNoteNo}, ${item.unitReceiptNoteDate}, ${item.unitPaymentOrderDays}, ${item.unitPaymentOrderDaysRange},${item.unitPaymentOrderNo}, ${item.unitPaymentOrderDate}, ${item.purchaseOrderDays}, ${item.purchaseOrderDaysRange}, ${item.invoicePrice}, ${item.unitPaymentOrderPrice}, ${item.unitPaymentOrderQuantity}, ${item.unitPaymentOrderDueDate}, ${item.unitReceiptNoteDeliveredQuantity} UNION ALL `;
                                sqlQuery = sqlQuery.concat(queryString);
                                if (count % 1000 == 0) {
                                    sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                                    command.push(this.insertQuery(request, sqlQuery));
                                    sqlQuery = 'INSERT INTO [DL_Fact_Pembelian_Garment_Temp] ';
                                }
                                console.log(`add data to query  : ${count}`);
                                count++;
                            }
                        }

                        if (sqlQuery != "") {
                            sqlQuery = sqlQuery.substring(0, sqlQuery.length - 10);
                            command.push(this.insertQuery(request, `${sqlQuery}`));
                        }

                        this.sql.multiple = true;

                        // var fs = require("fs");
                        // var path = "C:\\Users\\leslie.aula\\Desktop\\order.txt";

                        // fs.writeFile(path, sqlQuery, function (error) {
                        //     if (error) {
                        //         console.log("write error:  " + error.message);
                        //     } else {
                        //         console.log("Successful Write to " + path);
                        //     }
                        // });

                        return Promise.all(command)
                            .then((results) => {
                                request.execute("[DL_UPSERT_FACT_GARMENT_PEMBELIAN]").then((execResult) => {
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