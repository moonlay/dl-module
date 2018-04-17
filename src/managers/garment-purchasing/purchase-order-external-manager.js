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
var assert = require('assert');

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
            "items.category",
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
        for (var pr of poId) {
            if (ObjectId.isValid(pr)) {
                getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(pr, this.purchaseOrderFields));
            }
        }

        var getPurchaseRequest = [];
        valid.items = valid.items || [];
        var prId = valid.items.map((item) => { return item.prId })
        prId = prId.filter(function (elem, index, self) {
            return index == self.indexOf(elem);
        })
        for (var pr of prId) {
            if (ObjectId.isValid(pr)) {
                getPurchaseRequest.push(this.purchaseRequestManager.getSingleByIdOrDefault(pr, ["no", "_id", "items.refNo", "items.product.code", "items.quantity", "items.budgetPrice"]));
            }
        }
        return Promise.all(getPurchaseRequest)
            .then((purchaseRequestList) => {
                return Promise.all([getOtherPurchaseOrderExternal, getSupplier, getCurrency, getVat].concat(getPOInternal))
                    .then(results => {
                        var _otherPurchaseOrderExternal = results[0];
                        var _supplier = results[1];
                        var _currency = results[2];
                        var _vat = results[3];
                        var _poInternals = results.slice(4, results.length);

                        var listCategories = _poInternals.map(_poInternal => {
                            return _poInternal.items.map((poItem) => {
                                return poItem.category.name;
                            })
                        })
                        listCategories = [].concat.apply([], listCategories);
                        listCategories = listCategories.filter(function (elem, index, self) {
                            return index == self.indexOf(elem);
                        })

                        var getBudgets = [];
                        for (var item of valid.items) {
                            getBudgets.push(this.collection.aggregate([
                                {
                                    $match: {
                                        "_deleted": false,
                                        "no": { "$ne": valid.no },
                                        "items.prNo": item.prNo,
                                        "items.prRefNo": item.prRefNo,
                                        "items.product.code": item.product.code
                                    }
                                },
                                {
                                    $unwind: "$items"
                                }, {
                                    $match: {
                                        "items.prNo": item.prNo,
                                        "items.prRefNo": item.prRefNo,
                                        "items.product.code": item.product.code
                                    }
                                },
                                {
                                    $project: {
                                        "productId": "$items.product._id",
                                        "prNo": "$items.prNo",
                                        "prRefNo": "$items.prRefNo",
                                        "poNo": "$items.poNo",
                                        "price": { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity"] },
                                        "product": "$items.product.code"
                                    }
                                },
                                {
                                    $group:
                                        {
                                            _id: null,
                                            "totalAmount": { $sum: "$price" },
                                            "product": { "$first": "$product" },
                                            "productId": { "$first": "$productId" },
                                            "prNo": { "$first": "$prNo" },
                                            "prRefNo": { "$first": "$prRefNo" },
                                            "poNo": { "$first": "$poNo" },
                                        }
                                }]).toArray())
                        }

                        return Promise.all(getBudgets)
                            .then(listBudget => {
                                listBudget = [].concat.apply([], listBudget);
                                listBudget = this.cleanUp(listBudget);
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

                                        if (!valid.paymentMethod || valid.paymentMethod === "") {
                                            error["paymentMethod"] = i18n.__("PurchaseOrderExternal.paymentMethod.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentMethod._:Payment Method")); //"Metode Pembayaran tidak boleh kosong";
                                        }

                                        if (!valid.paymentType || valid.paymentType === "") {
                                            error["paymentType"] = i18n.__("PurchaseOrderExternal.paymentType.isRequired:%s is required", i18n.__("PurchaseOrderExternal.paymentType._:Payment Type")); //"Metode Pembayaran tidak boleh kosong";
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

                                        if ((valid.freightCostBy || "").toString() === "") {
                                            error["freightCostBy"] = i18n.__("PurchaseOrderExternal.freightCostBy.isRequired:%s is required", i18n.__("PurchaseOrderExternal.freightCostBy._:FreightCostBy")); //"Tempo Pembayaran tidak boleh kosong";
                                        }

                                        if ((valid.category || "").toString() === "") {
                                            error["category"] = i18n.__("PurchaseOrderExternal.category.isRequired:%s is required", i18n.__("PurchaseOrderExternal.category._:Category"));
                                        }
                                        if (valid.category) {
                                            if (valid.category.toUpperCase() == "FABRIC") {
                                                var qualityStandardError = {};
                                                if ((valid.qualityStandard.shrinkage || "").toString() === "") {
                                                    qualityStandardError["shrinkage"] = i18n.__("PurchaseOrderExternal.qualityStandard.shrinkage.isRequired:%s is required", i18n.__("PurchaseOrderExternal.qualityStandard.shrinkage._:Shrinkage"));
                                                }
                                                if ((valid.qualityStandard.wetRubbing || "").toString() === "") {
                                                    qualityStandardError["wetRubbing"] = i18n.__("PurchaseOrderExternal.qualityStandard.wetRubbing.isRequired:%s is required", i18n.__("PurchaseOrderExternal.qualityStandard.wetRubbing._:Wet Rubbing"));
                                                }
                                                if ((valid.qualityStandard.dryRubbing || "").toString() === "") {
                                                    qualityStandardError["dryRubbing"] = i18n.__("PurchaseOrderExternal.qualityStandard.dryRubbing.isRequired:%s is required", i18n.__("PurchaseOrderExternal.qualityStandard.dryRubbing._:Dry Rubbing"));
                                                }
                                                if ((valid.qualityStandard.washing || "").toString() === "") {
                                                    qualityStandardError["washing"] = i18n.__("PurchaseOrderExternal.qualityStandard.washing.isRequired:%s is required", i18n.__("PurchaseOrderExternal.qualityStandard.washing._:Washing"));
                                                }
                                                if ((valid.qualityStandard.darkPerspiration || "").toString() === "") {
                                                    qualityStandardError["darkPerspiration"] = i18n.__("PurchaseOrderExternal.qualityStandard.darkPerspiration.isRequired:%s is required", i18n.__("PurchaseOrderExternal.qualityStandard.darkPerspiration._:Dark Perspiration"));
                                                }
                                                if ((valid.qualityStandard.lightMedPerspiration || "").toString() === "") {
                                                    qualityStandardError["lightMedPerspiration"] = i18n.__("PurchaseOrderExternal.qualityStandard.lightMedPerspiration.isRequired:%s is required", i18n.__("PurchaseOrderExternal.qualityStandard.lightMedPerspiration._:Light/Med Perspoiration"));
                                                }
                                                if ((valid.qualityStandard.pieceLength || "").toString() === "") {
                                                    qualityStandardError["pieceLength"] = i18n.__("PurchaseOrderExternal.qualityStandard.pieceLength.isRequired:%s is required", i18n.__("PurchaseOrderExternal.qualityStandard.pieceLength._:Shrinkage"));
                                                }
                                                if ((valid.qualityStandard.qualityStandardType || "").toString() === "") {
                                                    qualityStandardError["qualityStandardType"] = i18n.__("PurchaseOrderExternal.qualityStandard.qualityStandardType.isRequired:%s is required", i18n.__("PurchaseOrderExternal.qualityStandard.qualityStandardType._:Quality Standard Type"));
                                                }
                                                if (Object.getOwnPropertyNames(qualityStandardError).length > 0) {
                                                    error.qualityStandard = qualityStandardError;
                                                }
                                            }
                                        }

                                        if (valid.items && valid.items.length > 0) {
                                            var itemErrors = [];
                                            for (var items of valid.items) {
                                                var itemError = {};
                                                var po = _poInternals.find((poInternal) => poInternal._id.toString() == items.poId.toString());
                                                var poItem = po.items.find((item) => item.product._id.toString() === items.product._id.toString());

                                                var pr = purchaseRequestList.find((pr) => pr._id.toString() == items.prId.toString());
                                                var prItem = pr.items.find((item) => item.product.code.toString() === items.product.code.toString() && item.refNo === items.prRefNo)
                                                var fixBudget = prItem.quantity * prItem.budgetPrice;
                                                var budgetUsed = listBudget.find((budget) => budget.prNo == items.prNo && budget.prRefNo == items.prRefNo && budget.product == items.product.code);
                                                var totalDealPrice = items.dealQuantity * items.priceBeforeTax;
                                                if (budgetUsed) {
                                                    totalDealPrice += budgetUsed.totalAmount
                                                }
                                                if (poItem) {
                                                    if (poItem.isPosted && !valid._id) {
                                                        itemError["no"] = i18n.__("PurchaseOrderExternal.items.isPosted:%s is already used", i18n.__("PurchaseOrderExternal.items._:Purchase Order Internal")); //"Purchase order internal tidak boleh kosong";
                                                    }
                                                    else if (!items.poNo || items.poNo == "") {
                                                        itemError["no"] = i18n.__("PurchaseOrderExternal.items.no.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.no._:No")); //"Purchase order internal tidak boleh kosong";
                                                    } else if (valid.category.toUpperCase() == "FABRIC") {
                                                        if (listCategories.length > 1) {
                                                            itemError["no"] = i18n.__("PurchaseOrderExternal.items.no.multipleCategory:%s cannot multiple category", i18n.__("PurchaseOrderExternal.items.no._:Purchase Order Internal"));
                                                        }
                                                    }
                                                    var product = listProduct.find((_product) => _product._id.toString() === items.product._id.toString());

                                                    if (!items.dealQuantity || items.dealQuantity === 0) {
                                                        itemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                                    }
                                                    else if (!items.isOverBudget) {
                                                        if (valid.paymentMethod === "SAMPLE" || valid.paymentMethod === "DAN LIRIS") {
                                                            if (totalDealPrice > fixBudget) {
                                                                itemError["dealQuantity"] = i18n.__("PurchaseOrderExternal.items.dealQuantity.isGreater:%s must not be greater than budget", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Total price"));
                                                            }
                                                        }
                                                    }

                                                    if (!items.dealUom || !items.dealUom.unit || items.dealUom.unit === "") {
                                                        itemError["dealUom"] = i18n.__("PurchaseOrderExternal.items.dealQuantity.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.dealQuantity._:Deal Quantity")); //"Jumlah kesepakatan tidak boleh kosong";
                                                    }
                                                    if (!items.priceBeforeTax || items.priceBeforeTax === 0) {
                                                        itemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.priceBeforeTax.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Price Per Deal Unit")); //"Harga tidak boleh kosong";
                                                    }
                                                    else if (!items.isOverBudget) {
                                                        if (valid.paymentMethod === "SAMPLE" || valid.paymentMethod === "DAN LIRIS") {
                                                            if (totalDealPrice > fixBudget) {
                                                                itemError["priceBeforeTax"] = i18n.__("PurchaseOrderExternal.items.priceBeforeTax.isGreater:%s must not be greater than budget", i18n.__("PurchaseOrderExternal.items.items.priceBeforeTax._:Total price"));
                                                            }
                                                        }
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
                                                    if (!items.quantityConversion || items.quantityConversion === 0) {
                                                        itemError["quantityConversion"] = i18n.__("PurchaseOrderExternal.items.quantityConversion.isRequired:%s is required or not 0", i18n.__("PurchaseOrderExternal.items.quantityConversion._:Quantity Conversion"));
                                                    }

                                                    if (!items.uomConversion || !items.uomConversion.unit || items.uomConversion.unit === "") {
                                                        itemError["uomConversion"] = i18n.__("PurchaseOrderExternal.items.uomConversion.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.uomConversion._:Uom Conversion"));
                                                    }

                                                    if (Object.getOwnPropertyNames(items.uomConversion).length > 0 && Object.getOwnPropertyNames(items.dealUom).length > 0) {
                                                        if (items.uomConversion.unit.toString() === items.dealUom.unit.toString()) {
                                                            if (items.conversion !== 1) {
                                                                // itemError["conversion"] = i18n.__("PurchaseOrderExternal.items.conversion.mustOne:%s must be 1", i18n.__("PurchaseOrderExternal.items.conversion._:Conversion"));
                                                            }
                                                        } else {
                                                            if (items.conversion === 1) {
                                                                // itemError["conversion"] = i18n.__("PurchaseOrderExternal.items.conversion.mustNotOne:%s must not be 1", i18n.__("PurchaseOrderExternal.items.conversion._:Conversion"));
                                                            }
                                                        }
                                                    } else {
                                                        itemError["uomConversion"] = i18n.__("PurchaseOrderExternal.items.uomConversion.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.uomConversion._:Uom Conversion"));
                                                    }
                                                    if (items.isOverBudget) {
                                                        if (!items.overBudgetRemark || items.overBudgetRemark === "") {
                                                            itemError["overBudgetRemark"] = i18n.__("PurchaseOrderExternal.items.overBudgetRemark.isRequired:%s is required", i18n.__("PurchaseOrderExternal.items.overBudgetRemark._:Over Bugdet Remark"));
                                                        }
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
                                            _item.category = poInternal.items[0].category;
                                            _item.categoryId = poInternal.items[0].category._id;
                                            _item.dealQuantity = Number(_item.dealQuantity);
                                            _item.defaultQuantity = Number(_item.defaultQuantity);
                                            _item.priceBeforeTax = Number(_item.priceBeforeTax);
                                            _item.pricePerDealUnit = _item.useIncomeTax ? (100 * _item.priceBeforeTax) / 110 : _item.priceBeforeTax;
                                            _item.budgetPrice = Number(_item.budgetPrice);
                                            _item.conversion = Number(_item.conversion);
                                            _item.uomConversion = poInternal.items[0].category.uom || _item.dealUom;
                                            _item.quantityConversion = _item.dealQuantity * _item.conversion;
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
                    });
            });
    }

    _beforeInsert(purchaseOrderExternal) {
        purchaseOrderExternal.no = generateCode();
        purchaseOrderExternal.status = poStatusEnum.CREATED;
        purchaseOrderExternal.date = new Date();
        return this.checkIsOverbudget(purchaseOrderExternal);
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
                return this.checkIsOverbudget(purchaseOrderExternal);
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
                    var getPurchaseRequests = [];
                    pox.items = pox.items || [];
                    var prId = pox.items.map((item) => { return item.prId })
                    prId = prId.filter(function (elem, index, self) {
                        return index == self.indexOf(elem);
                    })
                    for (var pr of prId) {
                        if (ObjectId.isValid(pr)) {
                            getPurchaseRequests.push(this.purchaseRequestManager.getSingleByIdOrDefault(pr, ["artikel", "items.product._id", "items.colors", "no", "_id", "shipmentDate"]));
                        }
                    }
                    Promise.all(getPurchaseRequests)
                        .then((purchaseRequests) => {
                            for (var item of pox.items) {
                                var _pr = purchaseRequests.find((purchaseRequest) => purchaseRequest._id.toString() === item.prId.toString())
                                var _prItem = _pr.items.find((prItem) => prItem.product._id.toString() === item.product._id.toString())
                                item.colors = _prItem.colors || []
                                item.artikel = _pr.artikel;
                                item.shipmentDate = _pr.shipmentDate;
                            }

                            var getDefinition;
                            if (pox.supplier.import == true) {
                                getDefinition = require('../../pdf/definitions/garment-purchase-order-external-english');
                            } else {
                                getDefinition = require('../../pdf/definitions/garment-purchase-order-external');
                            }
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

        var createdDateIndex = {
            name: `ix_${map.purchasing.collection.PurchaseOrderExternal}__createdDate`,
            key: {
                _createdDate: -1
            }
        }

        return this.collection.createIndexes([dateIndex, noIndex, createdDateIndex]);
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

    cleanUp(input) {
        var newArr = [];
        for (var i = 0; i < input.length; i++) {
            if (input[i]) {
                newArr.push(input[i]);
            }
        }
        return newArr;
    }

    getListUsedBudget(purchaseRequestNo, purchaseRequestRefNo, productCode, purchaseOrderExternalNo) {
        if (purchaseOrderExternalNo) {
            return this.collection.aggregate([
                {
                    $match: {
                        "_deleted": false,
                        "no": { "$ne": purchaseOrderExternalNo },
                        "items.prNo": purchaseRequestNo,
                        "items.prRefNo": purchaseRequestRefNo,
                        "items.product.code": productCode
                    }
                },
                {
                    $unwind: "$items"
                }, {
                    $match: {
                        "items.prNo": purchaseRequestNo,
                        "items.prRefNo": purchaseRequestRefNo,
                        "items.product.code": productCode
                    }
                },
                {
                    $project: {
                        "productId": "$items.product._id",
                        "prNo": "$items.prNo",
                        "prRefNo": "$items.prRefNo",
                        "poNo": "$items.poNo",
                        "price": { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity"] },
                        "product": "$items.product.code"
                    }
                },
                {
                    $group:
                        {
                            _id: null,
                            "totalAmount": { $sum: "$price" },
                            "product": { "$first": "$product" },
                            "productId": { "$first": "$productId" },
                            "prNo": { "$first": "$prNo" },
                            "prRefNo": { "$first": "$prRefNo" },
                            "poNo": { "$first": "$poNo" },
                        }
                }]).toArray()
        } else {
            return this.collection.aggregate([
                {
                    $match: {
                        "_deleted": false,
                        "items.prNo": purchaseRequestNo,
                        "items.prRefNo": purchaseRequestRefNo,
                        "items.product.code": productCode
                    }
                },
                {
                    $unwind: "$items"
                }, {
                    $match: {
                        "items.prNo": purchaseRequestNo,
                        "items.prRefNo": purchaseRequestRefNo,
                        "items.product.code": productCode
                    }
                },
                {
                    $project: {
                        "productId": "$items.product._id",
                        "prNo": "$items.prNo",
                        "prRefNo": "$items.prRefNo",
                        "poNo": "$items.poNo",
                        "price": { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity"] },
                        "product": "$items.product.code"
                    }
                },
                {
                    $group:
                        {
                            _id: null,
                            "totalAmount": { $sum: "$price" },
                            "product": { "$first": "$product" },
                            "productId": { "$first": "$productId" },
                            "prNo": { "$first": "$prNo" },
                            "prRefNo": { "$first": "$prRefNo" },
                            "poNo": { "$first": "$poNo" },
                        }
                }]).toArray()
        }
    }

   getAllData(startdate, enddate, offset) {
        return new Promise((resolve, reject) => {
            var now = new Date();
            var deleted = {
                _deleted: false
            };
            var isPosted = {
                isPosted: true
            };

            var POStatus = {
                "status.name": "ARRIVING"
            };
            
            var query = [deleted, isPosted, POStatus];

            var validStartDate = new Date(startdate);
            var validEndDate = new Date(enddate);

            
            if (startdate && enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDate = {
                    "_createdDate": {
                        $gte: validStartDate,
                        $lte: validEndDate
                    }
                };
                query.push(filterDate);
            }
            else if (!startdate && enddate) {
                validEndDate.setHours(validEndDate.getHours() - offset);
                var filterDateTo = {
                    "_createdDate": {
                        $gte: now,
                        $lte: validEndDate
                    }
                };
                query.push(filterDateTo);
            }
            else if (startdate && !enddate) {
                validStartDate.setHours(validStartDate.getHours() - offset);
                var filterDateFrom = {
                    "_createdDate": {
                        $gte: validStartDate,
                        $lte: now
                    }
                };
                query.push(filterDateFrom);
            }

            var match = { '$and': query };

            var POColl = map.garmentPurchasing.collection.GarmentPurchaseOrder;
            this.collection.aggregate(
                [{
                    $match: match
                },
                {
                    $unwind: "$items"
                }, 
                {
                    $lookup: {
                        from: POColl,
                        foreignField: "refNo",
                        localField: "items.prNo",
                        as: "PO"
                    },
                },
                {
                    $project: {
                        "PoExt": "$no",
                        "TgPoExt": "$date",
                        "Dlvry": "$expectedDeliveryDate",
                        "KdSpl": "$supplier.code",
                        "NmSpl": "$supplier.name",
                        "Ongkir": "$freightCostBy",
                        "TipeByr": "$paymentType",
                        "MtdByr": "$paymentMethod",
                        "Tempo": "$paymentDueDays",
                        "MtUang": "$currency.code",
                        "RateMU": "$currencyRate",
                        "PakaiPPN": "$useIncomeTax",
                        "PakaiPPH": "$useVat",
                        "RatePPH": "$vat.rate",
                        "Status": "$status.label",
                        "PRNo": "$items.prNo",
                        "PlanPO": "$items.prRefNo",
                        "RONo": "$items.roNo",
                        "KdBrg": "$items.product.code",
                        "NmBrg": "$items.remark",
                        "QtyOrder": "$items.defaultQuantity",
                        "SatOrder": "$items.defaultUom.unit",
                        "QtyBeli": "$items.dealQuantity",
                        "SatBeli": "$items.dealUom.unit",
                        "SatKonv": "$items.uomConversion.unit",
                        "Konversi": "$items.conversion",
                        "HargaSat": "$items.pricePerDealUnit",
                        "POs": "$PO"
                    }
                },
                { $unwind: "$POs" },
                {
                    $project: {
                        "PoExt": "$PoExt", "TgPoExt": "$TgPoExt", "Dlvry": "$Dlvry", "KdSpl": "$KdSpl",
                        "NmSpl": "$NmSpl", "Ongkir": "$Ongkir", "TipeByr": "$TipeByr", "MtdByr": "$MtdByr",
                        "Tempo": "$Tempo", "MtUang": "$MtUang", "RateMU": "$RateMU", "PakaiPPN": "$PakaiPPN",
                        "PakaiPPH": "$PakaiPPH", "RatePPH": "$RatePPH", "Status": "$Status", "PRNo": "$PRNo",
                        "PlanPO": "$PlanPO", "RONo": "$RONo", "KdBrg": "$KdBrg", "NmBrg": "$NmBrg", "QtyOrder": "$QtyOrder",
                        "SatOrder": "$SatOrder", "QtyBeli": "$QtyBeli", "SatBeli": "$SatBeli",
                        "SatKonv": "$SatKonv", "Konversi": "$Konversi", "HargaSat": "$HargaSat", "KdByr": "$POs.buyer.code",
                        "Konf": "$POs.unit.code", "Article": "$POs.artikel"
                    }
                },
                {
                    $group: {
                        _id: {
                            PoExt: "$PoExt", TgPoExt: "$TgPoExt", Dlvry: "$Dlvry", KdSpl: "$KdSpl", NmSpl: "$NmSpl", Ongkir: "$Ongkir", Qty: "$Qy", TipeByr: "$TipeByr", MtdByr: "$MtdByr",
                            Tempo: "$Tempo", MtUang: "$MtUang", RateMU: "$RateMU", PakaiPPN: "$PakaiPPN", PakaiPPH: "$PakaiPPH", RatePPH: "$RatePPH", Status: "$Status", PRNo: "$PRNo", PlanPO: "$PlanPO",
                            RONo: "$RONo", KdBrg: "$KdBrg", NmBrg: "$NmBrg", QtyOrder: "$QtyOrder", SatOrder: "$SatOrder", QtyBeli: "$QtyBeli", SatBeli: "$SatBeli",
                            SatKonv: "$SatKonv", Konversi: "$Konversi", HargaSat: "$HargaSat", KdByr: "$KdByr", Konf: "$Konf", Article: "$Article"
                        }
                    }
                }
                ])
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
        });
    }

    getPOExtReport(query) {
        return new Promise((resolve, reject) => {
            var deletedQuery = {
                _deleted: false
            };
            var date = new Date();
            var dateString = moment(date).format('YYYY-MM-DD');
            var dateNow = new Date(dateString);
            var dateBefore = dateNow.setDate(dateNow.getDate() - 30);
            var dateQuery = {
                "date": {
                    "$gte": (!query || !query.dateFrom ? (new Date(dateBefore)) : (new Date(query.dateFrom))),
                    "$lte": (!query || !query.dateTo ? date : (new Date(query.dateTo + "T23:59")))
                }
            };
            var PONoQuery = {};
            if (query.no) {
                PONoQuery = {
                    "no": query.no
                }
            }
            var supplierQuery = {};
            if (query.supplier) {
                supplierQuery = {
                    "supplierId": new ObjectId(query.supplier)
                };
            }

            var Query = { "$and": [dateQuery, deletedQuery, supplierQuery, PONoQuery] };
            this.collection
                .aggregate([
                    { "$match": Query }
                    , { "$unwind": "$items" }
                    , {
                        "$project": {
                            "no": "$no",
                            "date": "$date",
                            "expectedDeliveryDate": "$expectedDeliveryDate",
                            "suppliercode": "$supplier.code",
                            "suppliername": "$supplier.name",
                            "freightCostBy": "$freightCostBy",
                            "paymentMethod": "$paymentMethod",
                            "paymentType": "$paymentType",
                            "paymentDueDays": "$paymentDueDays",
                            "currencycode": "$currency.code",
                            "currencyRate": "$currencyRate",
                            "useVat": "$useVat",
                            "vatRate": "$vatRate",
                            "useIncomeTax": "$useIncomeTax",
                            "category": "$category",
                            "prNo": "$items.prNo",
                            "prRefNo": "$items.prRefNo",
                            "roNo": "$items.roNo",
                            "productcode": "$items.product.code",
                            "description": "$items.remark",
                            "defaultQuantity": "$items.defaultQuantity",
                            "defaultUom": "$items.defaultUom.unit",
                            "dealQuantity": "$items.dealQuantity",
                            "dealUom": "$items.dealUom.unit",
                            "pricePerDealUnit": "$items.pricePerDealUnit",
                            "conversion": "$items.conversion",
                            "uomConversion": "$items.uomConversion.unit",
                            "quantityConversion": "$items.quantityConversion"
                        }
                    },
                    // {
                    //     "$group": {
                    //         "_id": { "no": "$no", "date": "$date","expectedDeliveryDate": "expectedDeliveryDate",
                    //                  "suppliercode": "$suppliercode", "deliveryOrderNo": "$deliveryOrderNo", "deliveryOrderDate": "$deliveryOrderDate",
                    //                  "productCode": "$productCode", "productName": "$productName",
                    //                  "uom": "$uom", "currency": "$currency", "_createdBy": "$_createdBy" },
                    //                  "quantity": { "$sum": "$quantity" },
                    //                  "price": { "$sum": { "$multiply": ["$quantity", "$price"] } }
                    //     }
                    // },
                    {
                        "$sort": {
                            "_id.date": 1,
                            "_id.suppliercode": 1
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

    getPOExtReportXls(dataReport, query) {
        return new Promise((resolve, reject) => {
            var xls = {};
            xls.data = [];
            xls.options = [];
            xls.name = '';

            var index = 0;
            var dateFormat = "DD/MM/YYYY";

            for (var data of dataReport.data) {
                index++;
                var item = {};
                item["No"] = index;
                item["No Po External"] = data.no ? data.no : '';
                item["Tanggal PO External"] = data.date ? moment(data.date).format("DD/MM/YYYY") : '';
                item["Tanggal Delivery"] = data.expectedDeliveryDate ? moment(data.expectedDeliveryDate).format("DD/MM/YYYY") : '';
                item["Kode Supplier"] = data.suppliercode ? data.suppliercode : '';
                item["Nama Supplier"] = data.suppliername ? data.suppliername : '';
                item["Ongkos Kirim"] = data.freightCostBy ? data.freightCostBy : '';
                item["Tipe Bayar"] = data.paymentType ? data.paymentType : '';
                item["Term Bayar"] = data.paymentMethod ? data.paymentMethod : '';
                item["Tempo Bayar"] = data.paymentDueDays ? data.paymentDueDays : 0;
                item["Mata Uang"] = data.currencycode ? data.currencycode : '';
                item["Rate"] = data.currencyRate ? data.currencyRate : 0;
                item["Mata Uang"] = data.currencycode ? data.currencycode : '';
                item["Pakai PPN"] = data.useIncomeTax ? "Ya" : "Tidak";
                item["PPN"] = data.useIncomeTax ? 10 : 0;
                item["Pakai PPH"] = data.useVat ? "Ya" : "Tidak";
                item["PPH"] = data.vatRate ? data.vatRate : 0;
                item["Kategori"] = data.category ? data.category : '';
                item["No PR"] = data.prNo ? data.prNo : '';
                item["No Ref PR"] = data.prRefNo ? data.prRefNo : '';
                item["No RO"] = data.roNo ? data.roNo : '';
                item["Kode Barang"] = data.productCode ? data.productCode : '';
                item["Nama Barang"] = data.description ? data.description : '';
                item["Jumlah Order"] = data.defaultQuantity ? data.defaultQuantity : 0;
                item["Satuan Order"] = data.defaultUom ? data.defaultUom : '';
                item["Jumlah Beli"] = data.dealQuantity ? data.dealQuantity : 0;
                item["Satuan Beli"] = data.dealUom ? data.dealUom : '';
                item["Konversi"] = data.conversion ? data.conversion : 0;
                item["Satuan Konversi"] = data.uomConversion ? data.uomConversion : '';
                item["Jumlah Konversi"] = data.quantityConversion ? data.quantityConversion : 0;
                item["Harga Beli"] = data.pricePerDealUnit ? data.pricePerDealUnit : 0;
                item["Jumlah Harga"] = data.dealQuantity * data.pricePerDealUnit;

                xls.data.push(item);
            }

            xls.options["No"] = "number";
            xls.options["No Po External"] = "string";
            xls.options["Tanggal PO External"] = "string";
            xls.options["Tanggal Delivery"] = "string";
            xls.options["Kode Supplier"] = "string";
            xls.options["Nama Supplier"] = "string";
            xls.options["Ongkos Kirim"] = "string";
            xls.options["Tipe Bayar"] = "string";
            xls.options["Term Bayar"] = "string";
            xls.options["Tempo Bayar"] = "numner";
            xls.options["Mata Uang"] = "string";
            xls.options["Rate"] = "number";
            xls.options["Mata Uang"] = "string";
            xls.options["Pakai PPN"] = "string";
            xls.options["PPN"] = "string";
            xls.options["Pakai PPH"] = "string";
            xls.options["PPH"] = "number";
            xls.options["Kategori"] = "string";
            xls.options["No PR"] = "string";
            xls.options["No Ref PR"] = "string";
            xls.options["No RO"] = "string";
            xls.options["Kode Barang"] = "string";
            xls.options["Nama Barang"] = "string";
            xls.options["Jumlah Order"] = "number";
            xls.options["Satuan Order"] = "string";
            xls.options["Jumlah Beli"] = "number";
            xls.options["Satuan Beli"] = "string";
            xls.options["Konversi"] = "number";
            xls.options["Satuan Konversi"] = "string";
            xls.options["Jumlah Konversi"] = "number";
            xls.options["Harga Beli"] = "number";
            xls.options["Jumlah Harga"] = "number";

            if (query.dateFrom && query.dateTo) {
                xls.name = `PO External Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (!query.dateFrom && query.dateTo) {
                xls.name = `PO External Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
            }
            else if (query.dateFrom && !query.dateTo) {
                xls.name = `PO External Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
            }
            else
                xls.name = `PO External Report.xlsx`;

            resolve(xls);
        });
    }

    checkIsOverbudget(purchaseOrderExternal) {
        purchaseOrderExternal.isOverBudget = purchaseOrderExternal.items
            .map((item) => item.isOverBudget)
            .reduce((prev, curr, index) => {
                return prev || curr
            }, false);
        if (!purchaseOrderExternal.isApproved) {
            if (purchaseOrderExternal.isOverBudget) {
                purchaseOrderExternal.isApproved = false;
            } else {
                purchaseOrderExternal.isApproved = true;
            }
        }

        return Promise.resolve(purchaseOrderExternal)
    }

    validateApprove(purchaseOrderExternal) {
        var purchaseOrderExternalError = {};
        var valid = purchaseOrderExternal;

        return this.getSingleByIdOrDefault(valid._id)
            .then((poe) => {
                if (!poe.isOverBudget)
                    purchaseOrderExternalError["no"] = i18n.__("PurchaseOrderExternal.isOverBudget:%s is not over budget", i18n.__("PurchaseOrderExternal.isOverBudget._:No"));

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

    approve(listPurchaseOrderExternal) {
        var getPOExternalById = listPurchaseOrderExternal.map((purchaseOrderExternal) => this.getSingleByIdOrDefault(purchaseOrderExternal._id));
        return Promise.all(getPOExternalById)
            .then((purchaseOrderExternals) => {
                var jobs = purchaseOrderExternals.map((purchaseOrderExternal) => {
                    return this.validateApprove(purchaseOrderExternal)
                        .then((purchaseOrderExternal) => {
                            purchaseOrderExternal.isApproved = true;
                            return this.update(purchaseOrderExternal);
                        })
                        .then((result) => Promise.resolve(purchaseOrderExternal._id));
                });
                return Promise.all(jobs)
            })
            .then((purchaseOrderExternalIds) => {
                return Promise.resolve(purchaseOrderExternalIds);
            });
    }

    getOverBudgetReport(info) {
        var query = {
            _deleted: false,
            isOverBudget: true
        };
        var queryItem = {
            "items.isOverBudget": true
        };
        var queryPR = {};

        if (parseInt(info.isApproved) !== -1) {

            Object.assign(query, {
                "isApproved": info.isApproved == 1
            });
        }

        if (info.prNo && info.prNo !== "") {
            Object.assign(queryItem, {
                "items.prNo": info.prNo
            });
        }

        if (info.unitId && info.unitId !== "") {
            Object.assign(queryPR, {
                "purchaseRequest.unitId": new ObjectId(info.unitId)
            });
        }
        if (info.categoryId && info.categoryId !== "") {
            Object.assign(queryItem, {
                "items.categoryId": new ObjectId(info.categoryId)
            });
        }

        if (info.buyerId && info.buyerId !== "") {
            Object.assign(queryPR, {
                "purchaseRequest.buyerId": new ObjectId(info.buyerId)
            });
        }

        var offset = Number(info.offset) || 7;
        var page = (Number(info.page) || 1) - 1;
        var size = Number(info.size) || 25;
        var _dateNow = new Date();
        var dateFormat = "DD/MM/YYYY";

        if (info.dateFrom && info.dateFrom !== "" && info.dateTo && info.dateTo !== "") {
            var _dateFrom = new Date(info.dateFrom);
            var _dateTo = new Date(info.dateTo);
            _dateFrom.setHours(_dateFrom.getHours() - offset);
            _dateTo.setHours(_dateTo.getHours() - offset);
            Object.assign(query, {
                "date": {
                    $gte: _dateFrom,
                    $lte: _dateTo
                }
            });
        } else if (info.dateFrom && info.dateFrom !== "") {
            if (!info.dateTo && info.dateTo === "") {
                var _dateFrom = new Date(info.dateFrom);
                if (_dateNow > _dateFrom) {
                    var _dateTo = new Date();
                    _dateFrom.setHours(_dateFrom.getHours() - offset);
                    _dateTo.setHours(_dateTo.getHours() - offset);
                    Object.assign(query, {
                        "date": {
                            $gte: _dateFrom,
                            $lte: _dateTo
                        }
                    });
                }
            }
        } else if (info.dateTo && info.dateTo !== "") {
            if (!info.dateFrom && info.dateFrom === "") {
                var _dateTo = new Date(info.dateTo);
                if (_dateNow < _dateTo) {
                    var _dateFrom = new Date();
                    _dateFrom.setHours(_dateFrom.getHours() - offset);
                    _dateTo.setHours(_dateTo.getHours() - offset);
                    Object.assign(query, {
                        "date": {
                            $gte: _dateFrom,
                            $lte: _dateTo
                        }
                    });
                }
            }
        }

        return this._createIndexes()
            .then((createIndexResults) => {
                var getDataPromise = [];
                getDataPromise.push(
                    this.collection
                        .aggregate([
                            {
                                $match: query
                            },
                            {
                                $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $match: queryItem
                            },
                            {
                                $lookup:
                                    {
                                        from: "kurs-budgets",
                                        localField: "currency.code",
                                        foreignField: "code",
                                        as: "kursBudget"
                                    }
                            },
                            {
                                $unwind: { path: "$kursBudget", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $lookup:
                                    {
                                        from: "garment-purchase-requests",
                                        localField: "items.prNo",
                                        foreignField: "no",
                                        as: "purchaseRequest"
                                    }
                            },
                            {
                                $unwind: { path: "$purchaseRequest", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $match: queryPR
                            },
                            {
                                $unwind: { path: "$purchaseRequest.items", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $unwind: { path: "$purchaseRequest.items.purchaseOrderIds", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $project: {
                                    "aEq": { "$eq": ["$items.poId", "$purchaseRequest.items.purchaseOrderIds"] }
                                }
                            },
                            { "$match": { "aEq": true } },
                            { $group: { _id: null, count: { $sum: 1 } } }
                        ])
                        .toArray()
                );

                if (info.xls) {
                    getDataPromise.push(
                        this.collection
                            .aggregate([
                                {
                                    $match: query
                                },
                                {
                                    $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                                },
                                {
                                    $match: queryItem
                                },
                                {
                                    $lookup:
                                        {
                                            from: "kurs-budgets",
                                            localField: "currency.code",
                                            foreignField: "code",
                                            as: "kursBudget"
                                        }
                                },
                                {
                                    $unwind: { path: "$kursBudget", preserveNullAndEmptyArrays: true }
                                },
                                {
                                    $lookup:
                                        {
                                            from: "garment-purchase-requests",
                                            localField: "items.prNo",
                                            foreignField: "no",
                                            as: "purchaseRequest"
                                        }
                                },
                                {
                                    $unwind: { path: "$purchaseRequest", preserveNullAndEmptyArrays: true }
                                },
                                {
                                    $match: queryPR
                                },
                                {
                                    $unwind: { path: "$purchaseRequest.items", preserveNullAndEmptyArrays: true }
                                },
                                {
                                    $unwind: { path: "$purchaseRequest.items.purchaseOrderIds", preserveNullAndEmptyArrays: true }
                                },
                                {
                                    $project: {
                                        no: 1,
                                        date: 1,
                                        supplierCode: "$supplier.code",
                                        supplierName: "$supplier.name",
                                        prDate: "$purchaseRequest.date",
                                        prNo: "$items.prNo",
                                        prRefNo: "$items.prRefNo",
                                        unitCode: "$purchaseRequest.unit.code",
                                        unitName: "$purchaseRequest.unit.name",
                                        category: "$items.category.name",
                                        productCode: "$items.product.code",
                                        productName: "$items.product.name",
                                        remark: "$items.remark",
                                        quantity: "$items.dealQuantity",
                                        uom: "$items.dealUom.unit",
                                        budgetPrice: "$items.budgetPrice",
                                        price: { $multiply: ["$items.pricePerDealUnit", "$kursBudget.rate"] },
                                        totalBudgetPrice: { $multiply: ["$items.budgetPrice", "$purchaseRequest.items.quantity"] },
                                        totalPrice: { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$kursBudget.rate"] },
                                        overBudgetRemark: "$items.overBudgetRemark",
                                        "aEq": { "$eq": ["$items.poId", "$purchaseRequest.items.purchaseOrderIds"] },
                                        status: "$isApproved"
                                    }
                                },
                                { "$match": { "aEq": true } }
                            ])
                            .toArray()
                    );
                } else {
                    getDataPromise.push(this.collection
                        .aggregate([
                            {
                                $match: query
                            },
                            {
                                $unwind: { path: "$items", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $match: queryItem
                            },
                            {
                                $lookup:
                                    {
                                        from: "kurs-budgets",
                                        localField: "currency.code",
                                        foreignField: "code",
                                        as: "kursBudget"
                                    }
                            },
                            {
                                $unwind: { path: "$kursBudget", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $lookup:
                                    {
                                        from: "garment-purchase-requests",
                                        localField: "items.prNo",
                                        foreignField: "no",
                                        as: "purchaseRequest"
                                    }
                            },
                            {
                                $unwind: { path: "$purchaseRequest", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $match: queryPR
                            },
                            {
                                $unwind: { path: "$purchaseRequest.items", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $unwind: { path: "$purchaseRequest.items.purchaseOrderIds", preserveNullAndEmptyArrays: true }
                            },
                            {
                                $project: {
                                    no: 1,
                                    date: 1,
                                    supplierCode: "$supplier.code",
                                    supplierName: "$supplier.name",
                                    prDate: "$purchaseRequest.date",
                                    prNo: "$items.prNo",
                                    prRefNo: "$items.prRefNo",
                                    unitCode: "$purchaseRequest.unit.code",
                                    unitName: "$purchaseRequest.unit.name",
                                    category: "$items.category.name",
                                    productCode: "$items.product.code",
                                    productName: "$items.product.name",
                                    remark: "$items.remark",
                                    quantity: "$items.dealQuantity",
                                    uom: "$items.dealUom.unit",
                                    budgetPrice: "$items.budgetPrice",
                                    price: { $multiply: ["$items.pricePerDealUnit", "$kursBudget.rate"] },
                                    totalBudgetPrice: { $multiply: ["$items.budgetPrice", "$purchaseRequest.items.quantity"] },
                                    totalPrice: { $multiply: ["$items.pricePerDealUnit", "$items.dealQuantity", "$kursBudget.rate"] },
                                    overBudgetRemark: "$items.overBudgetRemark",
                                    "aEq": { "$eq": ["$items.poId", "$purchaseRequest.items.purchaseOrderIds"] },
                                    status: "$isApproved"
                                }
                            },
                            { "$match": { "aEq": true } },
                            { $skip: page * size },
                            { $limit: size }
                        ])
                        .toArray()
                    );
                }

                return Promise.all(getDataPromise);
            })
            .then(result => {
                var resCount = result[0];
                var count = resCount.length > 0 ? resCount[0].count : 0;
                var listData = result[1];
                var dataReport = [];
                var index = 0;

                for (var data of listData) {
                    index++;
                    var item = {
                        no: index,
                        poExtNo: data.no,
                        poExtDate: data.date ? moment(new Date(data.date)).add(offset, 'h').format(dateFormat) : "-",
                        supplierCode: data.supplierCode,
                        supplierName: data.supplierName,
                        prDate: data.prDate ? moment(new Date(data.prDate)).add(offset, 'h').format(dateFormat) : "-",
                        prNo: data.prNo,
                        prRefNo: data.prRefNo,
                        unit: `${data.unitCode} - ${data.unitName}`,
                        category: data.category,
                        productCode: data.productCode,
                        productName: data.productName,
                        productDesc: data.remark,
                        quantity: data.quantity,
                        uom: data.uom,
                        budgetPrice: data.budgetPrice,
                        price: data.price,
                        totalBudgetPrice: data.totalBudgetPrice,
                        totalPrice: data.totalPrice,
                        overBudgetValue: data.totalPrice - data.totalBudgetPrice,
                        overBudgetValuePercentage: this.fixDecimal(((data.totalPrice - data.totalBudgetPrice) / data.totalBudgetPrice * 100)),
                        overBudgetRemark: data.overBudgetRemark,
                        status: data.status ? "Sudah" : "Belum"
                    }
                    dataReport.push(item);
                }

                var result = {
                    data: dataReport,
                    count: dataReport.length,
                    size: size,
                    total: count,
                    page: page + 1
                };

                return Promise.resolve(result);
            })
    }

    getXlstOverBudgetReport(results, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';
        var offset = query.offset || 7;
        var dateFormat = "DD/MM/YYYY";

        for (var data of results.data) {
            var item = {
                "No": data.no,
                "No PO Eksternal": data.poExtNo,
                "Tanggal PO Eksternal": data.poExtDate,
                "Kode Supplier": data.supplierCode,
                "Nama Supplier": data.supplierName,
                "Tanggal Purchase Request": data.prDate,
                "No Purchase Request": data.prNo,
                "No Ref Purchase Request": data.prRefNo,
                "Unit": data.unit,
                "Kategori": data.category,
                "Kode Barang": data.productCode,
                "Nama Barang": data.productName,
                "Keterangan Barang": data.productDesc,
                "Jumlah Barang": data.quantity,
                "Satuan Barang": data.uom,
                "Harga Budget": data.budgetPrice,
                "Harga Beli": data.price,
                "Total Harga Budget": data.totalBudgetPrice,
                "Total Harga Beli": data.totalPrice,
                "Nilai Over Budget": data.overBudgetValue,
                "Nilai Over Budget (%)": data.overBudgetValuePercentage,
                "Keterangan Over Budget": data.overBudgetRemark,
                "Status Approve": data.status
            }
            xls.data.push(item);
        }

        var options = {
            "No": "number",
            "No PO Eksternal": "string",
            "Tanggal PO Eksternal": "string",
            "Kode Supplier": "string",
            "Nama Supplier": "string",
            "Tanggal Purchase Request": "string",
            "No Purchase Request": "string",
            "No Ref Purchase Request": "string",
            "Unit": "string",
            "Kategori": "string",
            "Kode Barang": "string",
            "Nama Barang": "string",
            "Keterangan Barang": "string",
            "Jumlah Barang": "number",
            "Satuan Barang": "string",
            "Harga Budget": "number",
            "Harga Total": "number",
            "Total Harga Budget": "number",
            "Total Harga Beli": "number",
            "Nilai Over Budget": "number",
            "Nilai Over Budget (%)": "number",
            "Keterangan Over Budget": "string",
            "Status Approve": "string"
        };
        xls.options = options;

        if (query.dateFrom && query.dateTo) {
            xls.name = `Laporan Purchase Order External Over Budget - ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Laporan Purchase Order External Over Budget - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Laporan Purchase Order External Over Budget - ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Laporan Purchase Order External Over Budget.xlsx`;

        return Promise.resolve(xls);
    }

    fixDecimal(num) {
        var count = 0;
        if (Math.floor(num) === num) count = 0
        else count = num.toString().split(".")[1].length || 0

        if (count >= 4) {
            return num.toFixed(4);
        } else {
            return num;
        }
    }
};