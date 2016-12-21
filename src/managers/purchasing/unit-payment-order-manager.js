'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var UnitPaymentOrder = DLModels.purchasing.UnitPaymentOrder;
var PurchaseOrderManager = require('./purchase-order-manager');
var UnitReceiptNoteManager = require('./unit-receipt-note-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;

module.exports = class UnitPaymentOrderManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentOrder);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.unitReceiptNote = new UnitReceiptNoteManager(db, user);
    }

    _validate(unitPaymentOrder) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unitPaymentOrder;
            var getUnitReceiptNote = [];
            if (valid) {
                for (var item of valid.items) {
                    getUnitReceiptNote.push(ObjectId.isValid(item.unitReceiptNoteId) ? this.unitReceiptNote.getSingleByIdOrDefault(item.unitReceiptNoteId) : Promise.resolve(null));
                }
            }
            var getUnitPaymentOrderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    "no": valid.no
                }, {
                    _deleted: false
                }]
            });

            Promise.all([getUnitPaymentOrderPromise].concat(getUnitReceiptNote))
                .then(results => {
                    var _module = results[0];
                    var now = new Date();
                    var getURN = results.slice(1, results.length);
                    if (!valid.divisionId)
                        errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi")); //"Unit tidak boleh kosong";
                    else if (valid.division) {
                        if (!valid.division._id)
                            errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi")); //"Unit tidak boleh kosong";
                    }
                    else if (!valid.division)
                        errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi")); //"Unit tidak boleh kosong";

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("UnitPaymentOrder.date.isRequired:%s is required", i18n.__("UnitPaymentOrder.date._:Date")); //tanggal surat perintah bayar tidak boleh kosong";

                    if (!valid.invoceNo || valid.invoceNo == '')
                        errors["invoceNo"] = i18n.__("UnitPaymentOrder.invoceNo.isRequired:%s is required", i18n.__("UnitPaymentOrder.invoceNo._:InvoceNo")); //No. surat invoice tidak boleh kosong";

                    if (!valid.invoceDate || valid.invoceDate == '')
                        errors["invoceDate"] = i18n.__("UnitPaymentOrder.invoceDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.invoceDate._:InvoceDate")); //tanggal surat invoice tidak boleh kosong";

                    if (!valid.supplierId)
                        errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    else if (valid.supplier) {
                        if (!valid.supplier._id)
                            errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    }
                    else if (!valid.supplier)
                        errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Category")); //"Category tidak boleh kosong";

                    if (!valid.categoryId)
                        errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";
                    else if (valid.category) {
                        if (!valid.supplier._id)
                            errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";
                    }
                    else if (!valid.category)
                        errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";

                    if (!valid.dueDate || valid.dueDate == '')
                        errors["dueDate"] = i18n.__("UnitPaymentOrder.dueDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.dueDate._:DueDate")); //tanggal jatuh tempo tidak boleh kosong";

                    if (!valid.paymentMethod || valid.paymentMethod == '')
                        errors["paymentMethod"] = i18n.__("UnitPaymentOrder.paymentMethod.isRequired:%s is required", i18n.__("UnitPaymentOrder.paymentMethod._:PaymentMethod")); //Term pembayaran tidak boleh kosong";

                    if (!valid.currency)
                        errors["currency"] = i18n.__("UnitPaymentOrder.currency.isRequired:%s name is required", i18n.__("UnitPaymentOrder.currency._:Currency")); //"currency tidak boleh kosong";

                    if (valid.items) {
                        if (valid.items.length <= 0) {
                            errors["items"] = i18n.__("UnitPaymentOrder.items.isRequired:%s is required", i18n.__("UnitPaymentOrder.items._:Item")); //"Harus ada minimal 1 barang";
                        }
                    }
                    else {
                        errors["items"] = i18n.__("UnitPaymentOrder.items.isRequired:%s is required", i18n.__("UnitPaymentOrder.items._:Item")); //"Harus ada minimal 1 barang";
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError ;
                        reject(new ValidationError('unitPaymentOrder does not pass validation', errors));
                    }
                    if (!valid.useVat) {
                        valid.vatNo = "";
                        valid.vatDate = null;
                        valid.vatRate = 0;
                        valid.useVat = false;
                    }
                    if (!valid.useIncomeTax) {
                        valid.incomeTaxNo = "";
                        valid.incomeTaxDate = null;
                        valid.useIncomeTax = false;
                    }
                    valid.divisionId = new ObjectId(valid.divisionId);
                    valid.division = valid.division;
                    valid.division._id = new ObjectId(valid.division._id);
                    valid.supplierId = new ObjectId(valid.supplierId);
                    valid.supplier._id = new ObjectId(valid.supplierId);
                    valid.date = new Date(valid.date);
                    valid.invoceDate = new Date(valid.invoceDate);
                    valid.dueDate = new Date(valid.dueDate);

                    if (valid.category != null) {
                        valid.categoryId = new ObjectId(valid.categoryId);
                        valid.category._id = new ObjectId(valid.category._id);
                    }
                    if (valid.currency != null) {
                        valid.currency._id = new ObjectId(valid.currency._id);
                    }
                    if (valid.vat != null) {
                        valid.vat._id = new ObjectId(valid.vat._id);
                    }

                    for (var item of valid.items) {
                        for (var _urn of getURN) {
                            if (item.unitReceiptNoteId.toString() === _urn._id.toString()) {
                                item.unitReceiptNoteId = new ObjectId(_urn._id);
                                item.unitReceiptNote = _urn;
                                break;
                            }
                        }
                    }

                    if (!valid.stamp) {
                        valid = new UnitPaymentOrder(valid);
                    }

                    valid.stamp(this.user.username, 'manager');
                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                })

        });
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};

        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterNo = {
                'no': {
                    '$regex': regex
                }
            };

            var filterSupplierName = {
                'supplier.name': {
                    '$regex': regex
                }
            };

            var filterUnitDivision = {
                "unit.division": {
                    '$regex': regex
                }
            };
            var filterUnitSubDivision = {
                "unit.subDivision": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterUnitDivision, filterUnitSubDivision]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    create(unitPaymentOrder) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitPaymentOrder)
                        .then(validUnitPaymentOrder => {
                            validUnitPaymentOrder.no = generateCode();
                            this.collection.insert(validUnitPaymentOrder)
                                .then(id => {
                                    this.updatePO(validUnitPaymentOrder)
                                        .then(result => {
                                            resolve(id);
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

    update(unitPaymentOrder) {
        return new Promise((resolve, reject) => {
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitPaymentOrder)
                        .then(validUnitPaymentOrder => {
                            this.collection.update(validUnitPaymentOrder)
                                .then(id => {
                                    this.updatePO(validUnitPaymentOrder)
                                        .then(result => {
                                            resolve(id);
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

    updatePO(validUnitPaymentOrder) {
        return new Promise((resolve, reject) => {
            var tasks = [];
            var tasksPoExternal = [];
            var getPurchaseOrderById = [];
            //update PO Internal
            for (var unitPaymentOrderItem of validUnitPaymentOrder.items) {
                for (var doItem of unitPaymentOrderItem.unitReceiptNote.deliveryOrder.items)
                    for (var fulfillment of doItem.fulfillments) {
                        if (ObjectId.isValid(fulfillment.purchaseOrder._id))
                            getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(fulfillment.purchaseOrder._id));
                    }
            }
            Promise.all(getPurchaseOrderById)
                .then(results => {
                    for (var result of results) {
                        var purchaseOrder = result;
                        for (var poItem of purchaseOrder.items) {
                            for (var unitPaymentOrderItem of validUnitPaymentOrder.items) {
                                for (var unitReceiptNoteItem of unitPaymentOrderItem.unitReceiptNote.items) {
                                    if (purchaseOrder._id.equals(unitReceiptNoteItem.purchaseOrder._id) && poItem.product._id.equals(unitReceiptNoteItem.product._id)) {
                                        for (var fulfillment of poItem.fulfillments) {
                                            var fulfillmentNo = fulfillment.unitReceiptNoteNo || '';
                                            var unitReceiptNoteNo = unitPaymentOrderItem.unitReceiptNote.no || '';
                                            if (fulfillmentNo == unitReceiptNoteNo) {
                                                fulfillment.invoiceDate = validUnitPaymentOrder.invoceDate;
                                                fulfillment.invoiceNo = validUnitPaymentOrder.invoceNo;
                                                fulfillment.interNoteDate = validUnitPaymentOrder.date;
                                                fulfillment.interNoteNo = validUnitPaymentOrder.no;
                                                fulfillment.interNoteValue = unitReceiptNoteItem.pricePerDealUnit;
                                                fulfillment.interNoteDueDate = validUnitPaymentOrder.dueDate;
                                                if (validUnitPaymentOrder.incomeTaxNo) {
                                                    fulfillment.ppnNo = validUnitPaymentOrder.incomeTaxNo;
                                                    fulfillment.ppnDate = validUnitPaymentOrder.incomeTaxDate
                                                    fulfillment.ppnValue = 0.1 * unitReceiptNoteItem.deliveredQuantity * unitReceiptNoteItem.pricePerDealUnit;
                                                }
                                                if (validUnitPaymentOrder.vatNo) {
                                                    fulfillment.pphNo = validUnitPaymentOrder.vatNo;
                                                    fulfillment.pphValue = validUnitPaymentOrder.vatRate * unitReceiptNoteItem.deliveredQuantity * unitReceiptNoteItem.pricePerDealUnit;
                                                    fulfillment.pphDate = validUnitPaymentOrder.vatDate;
                                                }
                                                break;
                                            }
                                        }
                                        purchaseOrder.status = poStatusEnum.PAYMENT;
                                        break;
                                    }

                                }
                            }
                        }
                        var isFull = true;
                        for (var poItem of purchaseOrder.items) {
                            for(var fulfillment of poItem.fulfillments)
                                {
                                    if(!fulfillment.interNoteNo || fulfillment.interNoteNo === '')
                                    {
                                        isFull=false;
                                        break;
                                    }
                                }
                                if(!isFull){
                                    break;
                                }
                        }

                        if(isFull)
                        {
                            purchaseOrder.status = poStatusEnum.COMPLETE;
                        }else{
                            if(purchaseOrder.isClosed && purchaseOrder.status.name === 'PAYMENT'){
                                purchaseOrder.status = poStatusEnum.PREMATURE;
                            }
                        }
                        tasks.push(this.purchaseOrderManager.update(purchaseOrder));
                    }
                    Promise.all(tasks)
                        .then(results => {
                            resolve(results);
                        })
                        .catch(e => {
                            reject(e);
                        })
                })
                .catch(e => {
                    reject(e);
                });

        });
    }

    delete(unitPaymentOrder) {
        return new Promise((resolve, reject) => {
            var tasks = [];
            var tasksPoExternal = [];
            var getPurchaseOrderById = [];
            this._createIndexes()
                .then((createIndexResults) => {
                    this._validate(unitPaymentOrder)
                        .then(validUnitPaymentOrder => {
                            validUnitPaymentOrder._deleted = true;
                            this.collection.update(validUnitPaymentOrder)
                                .then(id => {
                                    //update PO Internal
                                    for (var unitPaymentOrderItem of validUnitPaymentOrder.items) {
                                        for (var doItem of unitPaymentOrderItem.unitReceiptNote.deliveryOrder.items)
                                            for (var fulfillment of doItem.fulfillments) {
                                                if (ObjectId.isValid(fulfillment.purchaseOrder._id))
                                                    getPurchaseOrderById.push(this.purchaseOrderManager.getSingleById(fulfillment.purchaseOrder._id));
                                            }
                                    }
                                    Promise.all(getPurchaseOrderById)
                                        .then(results => {
                                            for (var result of results) {
                                                var purchaseOrder = result;
                                                for (var poItem of purchaseOrder.items) {
                                                    for (var unitPaymentOrderItem of validUnitPaymentOrder.items) {
                                                        for (var unitReceiptNoteItem of unitPaymentOrderItem.unitReceiptNote.items) {
                                                            if (purchaseOrder._id.equals(unitReceiptNoteItem.purchaseOrder._id) && poItem.product._id.equals(unitReceiptNoteItem.product._id)) {
                                                                for (var fulfillment of poItem.fulfillments) {
                                                                    var fulfillmentNo = fulfillment.unitReceiptNoteNo || '';
                                                                    var unitReceiptNoteNo = unitPaymentOrderItem.unitReceiptNote.no || '';
                                                                    var interNoteNo = fulfillment.interNoteNo || '';
                                                                    if (interNoteNo === validUnitPaymentOrder.no && fulfillmentNo === unitReceiptNoteNo) {
                                                                        fulfillment.invoiceDate = '';
                                                                        fulfillment.invoiceNo = '';
                                                                        fulfillment.interNoteDate = '';
                                                                        fulfillment.interNoteNo = '';
                                                                        fulfillment.interNoteValue = '';
                                                                        fulfillment.interNoteDueDate = '';
                                                                        fulfillment.ppnNo = '';
                                                                        fulfillment.ppnDate = '';
                                                                        fulfillment.ppnValue = '';
                                                                        fulfillment.ppnNo = '';
                                                                        fulfillment.pphValue = '';
                                                                        fulfillment.pphDate = '';
                                                                    }
                                                                }
                                                                break;
                                                            }

                                                        }
                                                    }
                                                }
                                                tasks.push(this.purchaseOrderManager.update(purchaseOrder));
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

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(unitPaymentOrder => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-order');
                    var definition = getDefinition(unitPaymentOrder);

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
            name: `ix_${map.purchasing.collection.UnitPaymentOrder}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.purchasing.collection.UnitPaymentOrder}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

}