'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;

// internal deps
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var PurchaseOrderExternal = DLModels.purchasing.PurchaseOrderExternal;
var PurchaseOrder = DLModels.purchasing.PurchaseOrder;
var uom = DLModels.master.Uom;
var PurchaseOrderManager = require('./purchase-order-manager');
var PurchaseRequestManager = require('./purchase-request-manager');
var CurrencyManager = require('../master/currency-manager');
var VatManager = require('../master/vat-manager');
var SupplierManager = require('../master/supplier-manager');
var ProductManager = require("../master/product-manager");
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var i18n = require('dl-i18n');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;
var moment = require('moment');

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
        this.productManager = new ProductManager(db, user);
        this.documentNumbers = this.db.collection("document-numbers");
        this.purchaseOrderFields = [
            "_id",
            "no",
            "refNo",
            "_createdDate",
            "_createdBy",
            "purchaseRequestId",
            "purchaseRequest._id",
            "purchaseRequest.no",
            "purchaseRequest._createdDate",
            "purchaseRequest._createdBy",
            "purchaseOrderExternalId",
            "purchaseOrderExternal._id",
            "purchaseOrderExternal.no",
            "purchaseOrderExternal._createdDate",
            "purchaseOrderExternal._createdBy",
            "supplierId",
            "supplier.code",
            "supplier.name",
            "supplier.address",
            "supplier.contact",
            "supplier.PIC",
            "supplier.import",
            "supplier.NPWP",
            "supplier.serialNumber",
            "unitId",
            "unit.code",
            "unit.divisionId",
            "unit.division",
            "unit.name",
            "categoryId",
            "category.code",
            "category.name",
            "freightCostBy",
            "currency.code",
            "currency.symbol",
            "currency.rate",
            "currencyRate",
            "paymentMethod",
            "paymentDueDays",
            "vat",
            "useVat",
            "vatRate",
            "useIncomeTax",
            "date",
            "expectedDeliveryDate",
            "actualDeliveryDate",
            "isPosted",
            "isClosed",
            "remark",
            "status",
            "items"
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

    _beforeInsert(purchaseOrderExternal) {
        var monthNow = moment(purchaseOrderExternal.date).format("MM");
        var yearNow = parseInt(moment(purchaseOrderExternal.date).format("YY"));
        var type = "PE"+monthNow+yearNow;
        var query = { "type": type, "description": "PE" };
        var fields = { "number": 1, "year": 1 };

        return this.documentNumbers
            .findOne(query, fields)
            .then((previousDocumentNumber) => {

                var number = 1;

                if (!purchaseOrderExternal.no) {
                    if (previousDocumentNumber) {
                        var oldYear = previousDocumentNumber.year;
                        number = yearNow > oldYear ? number : previousDocumentNumber.number + 1;

                        purchaseOrderExternal.no = `PE-${yearNow}-${monthNow}-${this.pad(number, 5)}`;
                    } else {
                        purchaseOrderExternal.no = `PE-${yearNow}-${monthNow}-00001`;
                    }
                }

                var documentNumbersData = {
                    type: type,
                    documentNumber: purchaseOrderExternal.no,
                    number: number,
                    year: yearNow,
                    description: "PE"
                };

                var options = { "upsert": true };

                return this.documentNumbers
                    .updateOne(query, documentNumbersData, options)
                    .then((id) => {
                        purchaseOrderExternal.status = poStatusEnum.CREATED;
                        return Promise.resolve(purchaseOrderExternal)
                    })
            })
    }

    pad(number, length) {

        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }

        return str;
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((purchaseOrderExternal) => {
                var jobsUpdatePO = purchaseOrderExternal.items.map((poeItem) => {
                    return this.purchaseOrderManager.getSingleByIdOrDefault(poeItem._id)
                        .then((purchaseOrder) => {
                            purchaseOrder.isPosted = true;
                            purchaseOrder.status = poStatusEnum.PROCESSING;
                            for (var item of poeItem.items) {
                                var poItem = purchaseOrder.items.find((_poItem) => _poItem.product._id.toString() === item.product._id.toString());
                                if (poItem) {
                                    poItem.priceBeforeTax = item.priceBeforeTax;
                                    poItem.dealQuantity = item.dealQuantity;
                                    poItem.dealUom = item.dealUom;
                                    poItem.conversion = item.conversion;
                                }
                            }
                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                        })
                })
                return Promise.all(jobsUpdatePO)
                    .then((purchaseOrders) => {
                        for (var purchaseOrder of purchaseOrders) {
                            var item = purchaseOrderExternal.items.find(item => item._id.toString() === purchaseOrder._id.toString());
                            var index = purchaseOrderExternal.items.indexOf(item);
                            purchaseOrderExternal.items.splice(index, 1, purchaseOrder);
                        }
                        return this.collection
                            .updateOne({
                                _id: purchaseOrderExternal._id
                            }, {
                                $set: purchaseOrderExternal
                            })
                            .then((result) => Promise.resolve(purchaseOrderExternal._id));
                    });
            });
    }

    _beforeUpdate(purchaseOrderExternal) {
        return this.getSingleById(purchaseOrderExternal._id)
            .then((oldPurchaseOrderExternal) => {
                var oldItems = [];
                var newItems = [];
                var jobs = [];
                for (var oldItem of oldPurchaseOrderExternal.items) {
                    var _item = purchaseOrderExternal.items.find(item => item._id.toString() === oldItem._id.toString());
                    if (!_item) {
                        oldItems.push(oldItem);
                    }
                }

                for (var newItem of purchaseOrderExternal.items) {
                    var _item = oldPurchaseOrderExternal.items.find(item => item._id.toString() === newItem._id.toString());
                    if (!_item) {
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
        var getPurchaseOrderIds = oldItems.map((purchaseOrder) => this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrder._id));
        var getPurchaseRequestIds = oldItems.map((purchaseOrder) => this.purchaseRequestManager.getSingleByIdOrDefault(purchaseOrder.purchaseRequest._id));
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
                            var _purchaseRequest = purchaseRequests.find((purchaseRequest) => purchaseRequest._id.toString() === purchaseOrder.purchaseRequest._id.toString());
                            if (_purchaseRequest) {
                                purchaseOrder.purchaseRequest = _purchaseRequest;
                            }
                            purchaseOrder.isPosted = false;
                            purchaseOrder.status = poStatusEnum.CREATED;
                            for (var poItem of purchaseOrder.items) {
                                poItem.priceBeforeTax = 0;
                                poItem.dealQuantity = 0;
                                poItem.dealUom = new uom();
                                poItem.conversion = 1;
                            }
                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                        })
                        return Promise.all(jobsUpdatePO)
                    })
            })
    }

    _insertNewPO(newItems) {
        var getPurchaseOrderIds = newItems.map((purchaseOrder) => this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrder._id));
        return Promise.all(getPurchaseOrderIds)
            .then((purchaseOrders) => {
                var jobsUpdatePO = purchaseOrders.map((purchaseOrder) => {
                    purchaseOrder.isPosted = true;
                    purchaseOrder.status = poStatusEnum.PROCESSING;
                    var poeItem = newItems.find((po) => po._id.toString() === purchaseOrder._id.toString());
                    if (poeItem) {
                        for (var item of poeItem.items) {
                            var poItem = purchaseOrder.items.find((_poItem) => _poItem.product._id.toString() === item.product._id.toString());
                            if (poItem) {
                                poItem.priceBeforeTax = item.priceBeforeTax;
                                poItem.dealQuantity = item.dealQuantity;
                                poItem.dealUom = item.dealUom;
                                poItem.conversion = item.conversion;
                            }
                        }
                        return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                    } else {
                        return Promise.resolve(null);
                    }
                })
                return Promise.all(jobsUpdatePO)
            })
    }

    delete(poExternal) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return this._validate(poExternal)
                    .then((purchaseOrderExternal) => {
                        purchaseOrderExternal._deleted = true;
                        return this.update(purchaseOrderExternal);
                    })
                    .then((poExId) => {
                        var query = {
                            _id: ObjectId.isValid(poExId) ? new ObjectId(poExId) : {}
                        };
                        return this.getSingleByQuery(query);
                    })
                    .then((purchaseOrderExternal) => {
                        var getPurchaseOrderIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrder._id));
                        var getPurchaseRequestIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseRequestManager.getSingleByIdOrDefault(purchaseOrder.purchaseRequest._id));

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
                                            var _purchaseRequest = purchaseRequests.find((purchaseRequest) => purchaseRequest._id.toString() === purchaseOrder.purchaseRequest._id.toString());
                                            if (_purchaseRequest) {
                                                purchaseOrder.purchaseRequest = _purchaseRequest;
                                            }
                                            purchaseOrder.isPosted = false;
                                            purchaseOrder.status = poStatusEnum.CREATED;
                                            for (var poItem of purchaseOrder.items) {
                                                poItem.priceBeforeTax = 0;
                                                poItem.dealQuantity = 0;
                                                poItem.dealUom = new uom();
                                                poItem.conversion = 1;
                                            }
                                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder)
                                        })
                                        return Promise.all(jobsUpdatePO)
                                    })
                            })
                            .then((purchaseOrders) => {
                                for (var purchaseOrder of purchaseOrders) {
                                    var item = purchaseOrderExternal.items.find(item => item._id.toString() === purchaseOrder._id.toString());
                                    var index = purchaseOrderExternal.items.indexOf(item);
                                    if (index !== -1) {
                                        purchaseOrderExternal.items.splice(index, 1, purchaseOrder);
                                    }
                                }
                                return this.collection
                                    .updateOne({
                                        _id: purchaseOrderExternal._id
                                    }, {
                                        $set: purchaseOrderExternal
                                    })
                                    .then((result) => Promise.resolve(purchaseOrderExternal._id));
                            })
                    })
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
                getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(po._id, this.purchaseOrderFields));
            }
        }

        return Promise.all([getOtherPurchaseOrder, getSupplier, getCurrency, getVat].concat(getPOInternal))
            .then(results => {
                var _otherPurchaseOrder = results[0];
                var _supplier = results[1];
                var _currency = results[2];
                var _vat = results[3];
                var _poInternals = results.slice(4, results.length);

                var _products = _poInternals.map((poInternal) => {
                    return poInternal.items.map((item) => { return item.product })
                });
                _products = [].concat.apply([], _products);

                var _listProducts = _products.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var getProducts = _listProducts.map((product) => {
                    if (ObjectId.isValid(product._id)) {
                        return this.productManager.getSingleByIdOrDefault(product._id)
                    } else {
                        return Promise.resolve(null)
                    }
                });

                return Promise.all(getProducts)
                    .then(listProduct => {
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

                        // if (!valid.currencyRate || valid.currencyRate === 0) {
                        //     purchaseOrderExternalError["currencyRate"] = i18n.__("PurchaseOrderExternal.currencyRate.isRequired:%s is required", i18n.__("PurchaseOrderExternal.currencyRate._:Currency Rate")); //"Rate tidak boleh kosong";
                        // }

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
                                    var po = _poInternals.find((poInternal) => poInternal._id.toString() == purchaseOrder._id.toString());
                                    if (po) {
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
                                            var product = listProduct.find((_product) => _product._id.toString() === poItem.product._id.toString());

                                            if (!poItem.dealQuantity || poItem.dealQuantity === 0) {
                                                poItemHasError = true;
                                                poItemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                            }
                                            else if (dealUomId.equals(defaultUomId) && poItem.dealQuantity > poItem.defaultQuantity) {
                                                poItemHasError = true;
                                                poItemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isGreater:%s must not be greater than defaultQuantity", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                            }
                                            if (!poItem.dealUom || !poItem.dealUom.unit || poItem.dealUom.unit === "") {
                                                poItemHasError = true;
                                                poItemError["dealUom"] = i18n.__("PurchaseOrderExternal.items.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                            }
                                            if (!poItem.priceBeforeTax || poItem.priceBeforeTax === 0) {
                                                poItemHasError = true;
                                                poItemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                            } else if (product) {
                                                if (poItem.priceBeforeTax > product.price) {
                                                    poItemHasError = true;
                                                    poItemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax.isGreater:%s must not be greater than default price", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                                }
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
                                                _purchaseOrderItem.dealQuantity = Number(_poItem.dealQuantity);
                                                _purchaseOrderItem.dealUom = _poItem.dealUom;
                                                _purchaseOrderItem.useIncomeTax = _poItem.useIncomeTax;
                                                _purchaseOrderItem.priceBeforeTax = Number(_poItem.priceBeforeTax);
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
                            var getPurchaseOrderIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrder._id));
                            var getPurchaseRequestIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseRequestManager.getSingleByIdOrDefault(purchaseOrder.purchaseRequest._id));

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
                                                var _purchaseRequest = purchaseRequests.find((purchaseRequest) => purchaseRequest._id.toString() === purchaseOrder.purchaseRequest._id.toString());
                                                if (_purchaseRequest) {
                                                    purchaseOrder.purchaseRequest = _purchaseRequest;
                                                }
                                                purchaseOrder.purchaseOrderExternalId = new ObjectId(purchaseOrderExternal._id);
                                                purchaseOrder.purchaseOrderExternal = purchaseOrderExternal;
                                                purchaseOrder.purchaseOrderExternal._id = new ObjectId(purchaseOrderExternal._id);
                                                purchaseOrder.supplierId = new ObjectId(purchaseOrderExternal.supplierId);
                                                purchaseOrder.supplier = purchaseOrderExternal.supplier;
                                                purchaseOrder.supplier._id = new ObjectId(purchaseOrderExternal.supplier._id);
                                                purchaseOrder.freightCostBy = purchaseOrderExternal.freightCostBy;
                                                purchaseOrder.currency = purchaseOrderExternal.currency;
                                                purchaseOrder.currencyRate = purchaseOrderExternal.currencyRate;
                                                purchaseOrder.paymentMethod = _purchaseOrderExternal.paymentMethod;
                                                purchaseOrder.paymentDueDays = purchaseOrderExternal.paymentDueDays;
                                                purchaseOrder.vat = purchaseOrderExternal.vat;
                                                purchaseOrder.useVat = purchaseOrderExternal.useVat;
                                                purchaseOrder.vatRate = purchaseOrderExternal.vatRate;
                                                purchaseOrder.useIncomeTax = purchaseOrderExternal.useIncomeTax;
                                                purchaseOrder.isPosted = true;
                                                purchaseOrder.status = poStatusEnum.ORDERED;

                                                for (var poItem of purchaseOrder.items) {
                                                    var _purchaseOrder = purchaseOrderExternal.items.find((_purchaseOrder) => _purchaseOrder._id.toString() === purchaseOrder._id.toString());
                                                    var itemExternal = _purchaseOrder.items.find((_item) => _item.product._id.toString() === poItem.product._id.toString());
                                                    if (itemExternal) {
                                                        poItem.dealQuantity = Number(itemExternal.dealQuantity);
                                                        poItem.dealUom = itemExternal.dealUom;
                                                        poItem.priceBeforeTax = Number(itemExternal.priceBeforeTax);
                                                        poItem.pricePerDealUnit = itemExternal.useIncomeTax ? (100 * itemExternal.priceBeforeTax) / 110 : itemExternal.priceBeforeTax;
                                                        poItem.conversion = Number(itemExternal.conversion);
                                                        poItem.currency = purchaseOrderExternal.currency;
                                                        poItem.currencyRate = Number(purchaseOrderExternal.currencyRate);
                                                    }
                                                }
                                                return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder)
                                            })
                                            return Promise.all(jobsUpdatePO)
                                        })
                                })
                                .then((purchaseOrders) => {
                                    for (var purchaseOrder of purchaseOrders) {
                                        var item = purchaseOrderExternal.items.find(item => item._id.toString() === purchaseOrder._id.toString());
                                        var index = purchaseOrderExternal.items.indexOf(item);
                                        if (index !== -1) {
                                            purchaseOrderExternal.items.splice(index, 1, purchaseOrder);
                                        }
                                    }
                                    return this.collection
                                        .updateOne({
                                            _id: purchaseOrderExternal._id
                                        }, {
                                            $set: purchaseOrderExternal
                                        })
                                        .then((result) => Promise.resolve(purchaseOrderExternal._id));
                                })
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
                    var getDefinition = require('../../pdf/definitions/purchase-order-external');
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
                        var getPurchaseOrderIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrder._id));
                        var getPurchaseRequestIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseRequestManager.getSingleByIdOrDefault(purchaseOrder.purchaseRequest._id));

                        return Promise.all(getPurchaseRequestIds)
                            .then((purchaseRequests) => {
                                var jobsUpdatePR = purchaseRequests.map((purchaseRequest) => {
                                    purchaseRequest.status = prStatusEnum.PROCESSING
                                    return this.purchaseRequestManager.updateCollectionPR(purchaseRequest)
                                })
                                return Promise.all(jobsUpdatePR);
                            })
                            .then((purchaseRequests) => {
                                return Promise.all(getPurchaseOrderIds)
                                    .then((purchaseOrders) => {
                                        var jobsUpdatePO = purchaseOrders.map((purchaseOrder) => {
                                            var _purchaseRequest = purchaseRequests.find((purchaseRequest) => purchaseRequest._id.toString() === purchaseOrder.purchaseRequest._id.toString());
                                            if (_purchaseRequest) {
                                                purchaseOrder.purchaseRequest = _purchaseRequest;
                                            }
                                            purchaseOrder.purchaseOrderExternalId = {};
                                            purchaseOrder.purchaseOrderExternal = {};
                                            purchaseOrder.supplierId = {};
                                            purchaseOrder.supplier = {};
                                            purchaseOrder.freightCostBy = '';
                                            purchaseOrder.currency = {};
                                            purchaseOrder.currencyRate = 1;
                                            purchaseOrder.paymentMethod = '';
                                            purchaseOrder.paymentDueDays = 0;
                                            purchaseOrder.vat = {};
                                            purchaseOrder.useVat = false;
                                            purchaseOrder.vatRate = 0;
                                            purchaseOrder.useIncomeTax = false;
                                            purchaseOrder.status = poStatusEnum.PROCESSING;

                                            for (var poItem of purchaseOrder.items) {
                                                poItem.dealQuantity = 0;
                                                poItem.dealUom = {};
                                                poItem.priceBeforeTax = 0;
                                                poItem.pricePerDealUnit = 0;
                                                poItem.conversion = 1;
                                                poItem.currency = {};
                                                poItem.currencyRate = 1;
                                            }
                                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder)
                                        })
                                        return Promise.all(jobsUpdatePO)
                                    })
                            })
                            .then((purchaseOrders) => {
                                return this.collection
                                    .updateOne({
                                        _id: purchaseOrderExternal._id
                                    }, {
                                        $set: purchaseOrderExternal
                                    })
                                    .then((result) => Promise.resolve(purchaseOrderExternal._id));
                            })
                    })
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
                    .then((purchaseOrderExternal) => {
                        purchaseOrderExternal.status = poStatusEnum.VOID;
                        return this.update(purchaseOrderExternal);
                    })
                    .then((poExId) => {
                        return this.getSingleByIdOrDefault(poExId);
                    })
                    .then((purchaseOrderExternal) => {
                        var getPurchaseOrderIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrder._id));
                        var getPurchaseRequestIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseRequestManager.getSingleByIdOrDefault(purchaseOrder.purchaseRequest._id));

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
                                            var _purchaseRequest = purchaseRequests.find((purchaseRequest) => purchaseRequest._id.toString() === purchaseOrder.purchaseRequest._id.toString());
                                            if (_purchaseRequest) {
                                                purchaseOrder.purchaseRequest = _purchaseRequest;
                                            }
                                            purchaseOrder.status = poStatusEnum.VOID;

                                            return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder)
                                        })
                                        return Promise.all(jobsUpdatePO)
                                    })
                            })
                            .then((purchaseOrders) => {
                                for (var purchaseOrder of purchaseOrders) {
                                    var item = purchaseOrderExternal.items.find(item => item._id.toString() === purchaseOrder._id.toString());
                                    var index = purchaseOrderExternal.items.indexOf(item);
                                    if (index !== -1) {
                                        purchaseOrderExternal.items.splice(index, 1, purchaseOrder);
                                    }
                                }
                                return this.collection
                                    .updateOne({
                                        _id: purchaseOrderExternal._id
                                    }, {
                                        $set: purchaseOrderExternal
                                    })
                                    .then((result) => Promise.resolve(purchaseOrderExternal._id));
                            })
                    });

            });
    }

    close(poExternalId) {
        return this.getSingleByIdOrDefault(poExternalId)
            .then((poExternal) => {
                return this.validateClose(poExternal)
                    .then((purchaseOrderExternal) => {
                        purchaseOrderExternal.isClosed = true;
                        return this.update(purchaseOrderExternal);
                    })
                    .then((poExId) => {
                        return this.getSingleByIdOrDefault(poExId);
                    })
                    .then((purchaseOrderExternal) => {
                        var getPurchaseOrderIds = purchaseOrderExternal.items.map((purchaseOrder) => this.purchaseOrderManager.getSingleByIdOrDefault(purchaseOrder._id));

                        return Promise.all(getPurchaseOrderIds)
                            .then((purchaseOrders) => {
                                var jobsUpdatePO = purchaseOrders.map((purchaseOrder) => {
                                    purchaseOrder.items.map((item) => item.isClosed = true);
                                    purchaseOrder.isClosed = true;
                                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder)
                                })
                                return Promise.all(jobsUpdatePO)
                            })
                            .then((purchaseOrders) => {
                                for (var purchaseOrder of purchaseOrders) {
                                    var item = purchaseOrderExternal.items.find(item => item._id.toString() === purchaseOrder._id.toString());
                                    var index = purchaseOrderExternal.items.indexOf(item);
                                    if (index !== -1) {
                                        purchaseOrderExternal.items.splice(index, 1, purchaseOrder);
                                    }
                                }
                                return this.collection
                                    .updateOne({
                                        _id: purchaseOrderExternal._id
                                    }, {
                                        $set: purchaseOrderExternal
                                    })
                                    .then((result) => Promise.resolve(purchaseOrderExternal._id));
                            })
                    })
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
    }

    getDurationPRtoPOEksternalData(query) {
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
                {
                    $lookup:
                    {
                        from: "purchase-requests",
                        localField: "items.purchaseRequest.no",
                        foreignField: "no",
                        as: "hasil_docs"
                    }
                },
                { $unwind: "$items.items" },
                { $match: Query },
                { $redact: durationQuery },
                {
                    $project: {
                        "items.purchaseRequest.date": 1,
                        "prDate": "$items.purchaseRequest.date",
                        "prCreatedDate": "$items.purchaseRequest._createdDate",
                        "prNo": "$items.purchaseRequest.no",
                        "division": "$items.unit.division.name",
                        "unit": "$items.unit.name",
                        "budget": "$hasil_docs.budget.name",
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
    }

    getXlsDurationPRtoPOEksternalData(result, query) {
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
    }

    getDurationPOData(query) {
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
                {
                    $lookup:
                    {
                        from: "purchase-requests",
                        localField: "items.purchaseRequest.no",
                        foreignField: "no",
                        as: "hasil_docs"
                    }
                },
                { $unwind: "$items.items" },
                { $match: Query },
                { $redact: durationQuery },
                {
                    $project: {
                        "items._createdDate": 1,
                        "prDate": "$items.purchaseRequest.date",
                        "prCreatedDate": "$items.purchaseRequest._createdDate",
                        "prNo": "$items.purchaseRequest.no",
                        "division": "$items.division.name",
                        "unit": "$items.unit.name",
                        "budget": "$hasil_docs.budget.name",
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
    }

    getXlsDurationPOData(result, query) {
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
    }
};