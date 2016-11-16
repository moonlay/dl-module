'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var PurchaseOrderExternal = DLModels.purchasing.PurchaseOrderExternal;
var PurchaseOrder = DLModels.purchasing.PurchaseOrder;
var PurchaseOrderManager = require('./purchase-order-manager');
var CurrencyManager = require('../master/currency-manager');
var VatManager = require('../master/vat-manager');
var SupplierManager = require('../master/supplier-manager');
var BaseManager = require('../base-manager');
var generateCode = require('../../utils/code-generator');
var i18n = require('dl-i18n');

module.exports = class PurchaseOrderExternalManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.PurchaseOrderExternal);
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
        this.vatManager = new VatManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        },
            keywordFilter = {};

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

            var filterPrNo = {
                items: {
                    $elemMatch: {
                        'purchaseRequest.no': {
                            '$regex': regex
                        }
                    }
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
                '$or': [filterPODLNo, filterPrNo, filterRefPO, filterPOItem, filterSupplierName]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
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
                            var getPOInternalById = [];
                            for (var data of validPurchaseOrderExternal.items) {
                                getPOInternalById.push(this.purchaseOrderManager.getSingleById(data._id));
                            }
                            Promise.all(getPOInternalById)
                                .then(results => {
                                    for (var poInternal of results) {
                                        poInternal.isPosted = true;
                                        tasks.push(this.purchaseOrderManager.update(poInternal));
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
                                    var getPOInternalById = [];
                                    for (var data of validData.items) {
                                        getPOInternalById.push(this.purchaseOrderManager.getSingleById(data._id));
                                    }
                                    Promise.all(getPOInternalById)
                                        .then(results => {
                                            for (var poInternal of results) {
                                                poInternal.isPosted = false;
                                                tasks.push(this.purchaseOrderManager.update(poInternal));

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
            var getCurrency = valid.currency ? this.currencyManager.getSingleByIdOrDefault(valid.currency._id) : Promise.resolve(null);
            var getSupplier = valid.supplier ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);
            var getVat = valid.vat ? this.vatManager.getSingleByIdOrDefault(valid.vat._id) : Promise.resolve(null);


            var getPOInternal = [];
            for (var po of valid.items)
                getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(po._id));

            Promise.all([getSupplier, getCurrency, getVat].concat(getPOInternal))
                .then(results => {
                    var _supplier = results[0];
                    var _currency = results[1];
                    var _vat = results[2];
                    var _poInternals = results.slice(3, results.length);

                    var now = new Date();

                    if (!valid.supplierId || valid.supplierId.toString() == '')
                        purchaseOrderExternalError["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                    else if (valid.supplier) {
                        if (!valid.supplier._id)
                            purchaseOrderExternalError["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                    } else if (!_supplier)
                        purchaseOrderExternalError["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";

                    if (!valid.expectedDeliveryDate || valid.expectedDeliveryDate == '')
                        purchaseOrderExternalError["expectedDeliveryDate"] = i18n.__("PurchaseOrderExternal.expectedDeliveryDate.isRequired:%s is required", i18n.__("PurchaseOrderExternal.expectedDeliveryDate._:Expected Delivery Date")); //"Tanggal tersedia tidak boleh kosong";

                    if (!valid.date || valid.date == '')
                        purchaseOrderExternalError["date"] = i18n.__("PurchaseOrderExternal.date.isRequired:%s is required", i18n.__("PurchaseOrderExternal.date._:Date")); //"Tanggal tidak boleh kosong";

                    if (!valid.paymentMethod || valid.paymentMethod == '')
                        purchaseOrderExternalError["paymentMethod"] = i18n.__("PurchaseOrderExternal.paymentMethod.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentMethod._:Payment Method")); //"Metode Pembayaran tidak boleh kosong";

                    if (!valid.currency)
                        purchaseOrderExternalError["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";
                    else if (valid.currency) {
                        if (!valid.currency._id)
                            purchaseOrderExternalError["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";
                    } else if (!_currency)
                        purchaseOrderExternalError["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";

                    if (!valid.currencyRate || valid.currencyRate == 0)
                        purchaseOrderExternalError["currencyRate"] = i18n.__("PurchaseOrderExternal.currencyRate.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currencyRate._:Currency Rate")); //"Rate tidak boleh kosong";

                    if (valid.paymentMethod.toUpperCase() != "CASH")
                        if (!valid.paymentDueDays || valid.paymentDueDays == '' || valid.paymentDueDays == 0)
                            purchaseOrderExternalError["paymentDueDays"] = i18n.__("PurchaseOrderExternal.paymentDueDays.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentDueDays._:Payment Due Days")); //"Tempo Pembayaran tidak boleh kosong";

                    if ((valid.freightCostBy || '').toString() == '')
                        purchaseOrderExternalError["freightCostBy"] = i18n.__("PurchaseOrderExternal.freightCostBy.isRequired:%s is required", i18n.__("PurchaseOrderExternal.freightCostBy._:FreightCostBy")); //"Tempo Pembayaran tidak boleh kosong";

                    // if ((valid.paymentMethod.toUpperCase() != "CASH") && !valid.paymentDueDays || valid.paymentDueDays == '')
                    //     purchaseOrderExternalError["paymentDueDays"] = "Tempo Pembayaran tidak boleh kosong";

                    // if (valid.useVat == undefined || valid.useVat.toString() === '')
                    //     purchaseOrderExternalError["useVat"] = "Pengenaan PPn harus dipilih";

                    // if (valid.useIncomeTax == undefined || valid.useIncomeTax.toString() === '')
                    //     purchaseOrderExternalError["useIncomeTax"] = "Pengenaan PPh harus dipilih";

                    if (valid.items && valid.items.length > 0) {
                        var purchaseOrderExternalItemErrors = [];
                        var poItemExternalHasError = false;
                        for (var purchaseOrder of valid.items) {
                            var purchaseOrderError = {};
                            var purchaseOrderItemErrors = [];
                            var poItemHasError = false;
                            for (var po of _poInternals) {
                                if (po._id.toString() == purchaseOrder._id.toString()) {
                                    if (po.isPosted && !valid._id) {
                                        poItemHasError = true;
                                        purchaseOrderError["no"] = i18n.__("PurchaseOrderExternal.items.isPosted:%s is already used", i18n.__("PurchaseOrderExternal.items._:Purchase Order Internal ")); //"Purchase order internal tidak boleh kosong";
                                    } else if (!purchaseOrder.no || purchaseOrder.no == "") {
                                        poItemHasError = true;
                                        purchaseOrderError["no"] = i18n.__("PurchaseOrderExternal.items.no.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.no._:No")); //"Purchase order internal tidak boleh kosong";
                                    }

                                    for (var poItem of purchaseOrder.items || []) {
                                        var poItemError = {};
                                        var dealUomId = new ObjectId(poItem.dealUom._id);
                                        var defaultUomId = new ObjectId(poItem.defaultUom._id);
                                        if (!poItem.dealQuantity || poItem.dealQuantity == 0) {
                                            poItemHasError = true;
                                            poItemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                        }
                                        else if (dealUomId.equals(defaultUomId) && poItem.dealQuantity > poItem.defaultQuantity) {
                                            poItemHasError = true;
                                            poItemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s must not be greater than defaultQuantity", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                        }
                                        if (!poItem.dealUom || !poItem.dealUom.unit || poItem.dealUom.unit == "") {
                                            poItemHasError = true;
                                            poItemError["dealUom"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                        }
                                        if (!poItem.pricePerDealUnit || poItem.pricePerDealUnit == 0) {
                                            poItemHasError = true;
                                            poItemError["pricePerDealUnit"] = i18n.__("PurchaseOrderExternal.items.items.pricePerDealUnit.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.pricePerDealUnit._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                        }
                                        var price = (poItem.pricePerDealUnit.toString()).split(",");
                                        if (price[1] != undefined || price[1] != "" || price[1] != " ") {
                                            poItem.pricePerDealUnit = parseFloat(poItem.pricePerDealUnit.toString() + ".00");
                                        } else if (price[1].length() > 2) {
                                            poItemHasError = true;
                                            poItemError["pricePerDealUnit"] = i18n.__("PurchaseOrderExternal.items.items.pricePerDealUnit.isRequired:%s is greater than 2", i18n.__("PurchaseOrderExternal.items.items.pricePerDealUnit._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
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
                                    break;
                                }
                            }
                        }
                        if (poItemExternalHasError)
                            purchaseOrderExternalError["items"] = purchaseOrderExternalItemErrors;
                    }
                    else
                        purchaseOrderExternalError["items"] = i18n.__("PurchaseOrderExternal.items.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items._:Purchase Order Internal")); //"Harus ada minimal 1 po internal";

                    // 2c. begin: check if data has any error, reject if it has.
                    if (Object.getOwnPropertyNames(purchaseOrderExternalError).length > 0) {
                        var ValidationError = require('../../validation-error');
                        reject(new ValidationError('data podl does not pass validation', purchaseOrderExternalError));
                    }

                    valid.supplier = _supplier;
                    valid.supplierId = new ObjectId(valid.supplier._id);
                    valid.currency = _currency;
                    valid.currency._id = new ObjectId(valid.currency._id);
                    valid.vat = _vat;

                    var items = [];

                    for (var _item of valid.items) {
                        for (var _purchaseOrder of _poInternals) {
                            if (_purchaseOrder._id.toString() == _item._id.toString()) {
                                var _po = new PurchaseOrder();
                                _po = _purchaseOrder;
                                for (var _poItem of _item.items) {
                                    for (var _purchaseOrderItem of _po.items) {
                                        if (_purchaseOrderItem.product._id.toString() == _poItem.product._id.toString()) {
                                            _purchaseOrderItem.product = _poItem.product;
                                            _purchaseOrderItem.dealQuantity = _poItem.dealQuantity;
                                            _purchaseOrderItem.dealUom = _poItem.dealUom;
                                            _purchaseOrderItem.pricePerDealUnit = _poItem.pricePerDealUnit;
                                            _purchaseOrderItem.conversion = _poItem.conversion;
                                            break;
                                        }
                                    }
                                }
                                items.push(_po);
                                break;
                            }
                        }
                    }
                    valid.items = items;
                    if (!valid.stamp)
                        valid = new PurchaseOrderExternal(valid);
                    valid.vat = _vat;
                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    post(listPurchaseOrderExternal) {
        var tasksUpdatePoInternal = [];
        var tasksUpdatePoEksternal = [];
        var getPOItemById = [];
        var getPOExternalById = [];
        return new Promise((resolve, reject) => {
            for (var purchaseOrderExternal of listPurchaseOrderExternal) {
                getPOExternalById.push(this.getSingleByIdOrDefault(purchaseOrderExternal._id));
                for (var data of purchaseOrderExternal.items) {
                    getPOItemById.push(this.purchaseOrderManager.getSingleByIdOrDefault(data._id));
                }
            }
            Promise.all(getPOExternalById)
                .then(_purchaseOrderExternalList => {
                    Promise.all(getPOItemById)
                        .then(_purchaseOrderList => {
                            for (var _purchaseOrderExternal of listPurchaseOrderExternal) {
                                for (var _poExternal of _purchaseOrderExternalList) {
                                    if (_poExternal._id.equals(_purchaseOrderExternal._id)) {
                                        _purchaseOrderExternal = _poExternal;
                                        _purchaseOrderExternal.isPosted = true;
                                        tasksUpdatePoEksternal.push(this.update(_purchaseOrderExternal));

                                        for (var _poExternalItem of _purchaseOrderExternal.items) {
                                            for (var _purchaseOrder of _purchaseOrderList) {
                                                if (_purchaseOrder._id.equals(_poExternalItem._id)) {
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
                                                    _purchaseOrder.vat = _purchaseOrderExternal.vat;
                                                    _purchaseOrder.useVat = _purchaseOrderExternal.useVat;
                                                    _purchaseOrder.vatRate = _purchaseOrderExternal.vatRate;
                                                    _purchaseOrder.useIncomeTax = _purchaseOrderExternal.useIncomeTax;
                                                    _purchaseOrder.isPosted = true;

                                                    for (var poItem of _purchaseOrder.items) {
                                                        for (var itemExternal of _poExternalItem.items) {
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
                                                    tasksUpdatePoInternal.push(this.purchaseOrderManager.update(_purchaseOrder));
                                                    break;
                                                }
                                            }
                                        }

                                        break;
                                    }
                                }
                            }
                            Promise.all(tasksUpdatePoInternal)
                                .then(_listIdPoInternal => {
                                    Promise.all(tasksUpdatePoEksternal)
                                        .then(_listIdPoEksternal => {
                                            resolve(_listIdPoEksternal);
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

    generatePOno() {
        var now = new Date();
        var stamp = now / 1000 | 0;
        var code = stamp.toString();
        var year = now.getFullYear();
        var month = this._getRomanNumeral(now.getMonth());
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

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrderExternal}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrderExternal}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    _getRomanNumeral(_number) {
        var listRoman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXXII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI"];
        return listRoman[_number];
    }
};
