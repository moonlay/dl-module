'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var PurchaseOrderExternal = DLModels.garmentPurchasing.GarmentPurchaseOrderExternal;
var PurchaseOrder = DLModels.garmentPurchasing.GarmentPurchaseOrder;
var uom = DLModels.master.Uom;
var PurchaseOrderManager = require('./purchase-order-manager');
var PurchaseRequestManager = require('./purchase-request-manager');
var CurrencyManager = require('../master/currency-manager');
var VatManager = require('../master/vat-manager');
var SupplierManager = require('../master/garment-supplier-manager');
var ProductManager = require("../master/garment-product-manager");
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var i18n = require('dl-i18n');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;
var moment = require('moment');

module.exports = class PurchaseOrderExternalManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.garmentPurchasing.collection.GarmentPurchaseOrderExternal);
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.currencyManager = new CurrencyManager(db, user);
        this.vatManager = new VatManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
        this.productManager = new ProductManager(db, user);
        this.purchaseOrderFields = [
            "_id",
            "no",
            "refNo",
            "purchaseRequestId",
            "purchaseRequest._id",
            "purchaseRequest.no",
            "date",
            "expectedDeliveryDate",
            "actualDeliveryDate",
            "isPosted",
            "isClosed",
            "remark",
            "status",
            "items.purchaseOrderExternalId",
            "items.purchaseOrderExternal._id",
            "items.purchaseOrderExternal.no",
            "items.supplierId",
            "items.supplier.code",
            "items.supplier.name",
            "items.supplier.address",
            "items.supplier.contact",
            "items.supplier.PIC",
            "items.supplier.import",
            "items.supplier.NPWP",
            "items.supplier.serialNumber",
            "items.unitId",
            "items.unit.code",
            "items.unit.divisionId",
            "items.unit.division",
            "items.unit.name",
            "items.freightCostBy",
            "items.currency.code",
            "items.currency.symbol",
            "items.currency.rate",
            "items.currencyRate",
            "items.paymentMethod",
            "items.paymentDueDays",
            "items.vat",
            "items.useVat",
            "items.vatRate",
            "items.useIncomeTax",
            "items.productId",
            "items.product",
            "items.defaultQuantity",
            "items.defaultUom",
            "items.dealQuantity",
            "items.dealUom",
            "items.realizationQuantity",
            "items.pricePerDealUnit",
            "items.priceBeforeTax",
            "items.budgetPrice",
            "items.categoryId",
            "items.category.code",
            "items.category.name",
            "items.conversion",
            "items.isPosted",
            "items.isClosed",

        ];
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

    _validate(purchaseOrderGroup) {
        var purchaseOrderExternalError = {};
        var valid = purchaseOrderGroup;

        var getOtherPurchaseOrderExternal = this.collection.singleOrDefault({
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
        var poId = valid.items.map((item) => { return item.poId })
        poId = poId.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        for (var po of poId) {
            if (ObjectId.isValid(po)) {
                getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(po, this.purchaseOrderFields));
            }
        }

        return Promise.all([getOtherPurchaseOrderExternal, getSupplier, getCurrency, getVat].concat(getPOInternal))
            .then(results => {
                var _otherPurchaseOrderExternal = results[0];
                var _supplier = results[1];
                var _currency = results[2];
                var _vat = results[3];
                var _poInternals = results.slice(4, results.length);

                var _productIds = valid.items.map((item) => {
                    return item.product._id
                });
                _productIds = [].concat.apply([], _productIds);

                var _listProductIds = _productIds.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var getProducts = _listProductIds.map((productId) => {
                    if (ObjectId.isValid(productId)) {
                        return this.productManager.getSingleByIdOrDefault(productId)
                    } else {
                        return Promise.resolve(null)
                    }
                });

                return Promise.all(getProducts)
                    .then(listProduct => {
                        var error = {};

                        if (_otherPurchaseOrderExternal) {
                            error["no"] = i18n.__("PurchaseOrderExternal.no.isExist:%s is exist", i18n.__("PurchaseOrderExternal.no._:No"));
                        }

                        if (!valid.supplierId || valid.supplierId.toString() === "") {
                            error["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                        }
                        else if (valid.supplier) {
                            if (!valid.supplier._id) {
                                error["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                            }
                        }
                        else if (!_supplier) {
                            error["supplierId"] = i18n.__("PurchaseOrderExternal.supplier.name.isRequired:%s is required", i18n.__("PurchaseOrderExternal.supplier.name._:Name")); //"Nama Supplier tidak boleh kosong";
                        }

                        if (!valid.expectedDeliveryDate || valid.expectedDeliveryDate === "") {
                            error["expectedDeliveryDate"] = i18n.__("PurchaseOrderExternal.expectedDeliveryDate.isRequired:%s is required", i18n.__("PurchaseOrderExternal.expectedDeliveryDate._:Expected Delivery Date")); //"Tanggal tersedia tidak boleh kosong";
                        }

                        if (!valid.date || valid.date === "") {
                            error["date"] = i18n.__("PurchaseOrderExternal.date.isRequired:%s is required", i18n.__("PurchaseOrderExternal.date._:Date")); //"Tanggal tidak boleh kosong";
                        }

                        if (!valid.paymentMethod || valid.paymentMethod === "") {
                            error["paymentMethod"] = i18n.__("PurchaseOrderExternal.paymentMethod.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentMethod._:Payment Method")); //"Metode Pembayaran tidak boleh kosong";
                        }

                        if (!valid.currency) {
                            error["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";
                        }
                        else if (valid.currency) {
                            if (!valid.currency._id) {
                                error["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";
                            }
                        }
                        else if (!_currency) {
                            error["currency"] = i18n.__("PurchaseOrderExternal.currency.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currency._:Currency")); //"Currency tidak boleh kosong";
                        }

                        // if (!valid.paymentMethod || valid.paymentMethod.toUpperCase() != "CASH") {
                        //     if (!valid.paymentDueDays || valid.paymentDueDays === "" || valid.paymentDueDays === 0) {
                        //         error["paymentDueDays"] = i18n.__("PurchaseOrderExternal.paymentDueDays.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentDueDays._:Payment Due Days")); //"Tempo Pembayaran tidak boleh kosong";
                        //     }
                        // }
                        if ((valid.freightCostBy || "").toString() === "") {
                            error["freightCostBy"] = i18n.__("PurchaseOrderExternal.freightCostBy.isRequired:%s is required", i18n.__("PurchaseOrderExternal.freightCostBy._:FreightCostBy")); //"Tempo Pembayaran tidak boleh kosong";
                        }

                        if (valid.items && valid.items.length > 0) {
                            var itemErrors = [];
                            for (var items of valid.items) {
                                var itemError = {};
                                var po = _poInternals.find((poInternal) => poInternal._id.toString() == items.poId.toString());
                                var poItem = po.items.find((item) =>  item.product._id.toString() === items.product._id.toString() )
                                if (poItem) {
                                    if (poItem.isPosted && !valid._id) {
                                        itemError["no"] = i18n.__("PurchaseOrderExternal.items.isPosted:%s is already used", i18n.__("PurchaseOrderExternal.items._:Purchase Order Internal ")); //"Purchase order internal tidak boleh kosong";
                                    }
                                    else if (!items.poNo || items.poNo == "") {
                                        itemError["no"] = i18n.__("PurchaseOrderExternal.items.no.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.no._:No")); //"Purchase order internal tidak boleh kosong";
                                    }
                                    var dealUomId = new ObjectId(items.dealUom._id);
                                    var defaultUomId = new ObjectId(items.defaultUom._id);

                                    var product = listProduct.find((_product) => _product._id.toString() === items.product._id.toString());

                                    if (!items.dealQuantity || items.dealQuantity === 0) {
                                        itemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                    }
                                    else if (dealUomId.equals(defaultUomId) && items.dealQuantity > items.defaultQuantity) {
                                        itemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.dealQuantity.isGreater:%s must not be greater than defaultQuantity", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                    }
                                    if (!items.dealUom || !items.dealUom.unit || items.dealUom.unit === "") {
                                        itemError["dealUom"] = i18n.__("PurchaseOrderExternal.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                    }
                                    if (!items.priceBeforeTax || items.priceBeforeTax === 0) {
                                        itemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.priceBeforeTax.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                    } else if (items.priceBeforeTax > items.budgetPrice) {
                                        itemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.priceBeforeTax.isGreater:%s must not be greater than budget price", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                    }
                                    var price = (items.priceBeforeTax.toString()).split(",");
                                    if (price[1] != undefined || price[1] !== "" || price[1] !== " ") {
                                        {
                                            items.priceBeforeTax = parseFloat(items.priceBeforeTax.toString() + ".00");
                                        }
                                    }
                                    else if (price[1].length() > 2) {
                                        itemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.priceBeforeTax.isRequired:%s is greater than 2", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                    }
                                    else {
                                        items.priceBeforeTax = items.priceBeforeTax;
                                    }
                                    if (!items.conversion || items.conversion === "") {
                                        itemError["conversion"] = i18n.__("PurchaseOrderExternal.items.conversion.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.conversion._:Conversion")); //"Konversi tidak boleh kosong";
                                    }
                                }
                                itemErrors.push(itemError);
                            }
                            for (var itemError of itemErrors) {
                                if (Object.getOwnPropertyNames(itemError).length > 0) {
                                    error.items = itemErrors;
                                    break;
                                }
                            }
                        }
                        else {
                            error["items"] = i18n.__("PurchaseOrderExternal.items.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items._:Purchase Order Internal")); //"Harus ada minimal 1 po internal";
                        }

                        // 2c. begin: check if data has any error, reject if it has.
                        if (Object.getOwnPropertyNames(error).length > 0) {
                            var ValidationError = require('module-toolkit').ValidationError;
                            return Promise.reject(new ValidationError('data podl does not pass validation', error));
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
                            var product = listProduct.find(prd => prd._id.toString() === _item.product._id.toString());
                            var poInternal = _poInternals.find(poInternal => poInternal._id.toString() === _item.poId.toString())
                            _item.poId = poInternal._id;
                            _item.poNo = poInternal.no;
                            _item.product = product;
                            _item.productId = product._id;
                            _item.dealQuantity = Number(_item.dealQuantity);
                            _item.defaultQuantity = Number(_item.defaultQuantity);
                            _item.priceBeforeTax = Number(_item.priceBeforeTax);
                            _item.pricePerDealUnit = _item.useIncomeTax ? (100 * _item.priceBeforeTax) / 110 : _item.priceBeforeTax;
                            _item.budgetPrice = Number(_item.budgetPrice);
                            _item.conversion = Number(_item.conversion);
                            items.push(_item);
                        }
                        valid.items = items;
                        if (!valid.stamp) {
                            valid = new PurchaseOrderExternal(valid);
                        }
                        valid.vat = _vat;
                        valid.stamp(this.user.username, 'manager');
                        return Promise.resolve(valid);
                    });
            });
    }

    _beforeInsert(purchaseOrderExternal) {
        purchaseOrderExternal.no = generateCode();
        purchaseOrderExternal.status = poStatusEnum.CREATED;
        return Promise.resolve(purchaseOrderExternal)
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((purchaseOrderExternal) => {
                var _poIds = purchaseOrderExternal.items.map((item) => {
                    return item.poId.toString()
                });
                _poIds = [].concat.apply([], _poIds);

                var _listPoIds = _poIds.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })
                var jobsGetPO = _listPoIds.map((poeItem) => {
                    return this.purchaseOrderManager.getSingleByIdOrDefault(poeItem)
                });
                return Promise.all(jobsGetPO)
                    .then((listPurchaseOrders) => {
                        this.updatePurchaseOrder(listPurchaseOrders, purchaseOrderExternal)
                    })
            })
            .then(() => {
                return Promise.resolve(id)
            });
    }

    updatePurchaseOrder(listPurchaseOrders, purchaseOrderExternal) {
        var jobsUpdatePO = listPurchaseOrders.map((purchaseOrder) => {
            for (var poItem of purchaseOrder.items) {
                var poExtItem = purchaseOrderExternal.items.find((poeItem) => purchaseOrder._id.toString() === poeItem.poId.toString() && poItem.product._id.toString() === poeItem.product._id.toString());
                if (poExtItem) {
                    poItem.pricePerDealUnit = Number(poExtItem.pricePerDealUnit);
                    poItem.priceBeforeTax = Number(poExtItem.priceBeforeTax);
                    poItem.dealQuantity = Number(poExtItem.dealQuantity);
                    poItem.dealUom = poExtItem.dealUom;
                    poItem.conversion = Number(poExtItem.conversion);
                    poItem.isClosed = true;
                    poItem.status = poStatusEnum.PROCESSING;
                }
            }
            purchaseOrder.status = purchaseOrder.items.find((item) => item.status.value === Math.max.apply(Math, purchaseOrder.items.map(function (item) { return item.status.value; }))).status
            purchaseOrder.isClosed = purchaseOrder.items
                .map((item) => item.isClosed)
                .reduce((prev, curr, index) => {
                    return prev && curr
                }, true);
            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
        });
        return Promise.all(jobsUpdatePO)
    }

    _beforeUpdate(purchaseOrderExternal) {
        return this.getSingleById(purchaseOrderExternal._id)
            .then((oldPurchaseOrderExternal) => {
                var oldItems = [];
                var newItems = [];
                var jobs = [];
                for (var oldItem of oldPurchaseOrderExternal.items) {
                    var _itemIndex = purchaseOrderExternal.items.find((item) => item.poId.toString() === oldItem.poId.toString() && item.product._id.toString() === oldItem.product._id.toString());
                    if (!_itemIndex) {
                        oldItems.push(oldItem);
                    }
                }

                for (var newItem of purchaseOrderExternal.items) {
                    var _itemIndex = oldPurchaseOrderExternal.items.find((item) => item.poId.toString() === newItem.poId.toString() && item.product._id.toString() === newItem.product._id.toString());
                    if (!_itemIndex) {
                        newItems.push(newItem);
                    }
                }

                if (oldItems.length > 0) {
                    jobs.push(this._deleteOldPO(oldItems));
                }
                if (newItems.length > 0) {
                    jobs.push(this._insertNewPO(newItems));
                }
                if (jobs.length == 0) {
                    jobs.push(Promise.resolve(null));
                }
                return Promise.all(jobs);
            })
            .then((result) => {
                return Promise.resolve(purchaseOrderExternal);
            })
    }

    _deleteOldPO(oldItems) {
        var _poIds = oldItems.map((item) => {
            return item.poId.toString()
        });
        _poIds = [].concat.apply([], _poIds);

        var _listPoIds = _poIds.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        var getPurchaseOrderIds = _listPoIds.map((poId) => this.purchaseOrderManager.getSingleByIdOrDefault(poId));

        return Promise.all(getPurchaseOrderIds)
            .then((purchaseOrders) => {
                var jobsUpdatePO = purchaseOrders.map((purchaseOrder) => {
                    for (var oldItem of oldItems) {
                        if (purchaseOrder._id.toString() === oldItem.poId.toString()) {
                            var poItem = purchaseOrder.items.find((poItem) => oldItem.product._id.toString() === poItem.product._id.toString());
                            if (poItem) {
                                poItem.pricePerDealUnit = 0;
                                poItem.priceBeforeTax = 0;
                                poItem.dealQuantity = 0;
                                poItem.dealUom = new uom();
                                poItem.conversion = 1;
                                poItem.isClosed = false;
                                poItem.status = poStatusEnum.CREATED;
                            }
                        }
                    }
                    purchaseOrder.status = purchaseOrder.items.find((item) => item.status.value === Math.max.apply(Math, purchaseOrder.items.map(function (item) { return item.status.value; }))).status
                    purchaseOrder.isClosed = purchaseOrder.items
                        .map((item) => item.isClosed)
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
                return Promise.all(jobsUpdatePO)
            })
    }

    _insertNewPO(newItems) {
        var _poIds = newItems.map((item) => {
            return item.poId.toString()
        });
        _poIds = [].concat.apply([], _poIds);

        var _listPoIds = _poIds.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        var getPurchaseOrderIds = _listPoIds.map((poId) => this.purchaseOrderManager.getSingleByIdOrDefault(poId));

        return Promise.all(getPurchaseOrderIds)
            .then((purchaseOrders) => {
                var jobsUpdatePO = purchaseOrders.map((purchaseOrder) => {
                    for (var newItem of newItems) {
                        if (purchaseOrder._id.toString() === newItem.poId.toString()) {
                            var poItem = purchaseOrder.items.find((poItem) => poItem.product._id.toString() === newItem.product._id.toString());
                            if (poItem) {
                                poItem.pricePerDealUnit = Number(newItem.pricePerDealUnit);
                                poItem.priceBeforeTax = Number(newItem.priceBeforeTax);
                                poItem.dealQuantity = Number(newItem.dealQuantity);
                                poItem.dealUom = newItem.dealUom;
                                poItem.conversion = Number(newItem.conversion);
                                poItem.isClosed = true;
                                poItem.status = poStatusEnum.PROCESSING;
                            }
                        }
                    }
                    purchaseOrder.status = purchaseOrder.items.find((item) => item.status.value === Math.max.apply(Math, purchaseOrder.items.map(function (item) { return item.status.value; }))).status
                    purchaseOrder.isClosed = purchaseOrder.items
                        .map((item) => item.isClosed)
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                });
                return Promise.all(jobsUpdatePO)
            })
    }

    delete(poExternal) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._validate(poExternal)
                    .then((purchaseOrderExternal) => {
                        purchaseOrderExternal._deleted = true;
                        return this.collection
                            .updateOne({
                                _id: purchaseOrderExternal._id
                            }, {
                                $set: purchaseOrderExternal
                            })
                    })
                    .then((poExId) => {
                        var query = {
                            _id: ObjectId.isValid(poExternal._id) ? new ObjectId(poExternal._id) : {}
                        };
                        return this.getSingleByQuery(query);
                    })
                    .then((purchaseOrderExternal) => {
                        var _poIds = purchaseOrderExternal.items.map((item) => {
                            return item.poId.toString()
                        });
                        _poIds = [].concat.apply([], _poIds);

                        var _listPoIds = _poIds.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })

                        var jobsGetPO = _listPoIds.map((poId) => {
                            return this.purchaseOrderManager.getSingleByIdOrDefault(poId)
                        });
                        return Promise.all(jobsGetPO)
                            .then((listPurchaseOrders) => {
                                var jobsUpdatePO = listPurchaseOrders.map((purchaseOrder) => {
                                    for (var item of purchaseOrderExternal.items) {
                                        if (purchaseOrder._id.toString() === item.poId.toString()) {
                                            var poItem = purchaseOrder.items.find((poItem) => item.product._id.toString() === poItem.product._id.toString());
                                            if (poItem) {
                                                poItem.pricePerDealUnit = 0;
                                                poItem.priceBeforeTax = 0;
                                                poItem.dealQuantity = 0;
                                                poItem.dealUom = new uom();
                                                poItem.conversion = 1;
                                                poItem.isClosed = false;
                                                poItem.status = poStatusEnum.CREATED;
                                            }
                                        }
                                    }
                                    purchaseOrder.status = purchaseOrder.items.find((item) => item.status.value === Math.max.apply(Math, purchaseOrder.items.map(function (item) { return item.status.value; }))).status
                                    purchaseOrder.isClosed = purchaseOrder.items
                                        .map((item) => item.isClosed)
                                        .reduce((prev, curr, index) => {
                                            return prev && curr
                                        }, true);
                                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                                })
                                return Promise.all(jobsUpdatePO)
                                    .then((result) => Promise.resolve(purchaseOrderExternal._id));
                            })
                    })
            });
    }

    post(listPurchaseOrderExternal) {
        var getPOExternalById = listPurchaseOrderExternal.map((purchaseOrderExternal) => this.getSingleByIdOrDefault(purchaseOrderExternal._id));
        return Promise.all(getPOExternalById)
            .then((purchaseOrderExternals) => {
                var jobs = purchaseOrderExternals.map((_purchaseOrderExternal) => {
                    return this._validate(_purchaseOrderExternal)
                        .then((purchaseOrderExternal) => {
                            purchaseOrderExternal.isPosted = true;
                            purchaseOrderExternal.status = poStatusEnum.ORDERED;
                            return this.update(purchaseOrderExternal);
                        })
                        .then((poExId) => {
                            return this.getSingleByIdOrDefault(poExId);
                        })
                        .then((purchaseOrderExternal) => {
                            var _poIds = purchaseOrderExternal.items.map((item) => {
                                return item.poId.toString()
                            });
                            _poIds = [].concat.apply([], _poIds);
                            var _listPoIds = _poIds.filter(function (elem, index, self) {
                                return index == self.indexOf(elem);
                            })


                            var _prIds = purchaseOrderExternal.items.map((item) => {
                                return item.prId.toString()
                            });
                            _prIds = [].concat.apply([], _prIds);
                            var _listPrIds = _prIds.filter(function (elem, index, self) {
                                return index == self.indexOf(elem);
                            })
                            var getPurchaseOrderIds = _listPoIds.map((poId) => this.purchaseOrderManager.getSingleByIdOrDefault(poId));
                            var getPurchaseRequestIds = _listPrIds.map((prId) => this.purchaseRequestManager.getSingleByIdOrDefault(prId));

                            return Promise.all(getPurchaseRequestIds)
                                .then((purchaseRequests) => {
                                    var jobsUpdatePR = purchaseRequests.map((purchaseRequest) => {
                                        purchaseRequest.status = prStatusEnum.ORDERED;
                                        return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                                    })
                                    return Promise.all(jobsUpdatePR);
                                })
                                .then((purchaseRequests) => {
                                    return Promise.all(getPurchaseOrderIds)
                                        .then((purchaseOrders) => {
                                            var jobsUpdatePO = purchaseOrders.map((purchaseOrder) => {
                                                for (var item of purchaseOrderExternal.items) {
                                                    if (item.poId.toString() === purchaseOrder._id.toString()) {
                                                        var poItem = purchaseOrder.items.find((poItem) => item.product._id.toString() === poItem.product._id.toString());
                                                        if (poItem) {
                                                            poItem.purchaseOrderExternalId = new ObjectId(purchaseOrderExternal._id);
                                                            poItem.purchaseOrderExternal = purchaseOrderExternal;
                                                            poItem.supplierId = new ObjectId(purchaseOrderExternal.supplierId);
                                                            poItem.supplier = purchaseOrderExternal.supplier;
                                                            poItem.freightCostBy = purchaseOrderExternal.freightCostBy;
                                                            poItem.paymentMethod = purchaseOrderExternal.paymentMethod;
                                                            poItem.paymentDueDays = purchaseOrderExternal.paymentDueDays;
                                                            poItem.vat = purchaseOrderExternal.vat;
                                                            poItem.useVat = purchaseOrderExternal.useVat;
                                                            poItem.vatRate = purchaseOrderExternal.vatRate;
                                                            poItem.useIncomeTax = purchaseOrderExternal.useIncomeTax;
                                                            poItem.dealQuantity = Number(item.dealQuantity);
                                                            poItem.dealUom = item.dealUom;
                                                            poItem.priceBeforeTax = Number(item.priceBeforeTax);
                                                            poItem.pricePerDealUnit = item.useIncomeTax ? (100 * item.priceBeforeTax) / 110 : item.priceBeforeTax;
                                                            poItem.conversion = Number(item.conversion)
                                                            poItem.currency = purchaseOrderExternal.currency;
                                                            poItem.currencyRate = Number(purchaseOrderExternal.currencyRate);
                                                            poItem.isPosted = true
                                                            poItem.status = poStatusEnum.ORDERED;
                                                        }
                                                    }
                                                }

                                                purchaseOrder.status = purchaseOrder.items.find((item) => item.status.value === Math.max.apply(Math, purchaseOrder.items.map(function (item) { return item.status.value; }))).status
                                                purchaseOrder.isPosted = purchaseOrder.items
                                                    .map((item) => item.isPosted)
                                                    .reduce((prev, curr, index) => {
                                                        return prev && curr
                                                    }, true);
                                                return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder)
                                            })
                                            return Promise.all(jobsUpdatePO)
                                        })
                                })
                                .then((result) => Promise.resolve(purchaseOrderExternal._id));
                        })
                })
                return Promise.all(jobs)
            })
            .then((purchaseOrderExternalIds) => {
                return Promise.resolve(purchaseOrderExternalIds);
            });
    }

    pdf(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleByIdOrDefault(id)
                .then(pox => {
                    var getDefinition = require('../../pdf/definitions/garment-purchase-order-external');
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

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrderExternal}_date`,
            key: {
                date: -1
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
                    .then((purchaseOrderExternal) => {
                        purchaseOrderExternal.isPosted = false;
                        purchaseOrderExternal.status = poStatusEnum.CREATED;
                        return this.update(purchaseOrderExternal);
                    })
                    .then((poExId) => {
                        return this.getSingleByIdOrDefault(poExId);
                    })

                    .then((purchaseOrderExternal) => {
                        var _poIds = purchaseOrderExternal.items.map((item) => {
                            return item.poId.toString()
                        });
                        _poIds = [].concat.apply([], _poIds);
                        var _listPoIds = _poIds.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })


                        var _prIds = purchaseOrderExternal.items.map((item) => {
                            return item.prId.toString()
                        });
                        _prIds = [].concat.apply([], _prIds);
                        var _listPrIds = _prIds.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })
                        var getPurchaseOrderIds = _listPoIds.map((poId) => this.purchaseOrderManager.getSingleByIdOrDefault(poId));
                        var getPurchaseRequestIds = _listPrIds.map((prId) => this.purchaseRequestManager.getSingleByIdOrDefault(prId));

                        return Promise.all(getPurchaseRequestIds)
                            .then((purchaseRequests) => {
                                var jobsUpdatePR = purchaseRequests.map((purchaseRequest) => {
                                    purchaseRequest.status = prStatusEnum.PROCESSING;
                                    return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                                })
                                return Promise.all(jobsUpdatePR);
                            })
                            .then((purchaseRequests) => {
                                return Promise.all(getPurchaseOrderIds)
                                    .then((purchaseOrders) => {
                                        var jobsUpdatePO = purchaseOrders.map((purchaseOrder) => {
                                            for (var item of purchaseOrderExternal.items) {
                                                if (item.poId.toString() === purchaseOrder._id.toString()) {
                                                    var poItem = purchaseOrder.items.find((poItem) => item.product._id.toString() === poItem.product._id.toString());
                                                    if (poItem) {
                                                        poItem.purchaseOrderExternalId = {};
                                                        poItem.purchaseOrderExternal = {};
                                                        poItem.supplierId = {};
                                                        poItem.supplier = {};
                                                        poItem.freightCostBy = "";
                                                        poItem.paymentMethod = "";
                                                        poItem.paymentDueDays = 0;
                                                        poItem.vat = {};
                                                        poItem.useVat = false;
                                                        poItem.vatRate = 1;
                                                        poItem.useIncomeTax = false;
                                                        poItem.currency = {};
                                                        poItem.currencyRate = 1;
                                                        poItem.isPosted = false;
                                                        poItem.status = poStatusEnum.PROCESSING;
                                                    }
                                                }
                                            }
                                            purchaseOrder.status = purchaseOrder.items.find((item) => item.status.value === Math.max.apply(Math, purchaseOrder.items.map(function (item) { return item.status.value; }))).status
                                            purchaseOrder.isPosted = purchaseOrder.items
                                                .map((item) => item.isPosted)
                                                .reduce((prev, curr, index) => {
                                                    return prev && curr
                                                }, true);
                                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder)
                                        })
                                        return Promise.all(jobsUpdatePO)
                                    })
                            })
                            .then((result) => Promise.resolve(purchaseOrderExternal._id));
                    })
            });
    }

    validateCancelAndUnpost(purchaseOrderExternal) {
        var error = {};
        var valid = purchaseOrderExternal;
        var poId = valid.items.map((item) => { return item.poId })
        poId = poId.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        var getPOInternal = [];
        for (var po of poId) {
            if (ObjectId.isValid(po)) {
                getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(po, this.purchaseOrderFields));
            }
        }
        return Promise.all([this.getSingleByIdOrDefault(valid._id)].concat(getPOInternal))
            .then((results) => {
                var poe = results[0];
                var _poInternals = results.slice(1, results.length);
                if (!poe.isPosted)
                    error["no"] = i18n.__("PurchaseOrderExternal.isPosted:%s is not yet being posted", i18n.__("PurchaseOrderExternal.isPosted._:Posted"));

                if (valid.items && valid.items.length > 0) {
                    var itemErrors = [];
                    for (var item of valid.items) {
                        var itemError = {};
                        var purchaseOrder = _poInternals.find((poInternal) => poInternal._id.toString() === item.poId.toString())
                        var poItem = {}
                        if (purchaseOrder) {
                            poItem = purchaseOrder.items.find((poItem) => poItem.product._id.toString() === item.product._id.toString())
                        }
                        if (poItem) {
                            if (poItem.fulfillments && poItem.fulfillments.length > 0) {
                                itemError["no"] = i18n.__("PurchaseOrderExternal.items.items.no:%s is already have delivery order", i18n.__("PurchaseOrderExternal.items,items.no._:No"));
                            }
                        }
                        itemErrors.push(itemError);
                    }

                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            error.items = itemErrors;
                            break;
                        }
                    }
                }

                if (Object.getOwnPropertyNames(error).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data podl does not pass validation', error));
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
                    .then((purchaseOrderExternal) => {
                        purchaseOrderExternal.status = poStatusEnum.VOID;
                        return this.update(purchaseOrderExternal);
                    })
                    .then((poExId) => {
                        return this.getSingleByIdOrDefault(poExId);
                    })
                    .then((purchaseOrderExternal) => {
                        var _poIds = purchaseOrderExternal.items.map((item) => {
                            return item.poId.toString()
                        });
                        _poIds = [].concat.apply([], _poIds);
                        var _listPoIds = _poIds.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })


                        var _prIds = purchaseOrderExternal.items.map((item) => {
                            return item.prId.toString()
                        });
                        _prIds = [].concat.apply([], _prIds);
                        var _listPrIds = _prIds.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })
                        var getPurchaseOrderIds = _listPoIds.map((poId) => this.purchaseOrderManager.getSingleByIdOrDefault(poId));
                        var getPurchaseRequestIds = _listPrIds.map((prId) => this.purchaseRequestManager.getSingleByIdOrDefault(prId));

                        return Promise.all(getPurchaseRequestIds)
                            .then((purchaseRequests) => {
                                var jobsUpdatePR = purchaseRequests.map((purchaseRequest) => {
                                    purchaseRequest.status = prStatusEnum.VOID;
                                    return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                                })
                                return Promise.all(jobsUpdatePR);
                            })
                            .then((purchaseRequests) => {
                                return Promise.all(getPurchaseOrderIds)
                                    .then((purchaseOrders) => {
                                        var jobsUpdatePO = purchaseOrders.map((purchaseOrder) => {
                                            for (var item of purchaseOrderExternal.items) {
                                                if (item.poId.toString() === purchaseOrder._id.toString()) {
                                                    var poItem = purchaseOrder.items.find((poItem) => item.product._id.toString() === poItem.product._id.toString());
                                                    if (poItem) {
                                                        poItem.status = poStatusEnum.VOID;
                                                    }
                                                }
                                            }
                                            purchaseOrder.status = purchaseOrder.items.find((item) => item.status.value === Math.max.apply(Math, purchaseOrder.items.map(function (item) { return item.status.value; }))).status
                                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder)
                                        })
                                        return Promise.all(jobsUpdatePO)
                                    })
                            })
                            .then((result) => Promise.resolve(purchaseOrderExternal._id));
                    })
            });
    }

    close(poExternalId) {
        return this.getSingleByIdOrDefault(poExternalId)
            .then((poExternal) => {
                return this.validateClose(poExternal)
                    .then((purchaseOrderExternal) => {
                        purchaseOrderExternal.items.map((item) => item.isClosed = true);
                        purchaseOrderExternal.isClosed = true;
                        return this.update(purchaseOrderExternal);
                    })
                    .then((poExId) => Promise.resolve(poExId));
            })
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

    /*getAllData(filter) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
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

                    this.collection.where(query).select(_select).execute()
                        .then((results) => {
                            resolve(results.data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }*/

    /*getDurationPRtoPOEksternalData(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                _deleted: false
            };
            var postedQuery = {
                isPosted: true
            };
            var closedQuery = {
                isClosed: false
            };
            var date = {
                "items.purchaseRequest._createdDate": {
                    "$gte": (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte": (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                }
            };
            var offset = query.offset;
            var unitQuery = {};
            if (query.unitId && query.unitId != "") {
                unitQuery = {
                    "items.purchaseRequest.unit._id": new ObjectId(query.unitId)
                }
            }
            var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [
                            { "$add": ["$_createdDate", 60 * 60 * 1000 * offset] },
                            {
                                "$add": [
                                    { "$millisecond": "$_createdDate" },
                                    {
                                        "$multiply": [
                                            { "$second": "$_createdDate" },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": "$_createdDate" },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": ["$_createdDate", 60 * offset * 60 * 1000] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }
                        ]
                    }, {
                        $subtract: [
                            { "$add": ["$items.purchaseRequest._createdDate", 60 * offset * 60 * 1000] },
                            {
                                "$add": [
                                    { "$millisecond": "$items.purchaseRequest._createdDate" },
                                    {
                                        "$multiply": [
                                            { "$second": "$items.purchaseRequest._createdDate" },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": "$items.purchaseRequest._createdDate" },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": ["$items.purchaseRequest._createdDate", 60 * offset * 60 * 1000] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }]
                    }]
                }, 86400000]
            };
            var durationQuery = {};
            if (query.duration === "8-14 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gt: [dates, 7] },
                                { $lte: [dates, 14] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "15-30 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gt: [dates, 14] },
                                { $lte: [dates, 30] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "> 30 hari") {
                durationQuery = {
                    $cond: {
                        if: { $gt: [dates, 30] },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }


            var Query = { "$and": [date, deletedQuery, unitQuery] };
            this.collection.aggregate([
                { $unwind: "$items" },
                { $unwind: "$items.items" },
                { $match: Query },
                { $redact: durationQuery },
                {
                    $project: {
                        "items.purchaseRequest.date": 1,
                        "prDate": "$items.purchaseRequest.date",
                        "prCreatedDate": "$items.purchaseRequest._createdDate",
                        "prNo": "$items.purchaseRequest.no",
                        "division": "$items.purchaseRequest.unit.division.name",
                        "unit": "$items.purchaseRequest.unit.name",
                        "budget": "$items.purchaseRequest.budget.name",
                        "category": "$items.category.name",
                        "productCode": "$items.items.product.code",
                        "productName": "$items.items.product.name",
                        "productQuantity": "$items.items.dealQuantity",
                        "productUom": "$items.items.dealUom.unit",
                        "productPrice": "$items.items.pricePerDealUnit",
                        "supplierCode": "$supplier.code",
                        "supplierName": "$supplier.name",
                        "poDate": "$items._createdDate",
                        "poEksDate": "$date",
                        "poEksCreatedDate": "$_createdDate",
                        "expectedDate": "$expectedDeliveryDate",
                        "poEksNo": "$no",
                        "dateDiff": dates,
                        "staff": "$_createdBy"
                    }
                },
                { $sort: { "items.purchaseRequest.date": -1 } }
            ])
                .toArray().then(report => {
                    var index = 0;
                    for (var x of report) {
                        index++;
                        x.index = index;
                    }
                    report.data = report.slice(parseInt(query.size) * (parseInt(query.page) - 1), parseInt(query.size) + (parseInt(query.size) * (parseInt(query.page) - 1)));
                    report.info = {
                        total: report.length,
                        size: query.size,
                        count: query.size,
                        page: query.page
                    }
                    resolve(report);
                });
        });
    }*/

    /*getXlsDurationPRtoPOEksternalData(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var offset = query.offset;

        for (var report of result.info) {
            index++;
            var dateDiff = Math.ceil(report.dateDiff);
            var item = {};
            item["No"] = index;
            item["Tanggal Purchase Request"] = moment(new Date(report.prDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Buat Purchase Request"] = moment(new Date(report.prCreatedDate)).add(7, 'h').format(dateFormat);
            item["No Purchase Request"] = report.prNo;
            item["Divisi"] = report.division;
            item["Unit"] = report.unit;
            item["Budget"] = report.budget;
            item["Kategori"] = report.category;
            item["Kode Barang"] = report.productCode;
            item["Nama Barang"] = report.productName;
            item["Jumlah Barang"] = report.productQuantity;
            item["Satuan Barang"] = report.productUom;
            item["Harga Barang"] = report.productPrice;
            item["Kode Supplier"] = report.supplierCode;
            item["Nama Supplier"] = report.supplierName;
            item["Tanggal Terima PO Internal"] = moment(new Date(report.poDate)).add(7, 'h').format(dateFormat);
            item["Tanggal PO Eksternal"] = moment(new Date(report.poEksDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Buat PO Eksternal"] = moment(new Date(report.poEksCreatedDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Target Datang"] = moment(new Date(report.expectedDate)).add(7, 'h').format(dateFormat);
            item["No PO Eksternal"] = report.poEksNo;
            item["Selisih Tanggal PR - PO Eksternal (hari)"] = dateDiff;
            item["Nama Staff Pembelian"] = report.staff;


            xls.data.push(item);
        }

        xls.options = {
            "No": "number",
            "Tanggal Purchase Request": "string",
            "No Purchase Request": "string",
            "Divisi": "string",
            "Unit": "string",
            "Budget": "string",
            "Kategori": "string",
            "Kode Barang": "string",
            "Nama Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Harga Barang": "number",
            "Kode Supplier": "string",
            "Nama Supplier": "string",
            "Tanggal Terima PO Internal": "string",
            "Tanggal PO Eksternal": "string",
            "Tanggal Target Datang": "string",
            "No PO Eksternal": "string",
            "Selisih Tanggal PR - PO Eksternal (hari)": "number",
            "Nama Staff Pembelian": "string"

        };

        if (query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PR - PO EKSTERNAL ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PR - PO EKSTERNAL ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `LAPORAN DURASI PR - PO EKSTERNAL ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `LAPORAN DURASI PR - PO EKSTERNAL.xlsx`;

        return Promise.resolve(xls);
    }*/

    /*getDurationPOData(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                _deleted: false
            };
            var postedQuery = {
                isPosted: true
            };
            var closedQuery = {
                isClosed: false
            };
            var date = {
                "items._createdDate": {
                    "$gte": (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte": (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                }
            };
            var offset = query.offset;
            var unitQuery = {};
            if (query.unitId && query.unitId != "") {
                unitQuery = {
                    "items.purchaseRequest.unit._id": new ObjectId(query.unitId)
                }
            }
            var dates = {
                $divide: [{
                    $subtract: [{
                        $subtract: [{ "$add": ["$_createdDate", 60 * offset * 60 * 1000] },
                        {
                            "$add": [
                                { "$millisecond": "$_createdDate" },
                                {
                                    "$multiply": [
                                        { "$second": "$_createdDate" },
                                        1000
                                    ]
                                },
                                {
                                    "$multiply": [
                                        { "$minute": "$_createdDate" },
                                        60, 1000
                                    ]
                                },
                                {
                                    "$multiply": [
                                        { "$hour": { "$add": ["$_createdDate", 60 * offset * 60 * 1000] } },
                                        60, 60, 1000
                                    ]
                                }
                            ]
                        }
                        ]
                    }, {
                        $subtract: [
                            { "$add": ["$items._createdDate", 60 * offset * 60 * 1000] },
                            {
                                "$add": [
                                    { "$millisecond": "$items._createdDate" },
                                    {
                                        "$multiply": [
                                            { "$second": "$items._createdDate" },
                                            1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$minute": "$items._createdDate" },
                                            60, 1000
                                        ]
                                    },
                                    {
                                        "$multiply": [
                                            { "$hour": { "$add": ["$items._createdDate", 60 * offset * 60 * 1000] } },
                                            60, 60, 1000
                                        ]
                                    }
                                ]
                            }]
                    }]
                }, 86400000]
            };
            var durationQuery = {};
            if (query.duration === "8-14 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gte: [dates, 8] },
                                { $lte: [dates, 14] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "15-30 hari") {
                durationQuery = {
                    $cond: {
                        if: {
                            "$and": [
                                { $gt: [dates, 14] },
                                { $lte: [dates, 30] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }
            else if (query.duration === "> 30 hari") {
                durationQuery = {
                    $cond: {
                        if: { $gt: [dates, 30] },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            }


            var Query = { "$and": [date, deletedQuery, unitQuery] };
            this.collection.aggregate([
                { $unwind: "$items" },
                { $unwind: "$items.items" },
                { $match: Query },
                { $redact: durationQuery },
                {
                    $project: {
                        "items._createdDate": 1,
                        "prDate": "$items.purchaseRequest.date",
                        "prCreatedDate": "$items.purchaseRequest._createdDate",
                        "prNo": "$items.purchaseRequest.no",
                        "division": "$items.purchaseRequest.unit.division.name",
                        "unit": "$items.purchaseRequest.unit.name",
                        "budget": "$items.purchaseRequest.budget.name",
                        "category": "$items.category.name",
                        "productCode": "$items.items.product.code",
                        "productName": "$items.items.product.name",
                        "productQuantity": "$items.items.dealQuantity",
                        "productUom": "$items.items.dealUom.unit",
                        "productPrice": "$items.items.pricePerDealUnit",
                        "supplierCode": "$supplier.code",
                        "supplierName": "$supplier.name",
                        "poDate": "$items._createdDate",
                        "poEksDate": "$date",
                        "poEksCreatedDate": "$_createdDate",
                        "expectedDate": "$expectedDeliveryDate",
                        "poEksNo": "$no",
                        "dateDiff": dates,
                        "staff": "$_createdBy"
                    }
                },
                { $sort: { "items._createdDate": -1 } }
            ])
                .toArray().then(report => {
                    var index = 0;
                    for (var x of report) {
                        index++;
                        x.index = index;
                    }
                    report.data = report.slice(parseInt(query.size) * (parseInt(query.page) - 1), parseInt(query.size) + (parseInt(query.size) * (parseInt(query.page) - 1)));
                    report.info = {
                        total: report.length,
                        size: query.size,
                        count: query.size,
                        page: query.page
                    }
                    resolve(report);
                });
        });
    }*/

    /*getXlsDurationPOData(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";
        var offset = query.offset;
        for (var report of result.info) {
            var dateDiff = Math.ceil(report.dateDiff);
            index++;
            var item = {};
            item["No"] = index;
            item["Tanggal Purchase Request"] = moment(new Date(report.prDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Buat Purchase Request"] = moment(new Date(report.prCreatedDate)).add(7, 'h').format(dateFormat);
            item["No Purchase Request"] = report.prNo;
            item["Divisi"] = report.division;
            item["Unit"] = report.unit;
            item["Budget"] = report.budget;
            item["Kategori"] = report.category;
            item["Kode Barang"] = report.productCode;
            item["Nama Barang"] = report.productName;
            item["Jumlah Barang"] = report.productQuantity;
            item["Satuan Barang"] = report.productUom;
            item["Harga Barang"] = report.productPrice;
            item["Kode Supplier"] = report.supplierCode;
            item["Nama Supplier"] = report.supplierName;
            item["Tanggal Terima PO Internal"] = moment(new Date(report.poDate)).add(7, 'h').format(dateFormat);
            item["Tanggal PO Eksternal"] = moment(new Date(report.poEksDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Buat PO Eksternal"] = moment(new Date(report.poEksCreatedDate)).add(7, 'h').format(dateFormat);
            item["Tanggal Target Datang"] = moment(new Date(report.expectedDate)).add(7, 'h').format(dateFormat);
            item["No PO Eksternal"] = report.poEksNo;
            item["Selisih Tanggal PO Internal - PO Eksternal (hari)"] = dateDiff;
            item["Nama Staff Pembelian"] = report.staff;


            xls.data.push(item);
        }

        xls.options = {
            "No": "number",
            "Tanggal Purchase Request": "string",
            "Tanggal Buat Purchase Request": "string",
            "No Purchase Request": "string",
            "Divisi": "string",
            "Unit": "string",
            "Budget": "string",
            "Kategori": "string",
            "Kode Barang": "string",
            "Nama Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Harga Barang": "number",
            "Kode Supplier": "string",
            "Nama Supplier": "string",
            "Tanggal Terima PO Internal": "string",
            "Tanggal PO Eksternal": "string",
            "Tanggal Buat PO Eksternal": "string",
            "Tanggal Target Datang": "string",
            "No PO Eksternal": "string",
            "Selisih Tanggal PO Internal - PO Eksternal (hari)": "number",
            "Nama Staff Pembelian": "string"

        };

        if (query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PO INTERNAL - PO EKSTERNAL ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `LAPORAN DURASI PO INTERNAL - PO EKSTERNAL ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `LAPORAN DURASI PO INTERNAL - PO EKSTERNAL ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `LAPORAN DURASI PO INTERNAL - PO EKSTERNAL.xlsx`;

        return Promise.resolve(xls);
    }*/
};