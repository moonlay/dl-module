'use strict'

var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var generateCode = require('../../utils/code-generator');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var moment = require('moment');

var InvoiceNote = DLModels.garmentPurchasing.GarmentInvoiceNote;
var DeliveryOrderManager = require('./delivery-order-manager');
var CurrencyManager = require('../master/currency-manager');
var VatManager = require('../master/vat-manager');
var SupplierManager = require('../master/garment-supplier-manager');

module.exports = class InvoiceNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentInvoiceNote);
        this.deliveryOrderManager = new DeliveryOrderManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
        this.vatManager = new VatManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
    }

    _validate(invoiceNote) {
        var errors = {};
        var valid = invoiceNote;
        var getInvoiceNote = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            no: valid.no || "",
            _deleted: false
        });
        var getInvoiceNotePromise = this.collection.singleOrDefault({
            "$and": [{
                _id: {
                    '$ne': new ObjectId(valid._id)
                }
            }, {
                "refNo": valid.refNo
            }]
        });

        var getDeliveryOrder = [];
        if (valid.items) {
            for (var item of valid.items) {
                if (ObjectId.isValid(item.deliveryOrderId)) {
                    getDeliveryOrder.push(this.deliveryOrderManager.getSingleByIdOrDefault(item.deliveryOrderId));
                }
            }
        } else {
            getDeliveryOrder.push(Promise.resolve(null));
        }

        var listPOExternals = [];
        if (valid.items) {
            listPOExternals = valid.items.map((niItem) => {
                return niItem.items.map((item) => {
                    return item.purchaseOrderExternalId
                })
            })
        }
        listPOExternals = [].concat.apply([], listPOExternals);
        listPOExternals = listPOExternals.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        var getPOExternalId = [];
        for (var poEksId of listPOExternals) {
            if (ObjectId.isValid(poEksId)) {
                getPOExternalId.push(this.deliveryOrderManager.purchaseOrderExternalManager.getSingleByIdOrDefault(poEksId, ["vat", "useVat", "useIncomeTax", "_id", "no"]));
            }
        }

        var getCurrency = valid.currency && ObjectId.isValid(valid.currency._id) ? this.currencyManager.getSingleByIdOrDefault(valid.currency._id) : Promise.resolve(null);
        var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);
        var getVat = valid.vat && ObjectId.isValid(valid.vat._id) ? this.vatManager.getSingleByIdOrDefault(valid.vat._id) : Promise.resolve(null);

        return Promise.all(getPOExternalId)
            .then((listPOExternal) => {
                return Promise.all([getInvoiceNote, getCurrency, getSupplier, getVat, getInvoiceNotePromise].concat(getDeliveryOrder))
                    .then(results => {
                        var _invoiceNote = results[0];
                        var _currency = results[1];
                        var _supplier = results[2];
                        var _vat = results[3];
                        var _invoiceNoteByRefno = results[4];
                        var _deliveryOrders = results.slice(5, results.length);
                        var now = new Date();
                        var useIncomeTax = listPOExternal
                            .map((poEks) => { return poEks.useIncomeTax })
                            .reduce((prev, curr, index) => {
                                return prev && curr
                            }, true);

                        var useVat = listPOExternal
                            .map((poEks) => { return poEks.useVat })
                            .reduce((prev, curr, index) => {
                                return prev && curr
                            }, true);

                        if (_invoiceNote) {
                            errors["no"] = i18n.__("InvoiceNote.no.isExist:%s is exist", i18n.__("InvoiceNote.no._:No"));
                        }
                        if (_invoiceNoteByRefno) {
                            errors["refNo"] = i18n.__("InvoiceNote.refNo.isExist:%s is exist", i18n.__("InvoiceNote.refNo._:No"));
                        }

                        if (!valid.date || valid.date === "") {
                            errors["date"] = i18n.__("InvoiceNote.date.isRequired:%s is required", i18n.__("InvoiceNote.date._:Date"));
                            valid.date = '';
                        }
                        else if (new Date(valid.date) > now) {
                            errors["date"] = i18n.__("InvoiceNote.date.isGreater:%s is greater than today", i18n.__("InvoiceNote.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                        }

                        if (!valid.supplierId || valid.supplierId.toString() === "") {
                            errors["supplierId"] = i18n.__("InvoiceNote.supplier.name.isRequired:%s is required", i18n.__("InvoiceNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                        }
                        else if (valid.supplier) {
                            if (!valid.supplier._id) {
                                errors["supplierId"] = i18n.__("InvoiceNote.supplier.name.isRequired:%s is required", i18n.__("InvoiceNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                            }
                        }
                        else if (!_supplier) {
                            errors["supplierId"] = i18n.__("InvoiceNote.supplier.name.isRequired:%s is required", i18n.__("InvoiceNote.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                        }

                        if (!valid.currency) {
                            errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s is required", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                        }
                        else if (valid.currency) {
                            if (!valid.currency._id) {
                                errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s is required", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                            }
                        }
                        else if (!_currency) {
                            errors["currency"] = i18n.__("InvoiceNote.currency.isRequired:%s is required", i18n.__("InvoiceNote.currency._:Currency")); //"Currency tidak boleh kosong";
                        }

                        if (valid.useIncomeTax !== useIncomeTax) {
                            errors["useIncomeTax"] = i18n.__("InvoiceNote.useIncomeTax.isRequired:%s is different with purchase order external", i18n.__("InvoiceNote.useIncomeTax._:Using PPn"));
                        }
                        else if (valid.useIncomeTax) {
                            if (!valid.incomeTaxNo || valid.incomeTaxNo == '') {
                                errors["incomeTaxNo"] = i18n.__("InvoiceNote.incomeTaxNo.isRequired:%s is required", i18n.__("InvoiceNote.incomeTaxNo._:Nomor Faktur Pajak (PPn)"));
                            }

                            if (!valid.incomeTaxDate || valid.incomeTaxDate == '') {
                                errors["incomeTaxDate"] = i18n.__("InvoiceNote.incomeTaxDate.isRequired:%s is required", i18n.__("InvoiceNote.incomeTaxDate._:Tanggal Faktur Pajak (PPn)"));
                                valid.incomeTaxDate = "";
                            }
                        }
                        if (valid.useVat !== useVat) {
                            errors["useVat"] = i18n.__("InvoiceNote.useVat.isRequired:%s is different with purchase order external", i18n.__("InvoiceNote.useVat._:Using PPh"));
                        }
                        else if (valid.useVat) {
                            if (valid.vat) {
                                if (!valid.vat._id) {
                                    errors["vat"] = i18n.__("InvoiceNote.vat.isRequired:%s name is required", i18n.__("InvoiceNote.vat._:Jenis PPh"));
                                }
                            } else {
                                errors["vat"] = i18n.__("InvoiceNote.vat.isRequired:%s name is required", i18n.__("InvoiceNote.vat._:Jenis PPh"));
                            }

                            if (!valid.vatNo || valid.vatNo == '') {
                                errors["vatNo"] = i18n.__("InvoiceNote.vatNo.isRequired:%s is required", i18n.__("InvoiceNote.vatNo._:Nomor Faktur Pajak (PPh)"));
                            }

                            if (!valid.vatDate || valid.vatDate == '' || valid.vatDate === "undefined") {
                                errors["vatDate"] = i18n.__("InvoiceNote.vatDate.isRequired:%s is required", i18n.__("InvoiceNote.vatDate._:Tanggal Faktur Pajak (PPh)"));
                                valid.vatDate = "";
                            }
                        }

                        valid.items = valid.items || [];
                        if (valid.items) {
                            if (valid.items.length <= 0) {
                                errors["items"] = [{ "deliveryOrderId": i18n.__("InvoiceNote.deliveryOrderId.isRequired:%s is required", i18n.__("InvoiceNote.deliveryOrderId._:Delivery Order")) }]
                            } else {
                                var errItems = []
                                for (var item of valid.items) {
                                    if (item.deliveryOrderId) {
                                        var errItem = {};
                                        var _deliveryOrder = _deliveryOrders.find(deliveryOrder => deliveryOrder._id.toString() === item.deliveryOrderId.toString());
                                        if (!_deliveryOrder) {
                                            errItem = { "deliveryOrderId": i18n.__("InvoiceNote.deliveryOrderId.isRequired:%s is required", i18n.__("InvoiceNote.deliveryOrderId._:Delivery Order")) }
                                        }
                                    } else if (!item.deliveryOrderId) {
                                        errItem = { "deliveryOrderId": i18n.__("InvoiceNote.deliveryOrderId.isRequired:%s is required", i18n.__("InvoiceNote.deliveryOrderId._:Delivery Order")) }
                                    } else {
                                        errItem = {}
                                    }
                                    var fulfillmentErrors = [];
                                    for (var fulfillmentItems of item.items || []) {
                                        var fulfillmentError = {};

                                        if (!fulfillmentItems.deliveredQuantity || fulfillmentItems.deliveredQuantity === 0) {
                                            fulfillmentError["deliveredQuantity"] = i18n.__("InvoiceNote.items.items.deliveredQuantity.isRequired:%s is required or not 0", i18n.__("InvoiceNote.items.items.deliveredQuantity._:DeliveredQuantity")); //"Jumlah barang diterima tidak boleh kosong";
                                        }
                                        fulfillmentErrors.push(fulfillmentError);
                                    }
                                    for (var fulfillmentError of fulfillmentErrors) {
                                        if (Object.getOwnPropertyNames(fulfillmentError).length > 0) {
                                            errItem.items = fulfillmentErrors;
                                            break;
                                        }
                                    }
                                    errItems.push(errItem);
                                }
                                for (var errItem of errItems) {
                                    if (Object.getOwnPropertyNames(errItem).length > 0) {
                                        errors.items = errItems;
                                        break;
                                    }
                                }
                            }
                        }
                        else {
                            errors["items"] = [{ "deliveryOrderId": i18n.__("InvoiceNote.deliveryOrderId.isRequired:%s is required", i18n.__("InvoiceNote.deliveryOrderId._:Delivery Order")) }]
                        }

                        if (Object.getOwnPropertyNames(errors).length > 0) {
                            var ValidationError = require('module-toolkit').ValidationError;
                            return Promise.reject(new ValidationError('data does not pass validation', errors));
                        }

                        valid.supplier = _supplier;
                        valid.supplierId = valid.supplier._id;
                        valid.currency = _currency;

                        if (valid.useVat) {
                            valid.vat = _vat;
                        } else {
                            valid.vatDate = null
                        }

                        if (!valid.useIncomeTax) {
                            valid.incomeTaxDate = null;
                        }

                        if (valid.isPayTax && valid.useIncomeTax) {
                            valid.incomeTaxInvoiceNo = "";
                        }
                        if (valid.isPayTax && valid.useVat) {
                            valid.vatInvoiceNo = "";
                        }

                        for (var invoiceItem of valid.items) {
                            var validDo = _deliveryOrders.find(deliveryOrder => deliveryOrder._id.toString() === invoiceItem.deliveryOrderId.toString());
                            for (var item of invoiceItem.items) {
                                var deliveryOrderItem = validDo.items.find(doItem => doItem.purchaseOrderExternalId.toString() === item.purchaseOrderExternalId.toString());
                                var deliveryOrderFulfillment = deliveryOrderItem.fulfillments.find(doFulfillment => doFulfillment.purchaseOrderId.toString() === item.purchaseOrderId.toString());
                                if (deliveryOrderFulfillment) {
                                    invoiceItem.deliveryOrderId = validDo._id;
                                    invoiceItem.deliveryOrderNo = validDo.no;

                                    item.purchaseOrderExternalId = deliveryOrderItem.purchaseOrderExternalId;
                                    item.purchaseOrderExternalNo = deliveryOrderItem.purchaseOrderExternalNo;

                                    item.paymentMethod = deliveryOrderItem.paymentMethod;
                                    item.paymentType = deliveryOrderItem.paymentType;
                                    item.paymentDueDays = deliveryOrderItem.paymentDueDays;

                                    item.purchaseOrderId = deliveryOrderFulfillment.purchaseOrderId;
                                    item.purchaseOrderNo = deliveryOrderFulfillment.purchaseOrderNo;

                                    item.purchaseRequestId = deliveryOrderFulfillment.purchaseRequestId;
                                    item.purchaseRequestNo = deliveryOrderFulfillment.purchaseRequestNo;

                                    item.productId = deliveryOrderFulfillment.productId;
                                    item.product = deliveryOrderFulfillment.product;
                                    item.purchaseOrderUom = deliveryOrderFulfillment.purchaseOrderUom;
                                    item.purchaseOrderQuantity = Number(item.purchaseOrderQuantity);
                                    item.deliveredQuantity = Number(item.deliveredQuantity);
                                }

                            }
                        }

                        if (!valid.stamp) {
                            valid = new InvoiceNote(valid);
                        }

                        valid.stamp(this.user.username, 'manager');
                        return Promise.resolve(valid);
                    })
            });
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        },
            keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterNo = {
                'no': {
                    '$regex': regex
                }
            };

            var filterSupplier = {
                "supplier.name": {
                    "$regex": regex
                }
            };

            var filterItem = {
                "items.deliveryOrderNo": {
                    "$regex": regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplier, filterItem]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    _beforeInsert(invoiceNote) {
        invoiceNote.refNo = generateCode();
        if (invoiceNote.isPayTax && invoiceNote.useIncomeTax) {
            invoiceNote.incomeTaxInvoiceNo = generateCode("incomeTaxInvoiceNo");
        }
        if (invoiceNote.isPayTax && invoiceNote.useVat) {
            invoiceNote.vatInvoiceNo = generateCode("vatInvoiceNo");
        }
        invoiceNote.hasInternNote = false;
        return Promise.resolve(invoiceNote);
    }

    _afterInsert(id) {
        return this.getSingleById(id, ["items.deliveryOrderId"])
            .then((InvoiceNote) => {
                var getDeliveryOrder = [];
                InvoiceNote.items = InvoiceNote.items || [];
                var doIds = InvoiceNote.items.map((item) => { return item.deliveryOrderId })
                doIds = doIds.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })
                for (var doId of doIds) {
                    if (ObjectId.isValid(doId)) {
                        getDeliveryOrder.push(this.deliveryOrderManager.getSingleByIdOrDefault(doId));
                    }
                }
                return Promise.all(getDeliveryOrder)
                    .then((deliveryOrders) => {
                        var updateDeliveryOrderPromise = [];

                        for (var deliveryOrder of deliveryOrders) {
                            deliveryOrder.hasInvoice = true;
                            updateDeliveryOrderPromise.push(this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder))
                        }
                        return Promise.all(updateDeliveryOrderPromise)
                    })
                    .then((result) => Promise.resolve(InvoiceNote._id));
            })
    }

    _beforeUpdate(newInvoiceNote) {
        return this.getSingleById(newInvoiceNote._id)
            .then((oldInvoiceNote) => {
                var getDeliveryOrder = [];
                var oldItems = oldInvoiceNote.items.map((item) => { return item.deliveryOrderId })
                oldItems = oldItems.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var newItems = newInvoiceNote.items.map((item) => { return item.deliveryOrderId })
                newItems = newItems.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var updateDeliveryOrderPromise = [];

                for (var oldItem of oldItems) {
                    var item = newItems.find(newItem => newItem.toString() === oldItem.toString())
                    if (!item) {
                        updateDeliveryOrderPromise.push(this.deliveryOrderManager.getSingleByIdOrDefault(oldItem).then((deliveryOrder) => {
                            deliveryOrder.hasInvoice = false;
                            return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                        }));
                    }
                }

                for (var newItem of newItems) {
                    var item = oldItems.find(oldItem => newItem.toString() === oldItem.toString())
                    if (!item) {
                        updateDeliveryOrderPromise.push(this.deliveryOrderManager.getSingleByIdOrDefault(newItem).then((deliveryOrder) => {
                            deliveryOrder.hasInvoice = true;
                            return this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder)
                        }));
                    }
                }
                if (updateDeliveryOrderPromise.length == 0) {
                    updateDeliveryOrderPromise.push(Promise.resolve(null));
                }
                return Promise.all(updateDeliveryOrderPromise)
                    .then((result) => {
                        return Promise.resolve(newInvoiceNote);
                    })
            })

    }

    delete(invoiceNote) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._validate(invoiceNote)
                    .then(validData => {
                        // validData._deleted = true;
                        return this.collection
                            .updateOne({
                                _id: validData._id
                            }, {
                                $set: { "_deleted": true }
                            })
                            .then((result) => Promise.resolve(validData._id))
                            .then((InvoiceNoteId) => {
                                var getDeliveryOrder = [];
                                invoiceNote.items = invoiceNote.items || [];
                                var doIds = invoiceNote.items.map((item) => { return item.deliveryOrderId })
                                doIds = doIds.filter(function (elem, index, self) {
                                    return index == self.indexOf(elem);
                                })
                                for (var doId of doIds) {
                                    if (ObjectId.isValid(doId)) {
                                        getDeliveryOrder.push(this.deliveryOrderManager.getSingleByIdOrDefault(doId));
                                    }
                                }
                                return Promise.all(getDeliveryOrder)
                                    .then((deliveryOrders) => {
                                        var updatedeliveryOrderPromise = [];

                                        for (var deliveryOrder of deliveryOrders) {
                                            deliveryOrder.hasInvoice = false;
                                            updatedeliveryOrderPromise.push(this.deliveryOrderManager.updateCollectionDeliveryOrder(deliveryOrder))
                                        }
                                        return Promise.all(updatedeliveryOrderPromise)
                                    })
                                    .then((result) => Promise.resolve(invoiceNote._id));
                            })
                    })
            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInvoiceNote}_date`,
            key: {
                date: -1
            }
        };

        var refNoIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInvoiceNote}_refNo`,
            key: {
                refNo: 1
            },
            unique: true
        }

        var noIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInvoiceNote}_no`,
            key: {
                no: 1
            }
        };

        var createdDateIndex = {
            name: `ix_${map.garmentPurchasing.collection.GarmentInvoiceNote}__createdDate`,
            key: {
                _createdDate: -1
            }
        };
        return this.collection.createIndexes([dateIndex, noIndex, createdDateIndex, refNoIndex]);
    }

    pdfVat(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleByIdOrDefault(id)
                .then(pox => {
                    var getDefinition = require('../../pdf/definitions/garment-invoice-vat-note');
                    var definition = getDefinition(pox, offset);

                    var generatePdf = require('../../pdf/pdf-generator');
                    generatePdf(definition)
                        .then(binary => {
                            resolve(binary);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    pdfIncomeTax(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleByIdOrDefault(id)
                .then(pox => {
                    var getDefinition = require('../../pdf/definitions/garment-invoice-income-tax-note');
                    var definition = getDefinition(pox, offset);

                    var generatePdf = require('../../pdf/pdf-generator');
                    generatePdf(definition)
                        .then(binary => {
                            resolve(binary);
                        })
                        .catch(e => {
                            reject(e);
                        });
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    getMonitoringInvoice(info) {
        return new Promise((resolve, reject) => {
            var _defaultFilter = {
                _deleted: false
            };
            var userFilter = {};
            var invoiceNumberFilter = {};
            var supplierFilter = {};
            var dateFromFilter = {};
            var dateToFilter = {};
            var query = {};

            var dateFrom = info.dateFrom ? (new Date(info.dateFrom).setHours((new Date(info.dateFrom)).getHours() - info.offset)) : (new Date(1900, 1, 1));
            var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59").setHours((new Date(info.dateTo + "T23:59")).getHours() - info.offset)) : (new Date());
            var now = new Date();

            if (info.user && info.user != '') {
                userFilter = { "_createdBy": info.user };
            }

            if (info.no && info.no != '') {
                invoiceNumberFilter = { "no": info.no };
            }

            if (info.supplierId && info.supplierId != '') {
                supplierFilter = { "supplierId": new ObjectId(info.supplierId) };
            }

            var filterDate = {
                "date": {
                    $gte: new Date(dateFrom),
                    $lte: new Date(dateTo)
                }
            };

            query = { '$and': [_defaultFilter, userFilter, invoiceNumberFilter, supplierFilter, filterDate] };

            return this.collection
                .aggregate([
                    { "$unwind": "$items" }
                    , { "$unwind": "$items.items" }
                    , { "$match": query }
                    , {
                        "$project": {
                            "_updatedDate": 1,
                            "no": "$no",
                            "date": "$date",
                            "supplier": "$supplier.name",
                            "currency": "$currency.code",
                            "tax": "$useIncomeTax",
                            "taxNo": "$incomeTaxNo",
                            "taxDate": "$incomeTaxDate",
                            "vat": "$useVat",
                            "vatName": "$vat.name",
                            "vatRate": "$vat.rate",
                            "vatNo": "$vatNo",
                            "vatDate": "$vatDate",
                            "payTax": "$isPayTax",
                            "doNo": "$items.deliveryOrderNo",
                            "poEksNo": "$items.items.purchaseOrderExternalNo",
                            "prNo": "$items.items.purchaseRequestNo",
                            "productCode": "$items.items.product.code",
                            "productName": "$items.items.product.name",
                            "qty": "$items.items.deliveredQuantity",
                            "uom": "$items.items.purchaseOrderUom.unit",
                            "price": "$items.items.pricePerDealUnit"
                        }
                    },
                    {
                        "$sort": {
                            "_updatedDate": -1
                        }
                    }
                ])
                .toArray()
                .then(results => {
                    resolve(results);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var _data of result.data) {
            var data = {};
            index += 1;
            data["No"] = index;
            data["No Invoice"] = _data.no ? _data.no : '';
            data["Tanggal Nota Invoice"] = _data.date ? moment(new Date(_data.date)).add(query.offset, 'h').format(dateFormat) : '';
            data["Supplier"] = _data.supplier;
            data["Mata Uang"] = _data.currency;
            data["Dikenakan PPN"] = _data.tax ? 'Ya' : 'Tidak';
            data["Nomor PPN"] = _data.taxNo;
            data["Tanggal PPN"] = _data.taxDate ? moment(new Date(_data.taxDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Dikenakan PPH"] = _data.vat ? 'Ya' : 'Tidak';
            data["Jenis PPH"] = _data.vatName + ' ' + _data.vatRate;
            data["Nomor PPH"] = _data.vatNo;
            data["Tanggal PPH"] = _data.vatDate ? moment(new Date(_data.vatDate)).add(query.offset, 'h').format(dateFormat) : '';
            data["Pajak Dibayar"] = _data.payTax ? 'Ya' : 'Tidak';
            data["Nomor Surat Jalan"] = _data.doNo;
            data["Nomor PO Eksternal"] = _data.poEksNo;
            data["Nomor PR"] = _data.prNo;
            data["Kode Barang"] = _data.productCode;
            data["Nama Barang"] = _data.productName;
            data["Jumlah"] = _data.qty;
            data["Satuan"] = _data.uom;
            data["Harga Satuan"] = _data.price;
            data["Harga Total"] = _data.price * _data.qty;

            xls.options["No"] = "number";
            xls.options["No Invoice"] = "string";
            xls.options["Tanggal Nota Invoice"] = "string";
            xls.options["Supplier"] = "string";
            xls.options["Mata Uang"] = "string";
            xls.options["Dikenakan PPN"] = "string";
            xls.options["Nomor PPN"] = "string";
            xls.options["Tanggal PPN"] = "string";
            xls.options["Dikenakan PPH"] = "string";
            xls.options["Jenis PPH"] = "string";
            xls.options["Nomor PPH"] = "string";
            xls.options["Tanggal PPH"] = "string";
            xls.options["Pajak Dibayar"] = "string";
            xls.options["Nomor Surat Jalan"] = "string";
            xls.options["Nomor PO Eksternal"] = "string";
            xls.options["Nomor PR"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah"] = "number";
            xls.options["Satuan"] = "string";
            xls.options["Harga Satuan"] = "number";
            xls.options["Harga Total"] = "number";

            xls.data.push(data);
        }

        if (query.dateFrom && query.dateTo) {
            xls.name = `Nota Invoice ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Nota Invoice ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Nota Invoice ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Nota Invoice.xlsx`;

        return Promise.resolve(xls);
    }
};