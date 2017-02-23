"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var PurchaseRequest = DLModels.purchasing.PurchaseRequest;
var generateCode = require("../../utils/code-generator");
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var UnitManager = require("../master/unit-manager");
var BudgetManager = require("../master/budget-manager");
var CategoryManager = require("../master/category-manager");
var ProductManager = require("../master/product-manager");
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;

module.exports = class PurchaseRequestManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.moduleId = "PR";
        this.year = (new Date()).getFullYear().toString().substring(2, 4);
        this.collection = this.db.use(map.purchasing.collection.PurchaseRequest);

        this.unitManager = new UnitManager(db, user);
        this.budgetManager = new BudgetManager(db, user);
        this.categoryManager = new CategoryManager(db, user);
        this.productManager = new ProductManager(db, user);
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
            var filterNo = {
                "no": {
                    "$regex": regex
                }
            };

            var filterUnitDivisionName = {
                "unit.division.name": {
                    "$regex": regex
                }
            };
            var filterUnitName = {
                "unit.name": {
                    "$regex": regex
                }
            };

            var filterCategory = {
                "category.name": {
                    "$regex": regex
                }
            };
            keywordFilter['$or'] = [filterNo, filterUnitDivisionName, filterUnitName, filterCategory];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(purchaseRequest) {
        var errors = {};
        var valid = purchaseRequest;

        var getPurchaseRequestPromise = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            no: valid.no
        });

        var getUnit = ObjectId.isValid(valid.unitId) ? this.unitManager.getSingleByIdOrDefault(new ObjectId(valid.unitId)) : Promise.resolve(null);
        var getCategory = ObjectId.isValid(valid.categoryId) ? this.categoryManager.getSingleByIdOrDefault(new ObjectId(valid.categoryId)) : Promise.resolve(null);
        var getBudget = ObjectId.isValid(valid.budgetId) ? this.budgetManager.getSingleByIdOrDefault(new ObjectId(valid.budgetId)) : Promise.resolve(null);

        valid.items = valid.items instanceof Array ? valid.items : [];
        var getProducts = valid.items.map((item) => {
            return ObjectId.isValid(item.productId) ? this.productManager.getSingleByIdOrDefault(new ObjectId(item.productId)) : Promise.resolve(null);
        });

        return Promise.all([getPurchaseRequestPromise, getUnit, getCategory, getBudget].concat(getProducts))
            .then(results => {
                var _purchaseRequest = results[0];
                var _unit = results[1];
                var _category = results[2];
                var _budget = results[3];
                var _products = results.slice(4, results.length);

                if (_purchaseRequest)
                    errors["no"] = i18n.__("PurchaseRequest.no.isExists:%s is exists", i18n.__("PurchaseRequest.product._:No"));

                if (!valid.date || valid.date == "" || valid.date == "undefined")
                    errors["date"] = i18n.__("PurchaseRequest.date.isRequired:%s is required", i18n.__("PurchaseRequest.date._:Date")); //"Tanggal PR tidak boleh kosong";
                else if (valid.date > valid.expectedDeliveryDate)
                    errors["date"] = i18n.__("PurchaseRequest.date.isGreater:%s is greater than expected delivery date", i18n.__("PurchaseRequest.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";

                if (!_unit)
                    errors["unit"] = i18n.__("PurchaseRequest.unit.isRequired:%s is not exists", i18n.__("PurchaseRequest.unit._:Unit")); //"Unit tidak boleh kosong";
                else if (!valid.unitId)
                    errors["unit"] = i18n.__("PurchaseRequest.unit.isRequired:%s is required", i18n.__("PurchaseRequest.unit._:Unit")); //"Unit tidak boleh kosong";

                if (!_category)
                    errors["category"] = i18n.__("PurchaseRequest.category.isRequired:%s is not exists", i18n.__("PurchaseRequest.category._:Category")); //"Category tidak boleh kosong";
                else if (!valid.categoryId)
                    errors["category"] = i18n.__("PurchaseRequest.category.isRequired:%s is required", i18n.__("PurchaseRequest.category._:Category")); //"Category tidak boleh kosong";

                if (!_budget)
                    errors["budget"] = i18n.__("PurchaseRequest.budget.name.isRequired:%s is not exists", i18n.__("PurchaseRequest.budget.name._:Budget")); //"Budget tidak boleh kosong";
                else if (!valid.budget._id)
                    errors["budget"] = i18n.__("PurchaseRequest.budget.name.isRequired:%s is required", i18n.__("PurchaseRequest.budget.name._:Budget")); //"Budget tidak boleh kosong";

                if (!valid.expectedDeliveryDate || valid.expectedDeliveryDate === "" || valid.expectedDeliveryDate === "undefined")
                    valid.expectedDeliveryDate = "";

                if (valid.items && valid.items.length <= 0) {
                    errors["items"] = i18n.__("PurchaseRequest.items.isRequired:%s is required", i18n.__("PurchaseRequest.items._:Item")); //"Harus ada minimal 1 barang";
                }
                else {
                    var itemErrors = [];
                    var itemDuplicateErrors = [];
                    var valueArr = valid.items.map(function (item) { return item.productId.toString() });
                    var isDuplicate = valueArr.some(function (item, idx) {
                        var itemError = {};
                        if (valueArr.indexOf(item) != idx) {
                            itemError["product"] = i18n.__("PurchaseRequest.items.product.name.isDuplicate:%s is duplicate", i18n.__("PurchaseRequest.items.product.name._:Product")); //"Nama barang tidak boleh kosong";
                        }
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            itemDuplicateErrors[valueArr.indexOf(item)] = itemError;
                            itemDuplicateErrors[idx] = itemError;
                        } else {
                            itemDuplicateErrors[idx] = itemError;
                        }
                        return valueArr.indexOf(item) != idx
                    });
                    for (var item of valid.items) {
                        var itemError = {};
                        var _index = valid.items.indexOf(item);
                        if (!item.product || !item.product._id) {
                            itemError["product"] = i18n.__("PurchaseRequest.items.product.name.isRequired:%s is required", i18n.__("PurchaseRequest.items.product.name._:Product")); //"Nama barang tidak boleh kosong";
                        } else if (isDuplicate) {
                            if (Object.getOwnPropertyNames(itemDuplicateErrors[_index]).length > 0) {
                                Object.assign(itemError, itemDuplicateErrors[_index]);
                            }
                        }
                        if (item.quantity <= 0) {
                            itemError["quantity"] = i18n.__("PurchaseRequest.items.quantity.isRequired:%s is required", i18n.__("PurchaseRequest.items.quantity._:Quantity")); //Jumlah barang tidak boleh kosong";
                        }
                        itemErrors.push(itemError);
                    }

                    for (var itemError of itemErrors) {
                        if (Object.getOwnPropertyNames(itemError).length > 0) {
                            errors.items = itemErrors;
                            break;
                        }
                    }

                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid.unitId = _unit._id;
                valid.unit = _unit;

                valid.categoryId = _category._id;
                valid.category = _category;

                valid.budgetId = _budget._id;
                valid.budget = _budget;

                valid.date = new Date(valid.date);
                valid.expectedDeliveryDate = new Date(valid.expectedDeliveryDate);

                for (var prItem of valid.items) {
                    for (var _product of _products) {
                        if (prItem.product._id.toString() === _product._id.toString()) {
                            prItem.productId = _product._id;
                            prItem.product = _product;
                            prItem.uom = _product.uom;
                            break;
                        }
                    }
                }

                if (!valid.stamp)
                    valid = new PurchaseRequest(valid);

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _beforeInsert(purchaseRequest) {
        purchaseRequest.no = generateCode();
        purchaseRequest.status = prStatusEnum.CREATED;
        PurchaseRequest._createdDate = new Date();
        return Promise.resolve(purchaseRequest);
    }

    post(listPurchaseRequest) {
        var purchaseRequests = [];
        var tasks = [];
        return new Promise((resolve, reject) => {
            for (var purchaseRequest of listPurchaseRequest) {
                purchaseRequests.push(this.getSingleByIdOrDefault(purchaseRequest._id));
            }
            Promise.all(purchaseRequests)
                .then(validPurchaseRequest => {
                    for (var pr of listPurchaseRequest) {
                        for (var _pr of validPurchaseRequest) {
                            if (_pr._id.equals(pr._id)) {
                                _pr.isPosted = true;
                                _pr.status = prStatusEnum.POSTED;
                                tasks.push(this.update(_pr));
                                break;
                            }
                        }

                    }
                    Promise.all(tasks)
                        .then(result => {
                            resolve(result);
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

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(purchaseRequest => {
                    var getDefinition = require("../../pdf/definitions/purchase-request");
                    var definition = getDefinition(purchaseRequest);

                    var generatePdf = require("../../pdf/pdf-generator");
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

    getAllDataPR(filter) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});
                    query = Object.assign(query, filter);
                    query = Object.assign(query, {
                        _deleted: false
                    });

                    var _select = [
                        "no",
                        "date",
                        "expectedDeliveryDate",
                        "budget.code",
                        "unit",
                        "currency",
                        "category",
                        "remark",
                        "isPosted",
                        "isUsed",
                        "_createdBy",
                        "items.product",
                        "items.quantity",
                        "items.remark"
                    ];
                    this.collection.where(query).select(_select).execute()
                        .then((purchaseRequests) => {
                            resolve(purchaseRequests.data);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    getDataPRMonitoring(unitId, categoryId, budgetId, PRNo, dateFrom, dateTo, state, createdBy) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});

                    if (state !== -1) {
                        Object.assign(query, {
                            "status.value": state
                        });
                    }

                    if (unitId !== "undefined" && unitId !== "") {
                        Object.assign(query, {
                            unitId: new ObjectId(unitId)
                        });
                    }
                    if (categoryId !== "undefined" && categoryId !== "") {
                        Object.assign(query, {
                            categoryId: new ObjectId(categoryId)
                        });
                    }
                    if (budgetId !== "undefined" && budgetId !== "") {
                        Object.assign(query, {
                            budgetId: new ObjectId(budgetId)
                        });
                    }
                    if (PRNo !== "undefined" && PRNo !== "") {
                        Object.assign(query, {
                            "no": PRNo
                        });
                    }
                    if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null") {
                        Object.assign(query, {
                            date: {
                                $gte: new Date(dateFrom),
                                $lte: new Date(dateTo)
                            }
                        });
                    }
                    if (createdBy !== undefined && createdBy !== "") {
                        Object.assign(query, {
                            _createdBy: createdBy
                        });
                    }
                    query = Object.assign(query, {
                        _deleted: false,
                        isPosted: true
                    });

                    this.collection.find(query).toArray()
                        .then((purchaseRequests) => {
                            resolve(purchaseRequests);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    getDataPRMonitoringAllUser(unitId, categoryId, budgetId, PRNo, dateFrom, dateTo, state) {
        return this._createIndexes()
            .then((createIndexResults) => {
                return new Promise((resolve, reject) => {
                    var query = Object.assign({});

                    if (state !== -1) {
                        Object.assign(query, {
                            "status.value": state
                        });
                    }

                    if (unitId !== "undefined" && unitId !== "") {
                        Object.assign(query, {
                            unitId: new ObjectId(unitId)
                        });
                    }
                    if (categoryId !== "undefined" && categoryId !== "") {
                        Object.assign(query, {
                            categoryId: new ObjectId(categoryId)
                        });
                    }
                    if (budgetId !== "undefined" && budgetId !== "") {
                        Object.assign(query, {
                            budgetId: new ObjectId(budgetId)
                        });
                    }
                    if (PRNo !== "undefined" && PRNo !== "") {
                        Object.assign(query, {
                            "no": PRNo
                        });
                    }
                    if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null") {
                        Object.assign(query, {
                            date: {
                                $gte: new Date(dateFrom),
                                $lte: new Date(dateTo)
                            }
                        });
                    }
                    query = Object.assign(query, {
                        _deleted: false,
                        isPosted: true
                    });

                    this.collection.find(query).toArray()
                        .then((purchaseRequests) => {
                            resolve(purchaseRequests);
                        })
                        .catch(e => {
                            reject(e);
                        });
                });
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.PurchaseRequest}_date`,
            key: {
                date: -1
            }
        };

        var noIndex = {
            name: `ix_${map.purchasing.collection.PurchaseRequest}_no`,
            key: {
                no: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    unpost(purchaseRequestId) {
        return this.getSingleByIdOrDefault(purchaseRequestId)
            .then((purchaseRequest) => this.validateUnpost(purchaseRequest))
            .then((purchaseRequest) => {
                purchaseRequest.isPosted = false;
                purchaseRequest.status = prStatusEnum.CREATED;
                return this.collection
                    .updateOne({
                        _id: purchaseRequest._id
                    }, {
                        $set: purchaseRequest
                    })
                    .then((result) => Promise.resolve(purchaseRequest._id));

            })
    }

    validateUnpost(purchaseRequest) {
        var purchaseRequestError = {};
        var valid = purchaseRequest;

        return this.getSingleByIdOrDefault(valid._id)
            .then((pr) => {
                if (!pr.isPosted) {
                    purchaseRequestError["no"] = i18n.__("purchaseRequest.isPosted:%s is not yet being posted", i18n.__("purchaseRequest.isPosted._:Posted"));
                }

                if (pr.isUsed) {
                    purchaseRequestError["isUsed"] = i18n.__("purchaseRequest.isUsed:%s is already used", i18n.__("purchaseRequest.isUsed._:Used"));
                }

                if (pr.purchaseOrderIds.length > 0) {
                    purchaseRequestError["purchaseOrderIds"] = i18n.__("purchaseRequest.purchaseOrderIds:%s is already used", i18n.__("purchaseRequest.purchaseOrderIds._:Used"));
                }

                if (Object.getOwnPropertyNames(purchaseRequestError).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", purchaseRequestError));
                }

                if (!pr.stamp) {
                    pr = new PurchaseRequest(pr);
                }
                pr.stamp(this.user.username, 'manager');
                return Promise.resolve(pr);
            });
    }
};