'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var PurchaseOrderExternal = DLModels.purchasing.PurchaseOrderExternal;
var PurchaseOrderManager = require('./purchase-order-manager');
var BaseManager = require('../base-manager');
var generateCode = require('../../utils/code-generator');
var i18n = require('dl-i18n');

module.exports = class PurchaseOrderExternalManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.PurchaseOrderExternal);
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false,
            _createdBy: this.user.username
        }, keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterPODLNo = {
                'no': {
                    '$regex': regex
                }
            };
            var filterRefPO = {
                'refNo': {
                    '$regex': regex
                }
            };
            var filterPOItem = {
                items: {
                    $elemMatch: {
                        no: {
                            '$regex': regex
                        }
                    }
                }
            };
            var filterSupplierName = {
                'supplier.name': {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterPODLNo, filterRefPO, filterPOItem, filterSupplierName]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    create(purchaseOrderExternal) {
        return new Promise((resolve, reject) => {
            this._validate(purchaseOrderExternal)
                .then(validPurchaseOrderExternal => {
                    validPurchaseOrderExternal.no = this.generatePOno();
                    validPurchaseOrderExternal.supplierId = new ObjectId(validPurchaseOrderExternal.supplierId);
                    validPurchaseOrderExternal.supplier._id = new ObjectId(validPurchaseOrderExternal.supplier._id);
                    this.collection.insert(validPurchaseOrderExternal)
                        .then(id => {
                            var tasks = [];
                            var getPOItemById = [];
                            for (var data of validPurchaseOrderExternal.items) {
                                getPOItemById.push(this.purchaseOrderManager.getSingleById(data._id));
                            }
                            Promise.all(getPOItemById)
                                .then(results => {
                                    for (var result of results) {
                                        var poItem = result;
                                        poItem.isPosted = true;
                                        tasks.push(this.purchaseOrderManager.update(poItem));
                                    }
                                    Promise.all(tasks)
                                        .then(results => {
                                            resolve(id);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        })
                                })
                                .catch(e => {
                                    reject(e);
                                })
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    delete(purchaseOrderExternal) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(purchaseOrderExternal)
                        .then(validData => {
                            validData._deleted = true;
                            this.collection.update(validData)
                                .then(id => {
                                    var tasks = [];
                                    var getPOItemById = [];
                                    for (var data of validData.items) {
                                        getPOItemById.push(this.purchaseOrderManager.getSingleById(data._id));
                                    }
                                    Promise.all(getPOItemById)
                                        .then(results => {
                                            for (var result of results) {
                                                var poItem = result;
                                                poItem.isPosted = false;
                                                tasks.push(this.purchaseOrderManager.update(poItem));

                                            }
                                            Promise.all(tasks)
                                                .then(results => {
                                                    resolve(id);
                                                })
                                                .catch(e => {
                                                    reject(e);
                                                })
                                        })
                                        .catch(e => {
                                            reject(e);
                                        })

                                })
                                .catch(e => {
                                    reject(e);
                                });
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

    _validate(purchaseOrderGroup) {
        var purchaseOrderExternalError = {};
        return new Promise((resolve, reject) => {
            var valid = purchaseOrderGroup;

            var getPurchaseOrderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        "refNo": valid.refNo
                    }]
            });

            Promise.all([getPurchaseOrderPromise])
                .then(results => {
                    var _module = results[0];
                    var now = new Date();

                    if (valid.refNo != '' && _module)
                        purchaseOrderExternalError["refNo"] = i18n.__("PurchaseOrderExternal.refNo.isExists:%s is already exists", i18n.__("PurchaseOrderExternal.refNo._:RefNo")); //"No. Ref Surat Jalan sudah terdaftar"; 

                    if (!valid.supplierId || valid.supplierId.toString() == '')
                        purchaseOrderExternalError["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";

                    if (!valid.expectedDeliveryDate || valid.expectedDeliveryDate == '')
                        purchaseOrderExternalError["expectedDeliveryDate"] = i18n.__("PurchaseOrderExternal.expectedDeliveryDate.isRequired:%s is required", i18n.__("PurchaseOrderExternal.expectedDeliveryDate._:ExpectedDeliveryDate")); //"Tanggal tersedia tidak boleh kosong";

                    if (!valid.date || valid.date == '')
                        purchaseOrderExternalError["date"] = i18n.__("PurchaseOrderExternal.date.isRequired:%s is required", i18n.__("PurchaseOrderExternal.date._:Date")); //"Tanggal tidak boleh kosong";

                    if (!valid.paymentMethod || valid.paymentMethod == '')
                        purchaseOrderExternalError["paymentMethod"] = i18n.__("PurchaseOrderExternal.paymentMethod.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentMethod._:PaymentMethod")); //"Metode Pembayaran tidak boleh kosong";

                    if (!valid.currencyRate || valid.currencyRate == 0)
                        purchaseOrderExternalError["currencyRate"] = i18n.__("PurchaseOrderExternal.currencyRate.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currencyRate._:CurrencyRate")); //"Rate tidak boleh kosong";

                    if (valid.paymentMethod.toUpperCase() != "CASH")
                        if (!valid.paymentDueDays || valid.paymentDueDays == '' || valid.paymentDueDays == 0)
                            purchaseOrderExternalError["paymentDueDays"] = i18n.__("PurchaseOrderExternal.paymentDueDays.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentDueDays._:PaymentDueDays")); //"Tempo Pembayaran tidak boleh kosong";

                    // if ((valid.paymentMethod.toUpperCase() != "CASH") && !valid.paymentDueDays || valid.paymentDueDays == '')
                    //     purchaseOrderExternalError["paymentDueDays"] = "Tempo Pembayaran tidak boleh kosong";

                    // if (valid.useVat == undefined || valid.useVat.toString() === '')
                    //     purchaseOrderExternalError["useVat"] = "Pengenaan PPn harus dipilih";

                    // if (valid.useIncomeTax == undefined || valid.useIncomeTax.toString() === '')
                    //     purchaseOrderExternalError["useIncomeTax"] = "Pengenaan PPh harus dipilih";

                    if (valid.items && valid.items.length < 1)
                        purchaseOrderExternalError["items"] = i18n.__("PurchaseOrderExternal.items.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items._:Items")); //"Harus ada minimal 1 po internal";
                    else {
                        var purchaseOrderExternalItemErrors = [];
                        var poItemExternalHasError = false;
                        for (var purchaseOrder of valid.items) {
                            var purchaseOrderError = {};
                            var purchaseOrderItemErrors = [];
                            var poItemHasError = false;

                            if (!purchaseOrder.no || purchaseOrder.no == "") {
                                poItemHasError = true;
                                purchaseOrderError["no"] = i18n.__("PurchaseOrderExternal.items.no.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.no._:No")); //"Purchase order internal tidak boleh kosong";
                            }

                            for (var poItem of purchaseOrder.items || []) {
                                var poItemError = {};
                                if (!poItem.dealQuantity || poItem.dealQuantity == 0) {
                                    poItemHasError = true;
                                    poItemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:DealQuantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                }
                                if (!poItem.dealUom || !poItem.dealUom.unit || poItem.dealUom.unit == "") {
                                    poItemHasError = true;
                                    poItemError["dealUom"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:DealQuantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                }
                                if (!poItem.pricePerDealUnit || poItem.pricePerDealUnit == 0) {
                                    poItemHasError = true;
                                    poItemError["pricePerDealUnit"] = i18n.__("PurchaseOrderExternal.items.items.pricePerDealUnit.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.pricePerDealUnit._:PricePerDealUnit")); //"Harga tidak boleh kosong";
                                }
                                var price = (poItem.pricePerDealUnit.toString()).split(",");
                                if (price[1] != undefined || price[1] != "" || price[1] != " ") {
                                    poItem.pricePerDealUnit = parseFloat(poItem.pricePerDealUnit.toString() + ".00");
                                } else if (price[1].length() > 2) {
                                    poItemHasError = true;
                                    poItemError["pricePerDealUnit"] = i18n.__("PurchaseOrderExternal.items.items.pricePerDealUnit.isRequired:%s is greater than 2", i18n.__("PurchaseOrderExternal.items.items.pricePerDealUnit._:PricePerDealUnit")); //"Harga tidak boleh kosong";
                                } else {
                                    poItem.pricePerDealUnit = poItem.pricePerDealUnit;
                                }

                                if (!poItem.conversion || poItem.conversion == '') {
                                    poItemHasError = true;
                                    poItemError["conversion"] = i18n.__("PurchaseOrderExternal.items.items.conversion.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.conversion._:Conversion")); //"Konversi tidak boleh kosong";
                                }

                                purchaseOrderItemErrors.push(poItemError);
                            }
                            if (poItemHasError) {
                                poItemExternalHasError = true;
                                purchaseOrderError["items"] = purchaseOrderItemErrors;
                            }

                            purchaseOrderExternalItemErrors.push(purchaseOrderError);
                        }
                        if (poItemExternalHasError)
                            purchaseOrderExternalError["items"] = purchaseOrderExternalItemErrors;
                    }


                    // 2c. begin: check if data has any error, reject if it has.
                    if (Object.getOwnPropertyNames(purchaseOrderExternalError).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data podl does not pass validation', purchaseOrderExternalError));
                    }

                    valid.supplierId = new ObjectId(valid.supplier._id);
                    valid.supplier._id = new ObjectId(valid.supplier._id);
                    valid.currency._id = new ObjectId(valid.currency._id);
                    if (valid.vat) {
                        valid.vat._id = new ObjectId(valid.vat._id);
                    }
                    for (var item of valid.items) {
                        item.purchaseRequest.unit._id = new ObjectId(item.purchaseRequest.unit._id);
                        item.purchaseRequest.category._id = new ObjectId(item.purchaseRequest.category._id);
                        item.purchaseRequest.unitId = new ObjectId(item.purchaseRequest.unit._id);
                        item.purchaseRequest.categoryId = new ObjectId(item.purchaseRequest.category._id);
                        if (item.sourcePurchaseOrder) {
                            item.sourcePurchaseOrder._id = new ObjectId(item.sourcePurchaseOrder._id);
                            item.sourcePurchaseOrder.purchaseRequest.unit._id = new ObjectId(item.sourcePurchaseOrder.purchaseRequest.unit._id);
                            item.sourcePurchaseOrder.purchaseRequest.category._id = new ObjectId(item.sourcePurchaseOrder.purchaseRequest.category._id);
                            item.sourcePurchaseOrder.purchaseRequest.unitId = new ObjectId(item.sourcePurchaseOrder.purchaseRequest.unit._id);
                            item.sourcePurchaseOrder.purchaseRequest.categoryId = new ObjectId(item.sourcePurchaseOrder.purchaseRequest.category._id);
                            item.sourcePurchaseOrder.unit._id = new ObjectId(item.sourcePurchaseOrder.unit._id);
                            item.sourcePurchaseOrder.category._id = new ObjectId(item.sourcePurchaseOrder.category._id);
                            item.sourcePurchaseOrder.unitId = new ObjectId(item.sourcePurchaseOrder.unit._id);
                            item.sourcePurchaseOrder.categoryId = new ObjectId(item.sourcePurchaseOrder.category._id);

                            for (var soItem of item.sourcePurchaseOrder.items) {
                                soItem.product._id = new ObjectId(soItem.product._id);
                                soItem.defaultUom._id = new ObjectId(soItem.defaultUom._id);
                            }
                        }
                        item.unitId = new ObjectId(item.unit._id);
                        item.unit._id = new ObjectId(item.unit._id);
                        item.categoryId = new ObjectId(item.category._id);
                        item.category._id = new ObjectId(item.category._id);

                        for (var poItem of item.items) {
                            poItem.product._id = new ObjectId(poItem.product._id);
                            poItem.product.uom._id = new ObjectId(poItem.product.uom._id);
                            poItem.defaultUom._id = new ObjectId(poItem.defaultUom._id);
                            poItem.dealUom._id = new ObjectId(poItem.dealUom._id);
                        }
                    }
                    if (!valid.stamp)
                        valid = new PurchaseOrderExternal(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    post(listPurchaseOrderExternal) {
        var tasks = [];
        var getPOItemById = [];
        return new Promise((resolve, reject) => {
            for (var purchaseOrderExternal of listPurchaseOrderExternal) {

                purchaseOrderExternal.isPosted = true;
                tasks.push(this.update(purchaseOrderExternal));
                for (var data of purchaseOrderExternal.items) {
                    getPOItemById.push(this.purchaseOrderManager.getSingleById(data._id));
                }
            }
            Promise.all(getPOItemById)
                .then(results => {
                    for (var result of results) {
                        var _purchaseOrder = result;
                        for (var _purchaseOrderExternal of listPurchaseOrderExternal) {
                            for (var _poExternal of _purchaseOrderExternal.items) {
                                if (_purchaseOrder._id.equals(_poExternal._id)) {
                                    _purchaseOrder.purchaseOrderExternalId = new ObjectId(_purchaseOrderExternal._id);
                                    _purchaseOrder.purchaseOrderExternal = _purchaseOrderExternal;
                                    _purchaseOrder.purchaseOrderExternal._id = new ObjectId(_purchaseOrderExternal._id);
                                    _purchaseOrder.supplierId = new ObjectId(_purchaseOrderExternal.supplierId);
                                    _purchaseOrder.supplier = _purchaseOrderExternal.supplier;
                                    _purchaseOrder.supplier._id = new ObjectId(_purchaseOrderExternal.supplier._id);
                                    _purchaseOrder.freightCostBy = _purchaseOrderExternal.freightCostBy;
                                    _purchaseOrder.currency = _purchaseOrderExternal.currency;
                                    _purchaseOrder.currencyRate = _purchaseOrderExternal.currencyRate;
                                    _purchaseOrder.paymentMethod = _purchaseOrderExternal.paymentMethod;
                                    _purchaseOrder.paymentDueDays = _purchaseOrderExternal.paymentDueDays;
                                    _purchaseOrder.useVat = _purchaseOrderExternal.useVat;
                                    _purchaseOrder.vatRate = _purchaseOrderExternal.vatRate;
                                    _purchaseOrder.useIncomeTax = _purchaseOrderExternal.useIncomeTax;
                                    _purchaseOrder.isPosted = true;

                                    for (var poItem of _purchaseOrder.items) {
                                        for (var itemExternal of _poExternal.items) {
                                            itemExternal.product._id = new ObjectId(itemExternal.product._id);
                                            if ((itemExternal.product._id).equals(poItem.product._id)) {
                                                poItem.dealQuantity = itemExternal.dealQuantity;
                                                poItem.dealUom = itemExternal.dealUom;
                                                poItem.pricePerDealUnit = itemExternal.pricePerDealUnit;
                                                poItem.conversion = itemExternal.conversion;
                                                poItem.currency = _poExternal.currency;
                                                poItem.currencyRate = _poExternal.currencyRate;
                                            }
                                        }
                                    }
                                    tasks.push(this.purchaseOrderManager.update(_purchaseOrder));
                                    break;
                                }
                            }
                        }
                    }

                    Promise.all(tasks)
                        .then(result => {
                            resolve(result);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    generatePOno() {
        var now = new Date();
        var stamp = now / 1000 | 0;
        var code = stamp.toString();
        var year = now.getFullYear();
        var month = now.getMonth();
        var initial = 'AS';
        var div = "UMUM";
        var unit = '';
        switch (div.toUpperCase().trim()) {
            case "UMUM":
                unit = 'PBL.A';
                break;
            case 'UTILITY':
                unit = 'PBL.C';
                break;
            case "FINISHING&PRINTING":
                unit = 'PBL.D';
                break;
            case 'WEAVING':
                unit = 'PBL.E';
                break;
            case "SPINNING":
                unit = 'PBL.F';
                break;
            default:
                unit = "PBL.X";
        }
        var no = `${code}/DL-${unit}/PO-${initial}/${month}/${year}`;
        return no;
    }

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(pox => {
                    var getDefinition = require('../../pdf/definitions/purchase-order-external');
                    var definition = getDefinition(pox);

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
};
