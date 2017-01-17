'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;

// internal deps 
require('mongodb-toolkit');
var DLModels = require('dl-models');
var map = DLModels.map;
var DeliveryOrder = DLModels.purchasing.DeliveryOrder;
var PurchaseOrderManager = require('./purchase-order-manager');
var PurchaseOrderExternalManager = require('./purchase-order-external-manager');
var PurchaseRequestManager = require('./purchase-request-manager');
var i18n = require('dl-i18n');
var SupplierManager = require('../master/supplier-manager');
var prStatusEnum = DLModels.purchasing.enum.PurchaseRequestStatus;
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var generateCode = require('../../utils/code-generator');

module.exports = class DeliveryOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.DeliveryOrder);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.purchaseOrderExternalManager = new PurchaseOrderExternalManager(db, user);
        this.purchaseRequestManager = new PurchaseRequestManager(db, user);
        this.supplierManager = new SupplierManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};


        var query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");
            var filteNO = {
                'no': {
                    '$regex': regex
                }
            };
            var filterNRefNo = {
                'refNo': {
                    '$regex': regex
                }
            };
            var filterSupplierName = {
                'supplier.name': {
                    '$regex': regex
                }
            };
            var filterItem = {
                items: {
                    $elemMatch: {
                        'purchaseOrderExternal.no': {
                            '$regex': regex
                        }
                    }
                }
            };
            keywordFilter = {
                '$or': [filteNO, filterNRefNo, filterSupplierName, filterItem]
            };
        }

        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _validate(deliveryOrder) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = deliveryOrder;
            var now = new Date();

            var getDeliveryderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    },
                    _deleted: false
                }, {
                        "no": valid.no
                    }]
            });
            var getDeliveryderByRefNoPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                        "refNo": valid.refNo
                    }]
            });
            var getSupplier = valid.supplier && ObjectId.isValid(valid.supplier._id) ? this.supplierManager.getSingleByIdOrDefault(valid.supplier._id) : Promise.resolve(null);
            var getPoExternal = [];
            for (var doItem of valid.items || [])
                if (ObjectId.isValid(doItem.purchaseOrderExternal._id))
                    getPoExternal.push(this.purchaseOrderExternalManager.getSingleByIdOrDefault(doItem.purchaseOrderExternal._id));

            Promise.all([getDeliveryderPromise, getSupplier, getDeliveryderByRefNoPromise].concat(getPoExternal))
                .then(results => {
                    var _module = results[0];
                    var _supplier = results[1];
                    var _dobyRefNo = results[2];
                    var _poExternals = results.slice(3, results.length) || [];

                    if (!valid.no || valid.no === "")
                        errors["no"] = i18n.__("DeliveryOrder.no.isRequired:%s is required", i18n.__("DeliveryOrder.no._:No"));//"Nomor surat jalan tidak boleh kosong";
                    else if (_module)
                        errors["no"] = i18n.__("DeliveryOrder.no.isExists:%s is already exists", i18n.__("DeliveryOrder.no._:No"));//"Nomor surat jalan sudah terdaftar";

                    if (!valid.refNo || valid.refNo === "")
                        errors["refNo"] = i18n.__("DeliveryOrder.refNo.isRequired:%s is required", i18n.__("DeliveryOrder.refNo._:Ref No"));//"Nomor surat jalan tidak boleh kosong";
                    else if (_dobyRefNo)
                        errors["refNo"] = i18n.__("DeliveryOrder.refNo.isExists:%s is already exists", i18n.__("DeliveryOrder.refNo._:Ref No"));//"Nomor surat jalan sudah terdaftar";

                    if (!valid.date || valid.date === "")
                        errors["date"] = i18n.__("DeliveryOrder.date.isRequired:%s is required", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh kosong";
                    // else if (valid.date > now)
                    //     errors["date"] = i18n.__("DeliveryOrder.date.isGreater:%s is greater than today", i18n.__("DeliveryOrder.date._:Date"));//"Tanggal surat jalan tidak boleh lebih besar dari tanggal hari ini";
                    if (!valid.supplierDoDate || valid.supplierDoDate === "")
                        errors["supplierDoDate"] = i18n.__("DeliveryOrder.supplierDoDate.isRequired:%s is required", i18n.__("DeliveryOrder.supplierDoDate._:SupplierDoDate"));//"Tanggal surat jalan supplier tidak boleh kosong";

                    if (!valid.supplierId || valid.supplierId.toString() === "")
                        errors["supplier"] = i18n.__("DeliveryOrder.supplier.name.isRequired:%s is required", i18n.__("DeliveryOrder.supplier.name._:NameSupplier")); //"Nama supplier tidak boleh kosong";    
                    else if (!_supplier)
                        errors["supplier"] = i18n.__("DeliveryOrder.supplier.name.isRequired:%s is required", i18n.__("DeliveryOrder.supplier.name._:NameSupplier")); //"Nama supplier tidak boleh kosong";

                    if (valid.items && valid.items.length > 0) {
                        var deliveryOrderItemErrors = [];
                        var deliveryOrderItemHasError = false;
                        for (var doItem of valid.items || []) {
                            var purchaseOrderExternalItemErrors = [];
                            var purchaseOrderExternalItemHasErrors = false;
                            var purchaseOrderExternalError = {};

                            if (!doItem.purchaseOrderExternal) {
                                purchaseOrderExternalItemHasErrors = true;
                                purchaseOrderExternalError["purchaseOrderExternal"] = i18n.__("DeliveryOrder.items.purchaseOrderExternal.isRequired:%s is required", i18n.__("DeliveryOrder.items.purchaseOrderExternal._:PurchaseOrderExternal")); //"Purchase order external tidak boleh kosong";
                            } else {
                                for (var _poExternal of _poExternals) {
                                    if (_poExternal._id.toString() == doItem.purchaseOrderExternal._id.toString()) {
                                        if (!_poExternal.isPosted) {
                                            purchaseOrderExternalItemHasErrors = true;
                                            purchaseOrderExternalError["purchaseOrderExternal"] = i18n.__("DeliveryOrder.items.purchaseOrderExternal.isPosted:%s is need to be posted", i18n.__("DeliveryOrder.items.purchaseOrderExternal._:PurchaseOrderExternal"));
                                        } else if (_poExternal.isUsed) {
                                            purchaseOrderExternalItemHasErrors = true;
                                            purchaseOrderExternalError["purchaseOrderExternal"] = i18n.__("DeliveryOrder.items.purchaseOrderExternal.isUsed:%s is already closed", i18n.__("DeliveryOrder.items.purchaseOrderExternal._:PurchaseOrderExternal"));
                                        }
                                        break;
                                    }
                                }
                            }

                            for (var doFulfillment of doItem.fulfillments || []) {
                                var fulfillmentError = {};
                                if (!doFulfillment.deliveredQuantity || doFulfillment.deliveredQuantity === 0) {
                                    purchaseOrderExternalItemHasErrors = true;
                                    fulfillmentError["deliveredQuantity"] = i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity.isRequired:%s is required or not 0", i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity._:DeliveredQuantity")); //"Jumlah barang diterima tidak boleh kosong";
                                }
                                // else if (doFulfillment.deliveredQuantity > doFulfillment.purchaseOrderQuantity) {
                                //     purchaseOrderExternalItemHasErrors = true;
                                //     fulfillmentError["deliveredQuantity"] = i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity.isGreater:%s is greater than purchaseOrderQuantity", i18n.__("DeliveryOrder.items.fulfillments.deliveredQuantity._:DeliveredQuantity")); //"Jumlah barang diterima tidak boleh lebih besar dari jumlah barang di po eksternal";
                                // }
                                purchaseOrderExternalItemErrors.push(fulfillmentError);
                            }
                            if (purchaseOrderExternalItemHasErrors) {
                                deliveryOrderItemHasError = true;
                                purchaseOrderExternalError["fulfillments"] = purchaseOrderExternalItemErrors;
                            }
                            deliveryOrderItemErrors.push(purchaseOrderExternalError);
                        }
                        if (purchaseOrderExternalItemHasErrors)
                            errors["items"] = deliveryOrderItemErrors;
                    }
                    else
                        errors["items"] = i18n.__("DeliveryOrder.items.isRequired:%s is required", i18n.__("DeliveryOrder.items.name._:Items")); //"Harus ada minimal 1 nomor po eksternal";


                    // 2c. begin: check if data has any error, reject if it has.
                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.supplier = _supplier;
                    valid.supplierId = new ObjectId(valid.supplier._id);
                    valid.date = new Date(valid.date);
                    valid.supplierDoDate = new Date(valid.supplierDoDate);


                    for (var item of valid.items) {
                        for (var poExternal of _poExternals) {
                            if (item.purchaseOrderExternal._id.toString() === poExternal._id.toString()) {
                                item.purchaseOrderExternal = poExternal;
                                item.purchaseOrderExternalId = new ObjectId(poExternal._id);

                                for (var fulfillment of item.fulfillments) {
                                    for (var poInternal of poExternal.items) {
                                        if (fulfillment.purchaseOrder._id.toString() === poInternal._id.toString()) {
                                            for (var poItem of poInternal.items) {
                                                if (fulfillment.product._id.toString() === poItem.product._id.toString()) {
                                                    fulfillment.product = poItem.product;
                                                    fulfillment.productId = new ObjectId(poItem.product._id);
                                                    fulfillment.purchaseOrder = poInternal;
                                                    fulfillment.purchaseOrderId = new ObjectId(fulfillment.purchaseOrder._id);
                                                    fulfillment.purchaseOrderUom._id = new ObjectId(fulfillment.purchaseOrderUom._id);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                break;
                            }
                        }
                    }
                    if (!valid.stamp)
                        valid = new DeliveryOrder(valid);

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })
        });
    }

    create(deliveryOrder) {
        return new Promise((resolve, reject) => {
            var tasks = [];
            var tasksPoExternal = [];
            var tasksPR = [];
            var getPurchaseOrderById = [];
            var getPRById = [];

            var now = new Date();
            var stamp = now / 1000 | 0;
            var code = stamp.toString();
            this._createIndexes()
                .then((createIndexResults) => {
                    deliveryOrder.refNo = generateCode();
                    this._validate(deliveryOrder)
                        .then(validDeliveryOrder => {
                            validDeliveryOrder.supplierId = new ObjectId(validDeliveryOrder.supplierId);
                            validDeliveryOrder._createdDate = new Date();
                            //UPDATE PO INTERNAL
                            var poId = new ObjectId();
                            for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                for (var fulfillmentItem of validDeliveryOrderItem.fulfillments) {
                                    if (!poId.equals(fulfillmentItem.purchaseOrder._id)) {
                                        poId = new ObjectId(fulfillmentItem.purchaseOrder._id);
                                        if (ObjectId.isValid(fulfillmentItem.purchaseOrder._id)) {
                                            getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(fulfillmentItem.purchaseOrder._id));
                                            getPRById.push(this.purchaseRequestManager.getSingleById(fulfillmentItem.purchaseOrder.purchaseRequest._id));
                                        }
                                    }
                                }
                            }
                            Promise.all(getPurchaseOrderById)
                                .then((_purchaseOrders) => {
                                    Promise.all(getPRById)
                                        .then((_purchaseRequests) => {
                                            for (var purchaseOrder of _purchaseOrders) {
                                                for (var poItem of purchaseOrder.items) {
                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                        for (var fulfillment of validDeliveryOrderItem.fulfillments) {
                                                            if (purchaseOrder._id.equals(fulfillment.purchaseOrder._id) && poItem.product._id.equals(fulfillment.product._id)) {
                                                                var fulfillmentObj = {
                                                                    deliveryOrderNo: validDeliveryOrder.no,
                                                                    deliveryOrderDeliveredQuantity: fulfillment.deliveredQuantity,
                                                                    deliveryOrderDate: validDeliveryOrder.date,
                                                                    supplierDoDate: validDeliveryOrder.supplierDoDate
                                                                };
                                                                poItem.fulfillments.push(fulfillmentObj);

                                                                var totalRealize = 0;
                                                                for (var poItemFulfillment of poItem.fulfillments) {
                                                                    totalRealize += poItemFulfillment.deliveryOrderDeliveredQuantity;
                                                                }
                                                                poItem.realizationQuantity = totalRealize;
                                                                if (poItem.realizationQuantity === poItem.dealQuantity)
                                                                { poItem.isClosed = true; }
                                                                else
                                                                { poItem.isClosed = false; }
                                                                fulfillment.purchaseOrder = purchaseOrder;

                                                                for (var _purchaseRequest of _purchaseRequests) {
                                                                    if (_purchaseRequest._id.toString() === purchaseOrder.purchaseRequest._id.toString()) {
                                                                        for (var _prItem of _purchaseRequest.items) {
                                                                            if (_prItem.product._id.equals(fulfillment.product._id)) {
                                                                                _prItem.deliveryOrderNos.push(validDeliveryOrder.no);
                                                                                break;
                                                                            }
                                                                        }
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                for (var _poItem of purchaseOrder.items) {
                                                    if (_poItem.isClosed === false) {
                                                        purchaseOrder.isClosed = false;
                                                        purchaseOrder.status = poStatusEnum.ARRIVING;
                                                        break;
                                                    }
                                                    else
                                                        purchaseOrder.isClosed = true;
                                                    purchaseOrder.status = poStatusEnum.ARRIVED;
                                                }

                                                for (var _pr of _purchaseRequests) {
                                                    if (_pr._id.toString() === purchaseOrder.purchaseRequest._id.toString()) {
                                                        if (purchaseOrder.isClosed) {
                                                            _pr.status = prStatusEnum.COMPLETE;
                                                        }
                                                        else {
                                                            _pr.status = prStatusEnum.ARRIVING;
                                                        }
                                                        tasksPR.push(this.purchaseRequestManager.update(_pr));
                                                        break;
                                                    }
                                                }
                                                tasks.push(this.purchaseOrderManager.update(purchaseOrder));
                                            }
                                            Promise.all(tasks.concat(tasksPR))
                                                .then(results => {
                                                    //UPDATE PO EXTERNAL
                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                        var purchaseOrderExternal = validDeliveryOrderItem.purchaseOrderExternal;
                                                        getPurchaseOrderById = [];
                                                        for (var poExternalItem of purchaseOrderExternal.items) {
                                                            if (ObjectId.isValid(poExternalItem._id))
                                                                getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(poExternalItem._id));
                                                        }
                                                    }
                                                    Promise.all(getPurchaseOrderById)
                                                        .then(results => {
                                                            for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                var purchaseOrderExternal = validDeliveryOrderItem.purchaseOrderExternal;
                                                                for (var result of results) {
                                                                    for (var poExternalItem of purchaseOrderExternal.items) {
                                                                        if (ObjectId.isValid(poExternalItem._id) && poExternalItem._id.toString() === result._id.toString())
                                                                            poExternalItem = result;
                                                                        break;
                                                                    }
                                                                }
                                                                if (result.isClosed === false) {
                                                                    purchaseOrderExternal.isClosed = false;
                                                                }
                                                                else
                                                                    purchaseOrderExternal.isClosed = true;

                                                                validDeliveryOrderItem.purchaseOrderExternal = purchaseOrderExternal;
                                                                tasksPoExternal.push(this.purchaseOrderExternalManager.update(purchaseOrderExternal));
                                                            }

                                                            Promise.all(tasksPoExternal)
                                                                .then(results => {
                                                                    var getPoExternalByID = [];
                                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                        if (ObjectId.isValid(validDeliveryOrderItem.purchaseOrderExternal._id))
                                                                            getPoExternalByID.push(this.purchaseOrderExternalManager.getSingleById(validDeliveryOrderItem.purchaseOrderExternal._id));
                                                                    }
                                                                    Promise.all(getPoExternalByID)
                                                                        .then(results => {
                                                                            for (var poExternal of results) {
                                                                                for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                                    if (validDeliveryOrderItem.purchaseOrderExternal._id.equals(poExternal._id)) {
                                                                                        validDeliveryOrderItem.purchaseOrderExternal = poExternal;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                            this.collection.insert(validDeliveryOrder)
                                                                                .then(id => {
                                                                                    resolve(id);
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

    update(deliveryOrder) {
        return new Promise((resolve, reject) => {
            var tasks = [];
            var tasksPoExternal = [];
            var tasksPR = [];
            var getPurchaseOrderById = [];
            var getPRById = [];

            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(deliveryOrder)
                        .then(validDeliveryOrder => {
                            //UPDATE PO INTERNAL
                            var poId = new ObjectId();
                            for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                for (var fulfillmentItem of validDeliveryOrderItem.fulfillments) {
                                    if (!poId.equals(fulfillmentItem.purchaseOrder._id)) {
                                        poId = new ObjectId(fulfillmentItem.purchaseOrder._id);
                                        if (ObjectId.isValid(fulfillmentItem.purchaseOrder._id)) {
                                            getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(fulfillmentItem.purchaseOrder._id));
                                            getPRById.push(this.purchaseRequestManager.getSingleById(fulfillmentItem.purchaseOrder.purchaseRequest._id));
                                        }
                                    }
                                }
                            }
                            Promise.all(getPurchaseOrderById)
                                .then((_purchaseOrders) => {
                                    Promise.all(getPRById)
                                        .then((_purchaseRequests) => {
                                            for (var purchaseOrder of _purchaseOrders) {
                                                for (var poItem of purchaseOrder.items) {
                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                        for (var fulfillment of validDeliveryOrderItem.fulfillments) {
                                                            if (purchaseOrder._id.equals(fulfillment.purchaseOrder._id) && poItem.product._id.equals(fulfillment.product._id)) {

                                                                for (var poItemFulfillment of poItem.fulfillments) {
                                                                    if (poItemFulfillment.deliveryOrderNo === validDeliveryOrder.no) {
                                                                        poItemFulfillment.deliveryOrderNo = validDeliveryOrder.no;
                                                                        poItemFulfillment.deliveryOrderDeliveredQuantity = fulfillment.deliveredQuantity;
                                                                        poItemFulfillment.deliveryOrderDate = validDeliveryOrder.date;
                                                                        poItemFulfillment.supplierDoDate = validDeliveryOrder.supplierDoDate;
                                                                        break;
                                                                    }
                                                                }

                                                                var totalRealize = 0;
                                                                for (var poItemFulfillment of poItem.fulfillments) {
                                                                    totalRealize += poItemFulfillment.deliveryOrderDeliveredQuantity;
                                                                }
                                                                poItem.realizationQuantity = totalRealize;
                                                                if (poItem.realizationQuantity === poItem.dealQuantity)
                                                                    poItem.isClosed = true;
                                                                else
                                                                    poItem.isClosed = false;
                                                                fulfillment.purchaseOrder = purchaseOrder;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    for (var poItem of purchaseOrder.items) {
                                                        if (poItem.isClosed === false) {
                                                            purchaseOrder.isClosed = false;
                                                            break;
                                                        }
                                                        else
                                                            purchaseOrder.isClosed = true;
                                                    }
                                                    for (var _pr of _purchaseRequests) {
                                                        if (_pr._id.toString() === purchaseOrder.purchaseRequest._id.toString()) {
                                                            if (purchaseOrder.isClosed) {
                                                                _pr.status = prStatusEnum.COMPLETE;
                                                            }
                                                            else if (_pr.status.name !== "COMPLETE") {
                                                                _pr.status = prStatusEnum.ARRIVING;
                                                            }
                                                            tasksPR.push(this.purchaseRequestManager.update(_pr));
                                                            break;
                                                        }
                                                    }
                                                    tasks.push(this.purchaseOrderManager.update(purchaseOrder));
                                                }
                                            }
                                            Promise.all(tasks.concat(tasksPR))
                                                .then(results => {
                                                    //UPDATE PO EXTERNAL
                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                        var purchaseOrderExternal = validDeliveryOrderItem.purchaseOrderExternal;
                                                        getPurchaseOrderById = [];
                                                        for (var poExternalItem of purchaseOrderExternal.items) {
                                                            if (ObjectId.isValid(poExternalItem._id))
                                                                getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(poExternalItem._id));
                                                        }
                                                    }
                                                    Promise.all(getPurchaseOrderById)
                                                        .then(results => {
                                                            for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                var purchaseOrderExternal = validDeliveryOrderItem.purchaseOrderExternal;
                                                                for (var result of results) {
                                                                    for (var poExternalItem of purchaseOrderExternal.items) {
                                                                        if (ObjectId.isValid(poExternalItem._id) && poExternalItem._id.toString() === result._id.toString())
                                                                            poExternalItem = result;
                                                                        break;
                                                                    }
                                                                }
                                                                if (result.isClosed === false) {
                                                                    purchaseOrderExternal.isClosed = false;
                                                                }
                                                                else
                                                                    purchaseOrderExternal.isClosed = true;

                                                                validDeliveryOrderItem.purchaseOrderExternal = purchaseOrderExternal;
                                                                tasksPoExternal.push(this.purchaseOrderExternalManager.update(purchaseOrderExternal));
                                                            }

                                                            Promise.all(tasksPoExternal)
                                                                .then(results => {
                                                                    var getPoExternalByID = [];
                                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                        if (ObjectId.isValid(validDeliveryOrderItem.purchaseOrderExternal._id))
                                                                            getPoExternalByID.push(this.purchaseOrderExternalManager.getSingleById(validDeliveryOrderItem.purchaseOrderExternal._id));
                                                                    }
                                                                    Promise.all(getPoExternalByID)
                                                                        .then(results => {
                                                                            for (var poExternal of results) {
                                                                                for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                                    if (validDeliveryOrderItem.purchaseOrderExternal._id.equals(poExternal._id)) {
                                                                                        validDeliveryOrderItem.purchaseOrderExternal = poExternal;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                            this.collection.update(validDeliveryOrder)
                                                                                .then(id => {
                                                                                    resolve(id);
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

    delete(deliveryOrder) {
        return new Promise((resolve, reject) => {
            var tasks = [];
            var tasksPoExternal = [];
            var tasksPR = [];
            var getPurchaseOrderById = [];
            var getPRById = [];
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(deliveryOrder)
                        .then(validDeliveryOrder => {
                            validDeliveryOrder._deleted = true;

                            //UPDATE PO INTERNAL
                            var poId = new ObjectId();
                            for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                for (var fulfillmentItem of validDeliveryOrderItem.fulfillments) {
                                    if (!poId.equals(fulfillmentItem.purchaseOrder._id)) {
                                        poId = new ObjectId(fulfillmentItem.purchaseOrder._id);
                                        if (ObjectId.isValid(fulfillmentItem.purchaseOrder._id)) {
                                            getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(fulfillmentItem.purchaseOrder._id));
                                            getPRById.push(this.purchaseRequestManager.getSingleById(fulfillmentItem.purchaseOrder.purchaseRequest._id));
                                        }
                                    }
                                }
                            }

                            Promise.all(getPurchaseOrderById)
                                .then((_purchaseOrders) => {
                                    Promise.all(getPRById)
                                        .then((_purchaseRequests) => {
                                            for (var purchaseOrder of _purchaseOrders) {
                                                for (var poItem of purchaseOrder.items) {
                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                        for (var fulfillment of validDeliveryOrderItem.fulfillments) {
                                                            if (purchaseOrder._id.equals(fulfillment.purchaseOrder._id) && poItem.product._id.equals(fulfillment.product._id)) {
                                                                var _index;
                                                                for (var poItemFulfillment of poItem.fulfillments) {
                                                                    if (poItemFulfillment.deliveryOrderNo === validDeliveryOrder.no) {
                                                                        _index = poItem.fulfillments.indexOf(poItemFulfillment);
                                                                        break;
                                                                    }
                                                                }
                                                                if (_index != null) {
                                                                    poItem.fulfillments.splice(_index, 1);
                                                                }

                                                                var totalRealize = 0;
                                                                for (var poItemFulfillment of poItem.fulfillments) {
                                                                    totalRealize += poItemFulfillment.deliveryOrderDeliveredQuantity;
                                                                }
                                                                poItem.realizationQuantity = totalRealize;
                                                                if (poItem.realizationQuantity === poItem.dealQuantity)
                                                                    poItem.isClosed = true;
                                                                else
                                                                    poItem.isClosed = false;
                                                                fulfillment.purchaseOrder = purchaseOrder;

                                                                for (var _purchaseRequest of _purchaseRequests) {
                                                                    if (_purchaseRequest._id.toString() === purchaseOrder.purchaseRequest._id.toString()) {
                                                                        for (var _prItem of _purchaseRequest.items) {
                                                                            if (_prItem.product._id.equals(fulfillment.product._id)) {
                                                                                var _index = _prItem.deliveryOrderNos.indexOf(validDeliveryOrder.no);
                                                                                _prItem.deliveryOrderNos.splice(_index, 1);
                                                                                break;
                                                                            }
                                                                        }
                                                                        break;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                    for (var poItem of purchaseOrder.items) {
                                                        if (poItem.fulfillments.length > 0) {
                                                            purchaseOrder.status = poStatusEnum.ARRIVING;
                                                        }
                                                        else {
                                                            purchaseOrder.status = poStatusEnum.ORDERED;
                                                        }
                                                        break;
                                                    }

                                                    for (var _pr of _purchaseRequests) {
                                                        if (_pr._id.toString() === purchaseOrder.purchaseRequest._id.toString()) {
                                                            if (purchaseOrder.isClosed) {
                                                                _pr.status = prStatusEnum.COMPLETE;
                                                            }
                                                            else {
                                                                for (var _prItem of _pr.items) {
                                                                    if (_prItem.deliveryOrderNos.length > 0) {
                                                                        _pr.status = prStatusEnum.ARRIVING;
                                                                    } else {
                                                                        _pr.status = prStatusEnum.ORDERED;
                                                                    }
                                                                    break;
                                                                }
                                                            }
                                                            tasksPR.push(this.purchaseRequestManager.update(_pr));
                                                            break;
                                                        }
                                                    }
                                                    tasks.push(this.purchaseOrderManager.update(purchaseOrder));
                                                }
                                            }
                                            Promise.all(tasks.concat(tasksPR))
                                                .then(results => {
                                                    //UPDATE PO EXTERNAL
                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                        var purchaseOrderExternal = validDeliveryOrderItem.purchaseOrderExternal;
                                                        getPurchaseOrderById = [];
                                                        for (var poExternalItem of purchaseOrderExternal.items) {
                                                            if (ObjectId.isValid(poExternalItem._id))
                                                                getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(poExternalItem._id));
                                                        }
                                                    }
                                                    Promise.all(getPurchaseOrderById)
                                                        .then(results => {
                                                            for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                var purchaseOrderExternal = validDeliveryOrderItem.purchaseOrderExternal;
                                                                for (var result of results) {
                                                                    for (var poExternalItem of purchaseOrderExternal.items) {
                                                                        if (ObjectId.isValid(poExternalItem._id) && poExternalItem._id.toString() === result._id.toString())
                                                                            poExternalItem = result;
                                                                        break;
                                                                    }
                                                                }
                                                                if (result.isClosed === false) {
                                                                    purchaseOrderExternal.isClosed = false;
                                                                }
                                                                else
                                                                    purchaseOrderExternal.isClosed = true;

                                                                validDeliveryOrderItem.purchaseOrderExternal = purchaseOrderExternal;
                                                                tasksPoExternal.push(this.purchaseOrderExternalManager.update(purchaseOrderExternal));
                                                            }

                                                            Promise.all(tasksPoExternal)
                                                                .then(results => {
                                                                    var getPoExternalByID = [];
                                                                    for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                        if (ObjectId.isValid(validDeliveryOrderItem.purchaseOrderExternal._id))
                                                                            getPoExternalByID.push(this.purchaseOrderExternalManager.getSingleById(validDeliveryOrderItem.purchaseOrderExternal._id));
                                                                    }
                                                                    Promise.all(getPoExternalByID)
                                                                        .then(results => {
                                                                            for (var poExternal of results) {
                                                                                for (var validDeliveryOrderItem of validDeliveryOrder.items) {
                                                                                    if (validDeliveryOrderItem.purchaseOrderExternal._id.equals(poExternal._id)) {
                                                                                        validDeliveryOrderItem.purchaseOrderExternal = poExternal;
                                                                                        break;
                                                                                    }
                                                                                }
                                                                            }
                                                                            this.collection.update(validDeliveryOrder)
                                                                                .then(id => {
                                                                                    resolve(id);
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

    getDataDeliveryOrder(no, supplierId, dateFrom, dateTo, createdBy) {
        return new Promise((resolve, reject) => {
            var query = Object.assign({});
            var deleted = { _deleted: false };
            var _createdBy = { _createdBy: createdBy };

            if (no !== "undefined" && no !== "") {
                var _no = { no: no };
                Object.assign(query, _no);
            }
            if (supplierId !== "undefined" && supplierId !== "") {
                var _supplierId = { supplierId: new ObjectId(supplierId) };
                Object.assign(query, _supplierId);
            }
            if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null") {
                var supplierDoDate = {
                    supplierDoDate:
                    {
                        $gte: new Date(dateFrom),
                        $lte: new Date(dateTo)
                    }
                };
                Object.assign(query, supplierDoDate);
            }

            Object.assign(query, deleted, _createdBy);

            this.collection
                .where(query)
                .execute()
                .then(PurchaseOrder => {
                    resolve(PurchaseOrder.data);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.DeliveryOrder}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var refNoIndex = {
            name: `ix_${map.purchasing.collection.DeliveryOrder}_refNo`,
            key: {
                refNo: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, refNoIndex]);
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
                "_createdBy",
                "items.purchaseOrderExternal",
                "items.fulfillments.product",
                "items.fulfillments.purchaseOrderQuantity",
                "items.fulfillments.purchaseOrderUom",
                "items.fulfillments.deliveredQuantity"];

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