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
var PurchaseRequestManager = require('./purchase-request-manager');
var CurrencyManager = require('../master/currency-manager');
var VatManager = require('../master/vat-manager');
var SupplierManager = require('../master/supplier-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var i18n = require('dl-i18n');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;

module.exports = class PurchaseOrderExternalManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.PurchaseOrderExternal);
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
        this.vatManager = new VatManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
    }

    _getQuery(paging) {
        var _default = {
            _deleted: false
        },
            pagingFilter = paging.filter || {},
            keywordFilter = {},
            query = {};

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
            '$and': [_default, paging.filter, keywordFilter]
        }
        return query;
    }

    create(purchaseOrderExternal) {
        return new Promise((resolve, reject) => {
            this._validate(purchaseOrderExternal)
                .then(validPurchaseOrderExternal => {
                    validPurchaseOrderExternal.no = generateCode();
                    validPurchaseOrderExternal._createdDate = new Date();
                    validPurchaseOrderExternal.supplierId = new ObjectId(validPurchaseOrderExternal.supplierId);
                    validPurchaseOrderExternal.supplier._id = new ObjectId(validPurchaseOrderExternal.supplier._id);
                    this.collection.insert(validPurchaseOrderExternal)
                        .then(id => {
                            var tasks = [];
                            var getPOInternalById = [];
                            for (var data of validPurchaseOrderExternal.items) {
                                if (ObjectId.isValid(data._id))
                                    getPOInternalById.push(this.purchaseOrderManager.getSingleById(data._id));
                            }
                            Promise.all(getPOInternalById)
                                .then(results => {
                                    for (var poInternal of results) {
                                        poInternal.isPosted = true;
                                        poInternal.status = poStatusEnum.PROCESSING;
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
                                        if (ObjectId.isValid(data._id))
                                            getPOInternalById.push(this.purchaseOrderManager.getSingleById(data._id));
                                    }
                                    Promise.all(getPOInternalById)
                                        .then(results => {
                                            for (var poInternal of results) {
                                                poInternal.isPosted = false;
                                                poInternal.status = poStatusEnum.CREATED;
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
        var valid = purchaseOrderGroup;

        var getOtherPurchaseOrder = this.collection.singleOrDefault({
            "$and": [{
                _id: {
                    '$ne': new ObjectId(valid._id)
                }
            }, {
                    "no": valid.no
                }]
        });
        var getCurrency = valid.currency && ObjectId.isValid(valid.currency._id) ? this.currencyManager.getSingleByIdOrDefault(valid.currency._id) : Promise.resolve(null);
        var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);
        var getVat = valid.vat && ObjectId.isValid(valid.vat._id) ? this.vatManager.getSingleByIdOrDefault(valid.vat._id) : Promise.resolve(null);


        var getPOInternal = [];
        valid.items = valid.items || [];
        for (var po of valid.items) {
            if (ObjectId.isValid(po._id)) {
                getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(po._id));
            }
        }

        return Promise.all([getOtherPurchaseOrder, getSupplier, getCurrency, getVat].concat(getPOInternal))
            .then(results => {
                var _otherPurchaseOrder = results[0];
                var _supplier = results[1];
                var _currency = results[2];
                var _vat = results[3];
                var _poInternals = results.slice(4, results.length);

                if (_otherPurchaseOrder) {
                    purchaseOrderExternalError["no"] = i18n.__("PurchaseOrderExternal.no.isExist:%s is exist", i18n.__("PurchaseOrderExternal.no._:No"));
                }

                if (!valid.supplierId || valid.supplierId.toString() === "") {
                    purchaseOrderExternalError["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                }
                else if (valid.supplier) {
                    if (!valid.supplier._id) {
                        purchaseOrderExternalError["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                    }
                }
                else if (!_supplier) {
                    purchaseOrderExternalError["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                }

                if (!valid.expectedDeliveryDate || valid.expectedDeliveryDate === "") {
                    purchaseOrderExternalError["expectedDeliveryDate"] = i18n.__("PurchaseOrderExternal.expectedDeliveryDate.isRequired:%s is required", i18n.__("PurchaseOrderExternal.expectedDeliveryDate._:Expected Delivery Date")); //"Tanggal tersedia tidak boleh kosong";
                }

                if (!valid.date || valid.date === "") {
                    purchaseOrderExternalError["date"] = i18n.__("PurchaseOrderExternal.date.isRequired:%s is required", i18n.__("PurchaseOrderExternal.date._:Date")); //"Tanggal tidak boleh kosong";
                }

                if (!valid.paymentMethod || valid.paymentMethod === "") {
                    purchaseOrderExternalError["paymentMethod"] = i18n.__("PurchaseOrderExternal.paymentMethod.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentMethod._:Payment Method")); //"Metode Pembayaran tidak boleh kosong";
                }

                if (!valid.currency) {
                    purchaseOrderExternalError["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";
                }
                else if (valid.currency) {
                    if (!valid.currency._id) {
                        purchaseOrderExternalError["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";
                    }
                }
                else if (!_currency) {
                    purchaseOrderExternalError["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";
                }

                if (!valid.currencyRate || valid.currencyRate === 0) {
                    purchaseOrderExternalError["currencyRate"] = i18n.__("PurchaseOrderExternal.currencyRate.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currencyRate._:Currency Rate")); //"Rate tidak boleh kosong";
                }

                if (!valid.paymentMethod || valid.paymentMethod.toUpperCase() != "CASH") {
                    if (!valid.paymentDueDays || valid.paymentDueDays === "" || valid.paymentDueDays === 0) {
                        purchaseOrderExternalError["paymentDueDays"] = i18n.__("PurchaseOrderExternal.paymentDueDays.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentDueDays._:Payment Due Days")); //"Tempo Pembayaran tidak boleh kosong";
                    }
                }
                if ((valid.freightCostBy || "").toString() === "") {
                    purchaseOrderExternalError["freightCostBy"] = i18n.__("PurchaseOrderExternal.freightCostBy.isRequired:%s is required", i18n.__("PurchaseOrderExternal.freightCostBy._:FreightCostBy")); //"Tempo Pembayaran tidak boleh kosong";
                }

                if (valid.items && valid.items.length > 0) {

                    var purchaseOrderExternalItemErrors = [];
                    var poItemExternalHasError = false;
                    for (var purchaseOrder of valid.items) {
                        var purchaseOrderError = {};
                        var purchaseOrderItemErrors = [];
                        var poItemHasError = false;
                        if (Object.getOwnPropertyNames(purchaseOrder).length == 0) {
                            purchaseOrderError["no"] = i18n.__("PurchaseOrderExternal.items.no.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.no._:No")); //"Purchase order internal tidak boleh kosong";
                            poItemExternalHasError = true;
                            purchaseOrderExternalItemErrors.push(purchaseOrderError);
                        } else {
                            for (var po of _poInternals) {
                                if (po._id.toString() === purchaseOrder._id.toString()) {
                                    if (po.isPosted && !valid._id) {
                                        poItemHasError = true;
                                        purchaseOrderError["no"] = i18n.__("PurchaseOrderExternal.items.isPosted:%s is already used", i18n.__("PurchaseOrderExternal.items._:Purchase Order Internal ")); //"Purchase order internal tidak boleh kosong";
                                    }
                                    else if (!purchaseOrder.no || purchaseOrder.no == "") {
                                        poItemHasError = true;
                                        purchaseOrderError["no"] = i18n.__("PurchaseOrderExternal.items.no.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.no._:No")); //"Purchase order internal tidak boleh kosong";
                                    }

                                    for (var poItem of purchaseOrder.items || []) {
                                        var poItemError = {};
                                        var dealUomId = new ObjectId(poItem.dealUom._id);
                                        var defaultUomId = new ObjectId(poItem.defaultUom._id);
                                        if (!poItem.dealQuantity || poItem.dealQuantity === 0) {
                                            poItemHasError = true;
                                            poItemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                        }
                                        else if (dealUomId.equals(defaultUomId) && poItem.dealQuantity > poItem.defaultQuantity) {
                                            poItemHasError = true;
                                            poItemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s must not be greater than defaultQuantity", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                        }
                                        if (!poItem.dealUom || !poItem.dealUom.unit || poItem.dealUom.unit === "") {
                                            poItemHasError = true;
                                            poItemError["dealUom"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                        }
                                        if (!poItem.priceBeforeTax || poItem.priceBeforeTax === 0) {
                                            poItemHasError = true;
                                            poItemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                        }
                                        var price = (poItem.priceBeforeTax.toString()).split(",");
                                        if (price[1] != undefined || price[1] !== "" || price[1] !== " ") {
                                            {
                                                poItem.priceBeforeTax = parseFloat(poItem.priceBeforeTax.toString() + ".00");
                                            }
                                        }
                                        else if (price[1].length() > 2) {
                                            poItemHasError = true;
                                            poItemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax.isRequired:%s is greater than 2", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                        }
                                        else {
                                            poItem.priceBeforeTax = poItem.priceBeforeTax;
                                        }
                                        if (!poItem.conversion || poItem.conversion === "") {
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
                    }
                    if (poItemExternalHasError) {
                        purchaseOrderExternalError["items"] = purchaseOrderExternalItemErrors;
                    }
                }
                else {
                    purchaseOrderExternalError["items"] = i18n.__("PurchaseOrderExternal.items.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items._:Purchase Order Internal")); //"Harus ada minimal 1 po internal";
                }

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(purchaseOrderExternalError).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data podl does not pass validation', purchaseOrderExternalError));
                }

                valid.supplier = _supplier;
                valid.supplierId = new ObjectId(valid.supplier._id);
                valid.currency = _currency;
                valid.currency._id = new ObjectId(valid.currency._id);
                valid.vat = _vat;
                valid.date = new Date(valid.date);
                valid.expectedDeliveryDate = new Date(valid.expectedDeliveryDate);
                valid.currencyRate = parseInt(valid.currencyRate);

                var items = [];

                for (var _item of valid.items) {
                    for (var _purchaseOrder of _poInternals) {
                        if (_purchaseOrder._id.toString() === _item._id.toString()) {
                            var _po = new PurchaseOrder();
                            _po = _purchaseOrder;
                            for (var _poItem of _item.items) {
                                for (var _purchaseOrderItem of _po.items) {
                                    if (_purchaseOrderItem.product._id.toString() === _poItem.product._id.toString()) {
                                        _purchaseOrderItem.product = _poItem.product;
                                        _purchaseOrderItem.dealQuantity = _poItem.dealQuantity;
                                        _purchaseOrderItem.dealUom = _poItem.dealUom;
                                        _purchaseOrderItem.useIncomeTax = _poItem.useIncomeTax;
                                        _purchaseOrderItem.priceBeforeTax = _poItem.priceBeforeTax;
                                        _purchaseOrderItem.pricePerDealUnit = _poItem.useIncomeTax ? (100 * _poItem.priceBeforeTax) / 110 : _poItem.priceBeforeTax;
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
                if (!valid.stamp) {
                    valid = new PurchaseOrderExternal(valid);
                }
                valid.vat = _vat;
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    post(listPurchaseOrderExternal) {
        var tasksUpdatePoInternal = [];
        var tasksUpdatePoEksternal = [];
        var tasksUpdatePR = [];
        var getPRById = [];
        var getPOItemById = [];
        var getPOExternalById = [];
        return new Promise((resolve, reject) => {
            for (var purchaseOrderExternal of listPurchaseOrderExternal) {
                getPOExternalById.push(this.getSingleByIdOrDefault(purchaseOrderExternal._id));
                for (var data of purchaseOrderExternal.items) {
                    if (ObjectId.isValid(data._id))
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
                                                    getPRById.push(this.purchaseRequestManager.getSingleByIdOrDefault(_purchaseOrder.purchaseRequest._id));
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
                                                    _purchaseOrder.status = poStatusEnum.ORDERED;

                                                    for (var poItem of _purchaseOrder.items) {
                                                        for (var itemExternal of _poExternalItem.items) {
                                                            itemExternal.product._id = new ObjectId(itemExternal.product._id);
                                                            if ((itemExternal.product._id).equals(poItem.product._id)) {
                                                                poItem.dealQuantity = itemExternal.dealQuantity;
                                                                poItem.dealUom = itemExternal.dealUom;
                                                                poItem.priceBeforeTax = itemExternal.priceBeforeTax;
                                                                poItem.pricePerDealUnit = itemExternal.useIncomeTax ? (100 * itemExternal.priceBeforeTax) / 110 : itemExternal.priceBeforeTax;
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
                                .then((_results) => {
                                    Promise.all(getPRById)
                                        .then((_prs) => {
                                            for (var _pr of _prs) {
                                                _pr.status = prStatusEnum.ORDERED;
                                                tasksUpdatePR.push(this.purchaseRequestManager.update(_pr));
                                            }
                                            Promise.all(tasksUpdatePR)
                                                .then((_updatedId) => {
                                                    Promise.all(tasksUpdatePoEksternal)
                                                        .then((_listIdPoEksternal) => {
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

    unpost(poExternalId) {
        return this.getSingleByIdOrDefault(poExternalId)
            .then((poExternal) => {
                return this.validateCancelAndUnpost(poExternal)
                    .then((valid) => {
                        var getPos = valid.items.map((po) => this.purchaseOrderManager.getSingleByIdOrDefault(po._id));

                        return Promise.all(getPos)
                            .then((pos) => {

                                var updatePos = pos.map(po => {

                                    po.purchaseOrderExternalId = {};
                                    po.purchaseOrderExternal = {};
                                    po.supplierId = {};
                                    po.supplier = {};
                                    po.freightCostBy = '';
                                    po.currency = {};
                                    po.currencyRate = 1;
                                    po.paymentMethod = '';
                                    po.paymentDueDays = 0;
                                    po.vat = {};
                                    po.useVat = false;
                                    po.vatRate = 0;
                                    po.useIncomeTax = false;
                                    po.isPosted = false;
                                    po.status = poStatusEnum.PROCESSING;

                                    for (var poItem of po.items) {
                                        poItem.dealQuantity = 0;
                                        poItem.dealUom = {};
                                        poItem.priceBeforeTax = 0;
                                        poItem.pricePerDealUnit = 0;
                                        poItem.conversion = 1;
                                        poItem.currency = {};
                                        poItem.currencyRate = 1;
                                    }

                                    return this.purchaseOrderManager.update(po)
                                        .then((id) => this.purchaseOrderManager.getSingleByIdOrDefault(id));
                                })

                                return Promise.all(updatePos);
                            })
                            .then((updatedPos) => {

                                var getPrs = updatedPos.map((po) => {
                                    return this.purchaseRequestManager.getSingleByIdOrDefault(po.purchaseRequest._id);
                                })

                                return Promise.all(getPrs);

                            })
                            .then((prs) => {

                                var updatePrs = prs.map((pr) => {

                                    pr.status = prStatusEnum.PROCESSING;

                                    return this.purchaseRequestManager.update(pr)
                                        .then((id) => this.purchaseRequestManager.getSingleByIdOrDefault(id));
                                })

                                return Promise.all(updatePrs);
                            })
                            .then((updatedPrs) => {

                                valid.items = valid.items.map((po) => {

                                    po.isPosted = false;
                                    po.status = poStatusEnum.PROCESSING;

                                    po.purchaseRequest.status = prStatusEnum.PROCESSING;

                                    return po;
                                })

                                valid.isPosted = false;
                                valid.status = poStatusEnum.CREATED;

                                return this.update(valid)
                                    .then((poExId) => {

                                        return Promise.resolve(poExId);
                                    });
                            });
                    });
            });
    }

    validateCancelAndUnpost(purchaseOrderExternal) {
        var purchaseOrderExternalError = {};
        var valid = purchaseOrderExternal;

        return this.getSingleByIdOrDefault(valid._id)
            .then((poe) => {
                if (!poe.isPosted)
                    purchaseOrderExternalError["no"] = i18n.__("PurchaseOrderExternal.isPosted:%s is not yet being posted", i18n.__("PurchaseOrderExternal.isPosted._:Posted"));

                if (valid.items && valid.items.length > 0) {
                    for (var purchaseOrder of valid.items) {
                        var poItemError = {};
                        var purchaseOrderItemErrors = [];
                        var poItemHasError = false;
                        for (var poItem of purchaseOrder.items) {
                            if (poItem.fulfillments && poItem.fulfillments.length > 0) {
                                poItemHasError = true;
                                poItemError["no"] = i18n.__("PurchaseOrderExternal.items.items.no:%s is already have delivery order", i18n.__("PurchaseOrderExternal.items,items.no._:No"));

                                purchaseOrderItemErrors.push(poItemError);
                            }
                        }

                        if (poItemHasError)
                            purchaseOrderExternalError["items"] = purchaseOrderItemErrors;
                    }
                }

                if (Object.getOwnPropertyNames(purchaseOrderExternalError).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data podl does not pass validation', purchaseOrderExternalError));
                }

                if (!valid.stamp) {
                    valid = new PurchaseOrderExternal(valid);
                }
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    cancel(poExternalId) {
        return this.getSingleByIdOrDefault(poExternalId)
            .then((poExternal) => {
                return this.validateCancelAndUnpost(poExternal)
                    .then((valid) => {
                        var getPos = valid.items.map((po) => this.purchaseOrderManager.getSingleByIdOrDefault(po._id));

                        return Promise.all(getPos)
                            .then((pos) => {

                                var voidPos = pos.map((po) => {

                                    po.status = poStatusEnum.VOID;

                                    return this.purchaseOrderManager.update(po)
                                        .then((id) => this.purchaseOrderManager.getSingleByIdOrDefault(id));
                                })

                                return Promise.all(voidPos);
                            })
                            // .then((voidedPos) => {

                            //     var getPrs = voidedPos.map((po) => {
                            //         return this.purchaseRequestManager.getSingleByIdOrDefault(po.purchaseRequest._id);
                            //     })

                            //     return Promise.all(getPrs);

                            // })
                            // .then((prs) => {

                            //     var voidPrs = prs.map((pr) => {

                            //         pr.status = prStatusEnum.VOID;

                            //         return this.purchaseRequest.update(pr)
                            //             .then((id) => this.purchaseRequestManager.getSingleByIdOrDefault(id));
                            //     })

                            //     return Promise.all(voidPrs);
                            // })
                            .then((voidedPrs) => {

                                valid.status = poStatusEnum.VOID;

                                valid.items = valid.items.map((po) => {

                                    po.isPosted = false;
                                    po.status = poStatusEnum.VOID;

                                    // po.purchaseRequest.status = prStatusEnum.VOID;

                                    return po;
                                })

                                return this.update(valid)
                                    .then((poExId) => {

                                        return Promise.resolve(poExId);
                                    });
                            });
                    });

            });
    }

    close(poExternalId) {

        return this.getSingleByIdOrDefault(poExternalId)
            .then((poExternal) => {
                return this.validateClose(poExternal)
                    .then((valid) => {

                        valid.isClosed = true;

                        return this.update(valid)
                            .then((poExId) => {

                                return Promise.resolve(poExId);
                            });
                    });
            });
    }

    validateClose(purchaseOrderExternal) {
        var purchaseOrderExternalError = {};
        var valid = purchaseOrderExternal;

        return this.getSingleByIdOrDefault(valid._id)
            .then((poe) => {
                if (!poe.isPosted)
                    purchaseOrderExternalError["no"] = i18n.__("PurchaseOrderExternal.isPosted:%s is not yet being posted", i18n.__("PurchaseOrderExternal.isPosted._:Posted"));

                if (Object.getOwnPropertyNames(purchaseOrderExternalError).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data podl does not pass validation', purchaseOrderExternalError));
                }

                if (!valid.stamp) {
                    valid = new PurchaseOrderExternal(valid);
                }
                valid.stamp(this.user.username, 'manager');
                return Promise.resolve(valid);
            });
    }

    getAllData(filter) {
        return new Promise((resolve, reject) => {
            var sorting = {
                "date": -1,
                "no": 1
            };
            var query = Object.assign({});
            query = Object.assign(query, filter);
            query = Object.assign(query, {
                _deleted: false
            });

            var _select = ["no",
                "date",
                "supplier",
                "expectedDeliveryDate",
                "freightCostBy",
                "paymentMethod",
                "paymentDueDays",
                "currency",
                "useIncomeTax",
                "useVat",
                "vat.rate",
                "remark",
                "isPosted",
                "_createdBy",
                "items.no",
                "items.purchaseRequest.no",
                "items.items"];

            this.collection.where(query).select(_select).order(sorting).execute()
                .then((results) => {
                    resolve(results.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
};