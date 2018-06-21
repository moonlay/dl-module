'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var PurchaseOrderManager = require('./purchase-order-manager');
var UnitPaymentCorrectionNote = DLModels.purchasing.UnitPaymentCorrectionNote;
var UnitPaymentOrder = DLModels.purchasing.UnitPaymentOrder;
var UnitPaymentOrderManager = require('./unit-payment-order-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var UnitReceiptNoteManager = require('./unit-receipt-note-manager');
var moment = require('moment');

const NUMBER_DESCRIPTION="Nota Koreksi";

module.exports = class unitPaymentPriceCorrectionNoteManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentCorrectionNote);
        this.unitPaymentOrderManager = new UnitPaymentOrderManager(db, user);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
        this.documentNumbers = this.db.collection("document-numbers");
    }

getDataKoreksiHarga(query){
        return new Promise((resolve, reject) => {
           
            var date = {
                "date" : {
                    "$gte" : (!query || !query.dateFrom ? (new Date("1900-01-01")) : (new Date(`${query.dateFrom} 00:00:00`))),
                    "$lte" : (!query || !query.dateTo ? (new Date()) : (new Date(`${query.dateTo} 23:59:59`)))
                },
                "_deleted" : false,
                // "correctionType" :"Harga Satuan"
                // "correctionType":"Harga Total"
  
                "correctionType":{$ne:"Jumlah"}
               
            };
           
        this.collection.aggregate([ 
                {"$match" : date},{"$unwind" :"$items"}
               
             ])
    
            .toArray()
            .then(result => {
                resolve(result);
            });
        });
    }
    _validate(unitPaymentQuantityCorrectionNote) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unitPaymentQuantityCorrectionNote;

            var getunitPaymentQuantityCorrectionNote = this.collection.singleOrDefault({
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

            var getUnitPaymentOrder = valid.unitPaymentOrder && ObjectId.isValid(valid.unitPaymentOrder._id) ? this.unitPaymentOrderManager.getSingleByIdOrDefault(valid.unitPaymentOrder._id) : Promise.resolve(null);

            var getPOInternal = [];
            valid.items = valid.items || [];
            var poId = new ObjectId();
            for (var _item of valid.items) {
                if (ObjectId.isValid(_item.purchaseOrderId)) {
                    if (!poId.equals(_item.purchaseOrderId)) {
                        poId = new ObjectId(_item.purchaseOrderId);
                        getPOInternal.push(this.purchaseOrderManager.getSingleByIdOrDefault(_item.purchaseOrderId));
                    }
                }
            }

            Promise.all([getunitPaymentQuantityCorrectionNote, getUnitPaymentOrder].concat(getPOInternal))
                .then(results => {
                    var _unitPaymentQuantityCorrectionNote = results[0];
                    var _unitPaymentOrder = results[1];
                    var _poInternals = results.slice(2, results.length);
                    var now = new Date();
                    if (_unitPaymentQuantityCorrectionNote)
                        errors["no"] = i18n.__("unitPaymentQuantityCorrectionNote.no.isExists:%s is already exists", i18n.__("unitPaymentQuantityCorrectionNote.no._:No"));

                    if (!_unitPaymentOrder)
                        errors["unitPaymentOrder"] = i18n.__("unitPaymentQuantityCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("unitPaymentQuantityCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    else if (!valid.unitPaymentOrderId)
                        errors["unitPaymentOrder"] = i18n.__("unitPaymentQuantityCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("unitPaymentQuantityCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    else if (valid.unitPaymentOrder) {
                        if (!valid.unitPaymentOrder._id)
                            errors["unitPaymentOrder"] = i18n.__("unitPaymentQuantityCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("unitPaymentQuantityCorrectionNote.unitPaymentOrder._:Unit Payment Order"));
                    }
                    else if (!valid.unitPaymentOrder)
                        errors["unitPaymentOrder"] = i18n.__("unitPaymentQuantityCorrectionNote.unitPaymentOrder.isRequired:%s is required", i18n.__("unitPaymentQuantityCorrectionNote.unitPaymentOrder._:Unit Payment Order"));

                    if (!valid.date || valid.date == '')
                        errors["date"] = i18n.__("unitPaymentQuantityCorrectionNote.date.isRequired:%s is required", i18n.__("unitPaymentQuantityCorrectionNote.date._:Correction Date"));

                    if (valid.items) {
                        if (valid.items.length > 0) {
                            var itemErrors = [];
                            if (!ObjectId.isValid(valid._id)) {
                                for (var item of valid.items) {
                                    var itemError = {};
                                    if (item.pricePerUnit <= 0) {
                                        itemError["pricePerUnit"] = i18n.__("unitPaymentQuantityCorrectionNote.items.pricePerUnit.isRequired:%s is required", i18n.__("unitPaymentQuantityCorrectionNote.items.pricePerUnit._:Price Per Unit"));
                                    }
                                    if (item.priceTotal <= 0) {
                                        itemError["priceTotal"] = i18n.__("unitPaymentQuantityCorrectionNote.items.priceTotal.isRequired:%s is required", i18n.__("unitPaymentQuantityCorrectionNote.items.priceTotal._:Total Price"));
                                    }
                                    for (var _unitReceiptNote of _unitPaymentOrder.items) {
                                        if (_unitReceiptNote.unitReceiptNote.no === item.unitReceiptNoteNo) {
                                            for (var _unitReceiptNoteItem of _unitReceiptNote.unitReceiptNote.items) {
                                                if (_unitReceiptNoteItem.product._id.toString() === item.product._id.toString()) {
                                                    if (_unitReceiptNoteItem.correction.length > 0) {
                                                        if (valid.correctionType === "Harga Satuan") {
                                                            if (item.pricePerUnit === _unitReceiptNoteItem.correction[_unitReceiptNoteItem.correction.length - 1].correctionPricePerUnit) {
                                                                itemError["pricePerUnit"] = i18n.__("unitPaymentQuantityCorrectionNote.items.pricePerUnit.noChanges:%s doesn't change", i18n.__("unitPaymentQuantityCorrectionNote.items.pricePerUnit._:Price Per Unit"));
                                                            }
                                                        }
                                                        else if (valid.correctionType === "Harga Total") {
                                                            if (item.priceTotal === _unitReceiptNoteItem.correction[_unitReceiptNoteItem.correction.length - 1].correctionPriceTotal) {
                                                                itemError["priceTotal"] = i18n.__("unitPaymentQuantityCorrectionNote.items.priceTotal.noChanges:%s doesn't change", i18n.__("unitPaymentQuantityCorrectionNote.items.priceTotal._:Total Price"));
                                                            }
                                                        }
                                                    } else {
                                                        if (valid.correctionType === "Harga Satuan") {
                                                            if (item.pricePerUnit === _unitReceiptNoteItem.pricePerDealUnit) {
                                                                itemError["pricePerUnit"] = i18n.__("unitPaymentQuantityCorrectionNote.items.pricePerUnit.noChanges:%s doesn't change", i18n.__("unitPaymentQuantityCorrectionNote.items.pricePerUnit._:Price Per Unit"));
                                                            }
                                                        }
                                                        else if (valid.correctionType === "Harga Total") {
                                                            if (item.priceTotal === _unitReceiptNoteItem.pricePerDealUnit * item.quantity) {
                                                                itemError["priceTotal"] = i18n.__("unitPaymentQuantityCorrectionNote.items.priceTotal.noChanges:%s doesn't change", i18n.__("unitPaymentQuantityCorrectionNote.items.priceTotal._:Total Price"));
                                                            }
                                                        }
                                                    }
                                                    break;
                                                }
                                            }
                                            break;
                                        }
                                    }
                                    itemErrors.push(itemError);
                                }
                            }
                            for (var itemError of itemErrors) {
                                for (var prop in itemError) {
                                    errors.items = itemErrors;
                                    break;
                                }
                                if (errors.items)
                                    break;
                            }
                        }
                    }
                    else {
                        errors["items"] = i18n.__("unitPaymentQuantityCorrectionNote.items.isRequired:%s is required", i18n.__("unitPaymentQuantityCorrectionNote.items._:Item"));
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        reject(new ValidationError('data does not pass validation', errors));
                    }

                    valid.unitPaymentOrderId = _unitPaymentOrder._id;
                    valid.unitPaymentOrder = _unitPaymentOrder;
                    valid.date = new Date(valid.date);

                    if (valid.invoiceCorrectionDate) {
                        valid.invoiceCorrectionDate = new Date(valid.invoiceCorrectionDate);
                    } else {
                        valid.vatTaxCorrectionDate = null;
                    }

                    if (valid.incomeTaxCorrectionDate) {
                        valid.incomeTaxCorrectionDate = new Date(valid.incomeTaxCorrectionDate);
                    } else {
                        valid.vatTaxCorrectionDate = null;
                    }

                    if (valid.vatTaxCorrectionDate) {
                        valid.vatTaxCorrectionDate = new Date(valid.vatTaxCorrectionDate);
                    } else {
                        valid.vatTaxCorrectionDate = null;
                    }

                    for (var item of valid.items) {
                        for (var _unitPaymentOrderItem of _unitPaymentOrder.items) {
                            for (var _unitReceiptNoteItem of _unitPaymentOrderItem.unitReceiptNote.items) {
                                var _purchaseOrderId = new ObjectId(item.purchaseOrderId);
                                var _productId = new ObjectId(item.productId);

                                if (_purchaseOrderId.equals(_unitReceiptNoteItem.purchaseOrder._id) && _productId.equals(_unitReceiptNoteItem.product._id)) {
                                    for (var _poInternal of _poInternals) {
                                        if (_poInternal._id.equals(_unitReceiptNoteItem.purchaseOrder._id)) {
                                            item.purchaseOrderId = new ObjectId(_poInternal._id);
                                            item.purchaseOrder = _poInternal;
                                            item.productId = new ObjectId(_unitReceiptNoteItem.product._id);
                                            item.product = _unitReceiptNoteItem.product;
                                            item.product._id = new ObjectId(_unitReceiptNoteItem.product._id);
                                            item.uom = _unitReceiptNoteItem.deliveredUom;
                                            item.uomId = new ObjectId(_unitReceiptNoteItem.deliveredUom._id);
                                            item.uom._id = new ObjectId(_unitReceiptNoteItem.deliveredUom._id);
                                            item.currency = _unitReceiptNoteItem.currency;
                                            item.currencyRate = Number(_unitReceiptNoteItem.currencyRate);
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        item.quantity = Number(item.quantity);
                        item.pricePerUnit = Number(item.pricePerUnit);
                        item.priceTotal = Number(item.priceTotal);
                    }

                    if (!valid.stamp)
                        valid = new UnitPaymentCorrectionNote(valid);

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
            _deleted: false,
            $or: [
                { correctionType: "Harga Satuan" },
                { correctionType: "Harga Total" }
            ]
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

            var filterSupplierName = {
                'unitPaymentOrder.supplier.name': {
                    '$regex': regex
                }
            };

            var filterUnitCoverLetterNo = {
                "unitCoverLetterNo": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterUnitCoverLetterNo]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
    }

    pdf(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(unitPaymentQuantityCorrectionNote => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-correction-note');

                    var _unitReceiptNotes = unitPaymentQuantityCorrectionNote.unitPaymentOrder.items.map((upoItem) => {
                        return upoItem.unitReceiptNote.items.map((item) => {
                            return {
                                productId: item.product._id,
                                purchaseOrderId: item.purchaseOrderId,
                                correction: item.correction
                            }
                        })
                    });
                    var pos = unitPaymentQuantityCorrectionNote.items.map((_item) => {
                        return _item.purchaseOrder.items.map((item) => {
                            return {
                                productId: item.product._id,
                                purchaseOrderId: _item.purchaseOrderId,
                                pricePerDealUnit: item.pricePerDealUnit
                            }
                        })
                    });

                    _unitReceiptNotes = [].concat.apply([], _unitReceiptNotes);
                    pos = [].concat.apply([], pos);
                    for (var _item of unitPaymentQuantityCorrectionNote.items) {
                        var pricePerUnit = 0, priceTotal = 0;
                        var unitReceiptNote = _unitReceiptNotes.find((unitReceiptNote) => unitReceiptNote.productId.toString() === _item.productId.toString() && unitReceiptNote.purchaseOrderId.toString() === _item.purchaseOrderId.toString());
                        var po = pos.find((unitReceiptNote) => unitReceiptNote.productId.toString() === _item.productId.toString() && unitReceiptNote.purchaseOrderId.toString() === _item.purchaseOrderId.toString());

                        if (unitReceiptNote.correction.length > 1) {
                            if (unitPaymentQuantityCorrectionNote.correctionType === "Harga Satuan") {
                                pricePerUnit = _item.pricePerUnit - unitReceiptNote.correction[unitReceiptNote.correction.length - 2].correctionPricePerUnit;
                                priceTotal = pricePerUnit * _item.quantity;
                            }
                            else if (unitPaymentQuantityCorrectionNote.correctionType === "Harga Total") {
                                pricePerUnit = _item.pricePerUnit;
                                priceTotal = (_item.priceTotal) - (_item.quantity * unitReceiptNote.correction[unitReceiptNote.correction.length - 2].correctionPricePerUnit);
                            }
                        } else {
                            if (unitPaymentQuantityCorrectionNote.correctionType === "Harga Satuan") {
                                pricePerUnit = _item.pricePerUnit - po.pricePerDealUnit;
                                priceTotal = pricePerUnit * _item.quantity;
                            }
                            else if (unitPaymentQuantityCorrectionNote.correctionType === "Harga Total") {
                                pricePerUnit = _item.pricePerUnit;
                                priceTotal = (_item.priceTotal) - (_item.quantity * po.pricePerDealUnit);
                            }
                        }

                        _item.pricePerUnit = pricePerUnit;
                        _item.priceTotal = priceTotal;

                    }
                    var definition = getDefinition(unitPaymentQuantityCorrectionNote, offset);
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

    pad(number, length) {

        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }

        return str;
    }

    _beforeInsert(unitPaymentPriceCorrectionNote) {
        var monthNow = moment(unitPaymentPriceCorrectionNote.date).format("MM");
        var yearNow = parseInt(moment(unitPaymentPriceCorrectionNote.date).format("YY"));
        var code="";
        // var unitCode=unitPaymentPriceCorrectionNote.unitPaymentOrder ? unitPaymentPriceCorrectionNote.unitPaymentOrder.division.code : "";
        if(unitPaymentPriceCorrectionNote && unitPaymentPriceCorrectionNote.unitPaymentOrder){
            code= unitPaymentPriceCorrectionNote.unitPaymentOrder.supplier.import ? "NRI" : "NRL";
        }
        var division="";
        if(unitPaymentPriceCorrectionNote.unitPaymentOrder && unitPaymentPriceCorrectionNote.unitPaymentOrder.division){
            if(unitPaymentPriceCorrectionNote.unitPaymentOrder.division.name=="GARMENT"){
                division="-G";
            }
            else if(unitPaymentPriceCorrectionNote.unitPaymentOrder.division.name=="UMUM" || unitPaymentPriceCorrectionNote.unitPaymentOrder.division.name=="SPINNING" || unitPaymentPriceCorrectionNote.unitPaymentOrder.division.name=="FINISHING & PRINTING" || unitPaymentPriceCorrectionNote.unitPaymentOrder.division.name=="UTILITY"|| unitPaymentPriceCorrectionNote.unitPaymentOrder.division.name=="WEAVING"){
                division="-T";
            }
        }
        var type = code+monthNow+yearNow+division;
        var query = { "type": type, "description": NUMBER_DESCRIPTION };
        var fields = { "number": 1, "year": 1 };

        return this.documentNumbers
            .findOne(query, fields)
            .then((previousDocumentNumber) => {

                var number = 1;

                if (!unitPaymentPriceCorrectionNote.no) {
                    if (previousDocumentNumber) {
                        var oldYear = previousDocumentNumber.year;
                        number = yearNow > oldYear ? number : previousDocumentNumber.number + 1;

                        unitPaymentPriceCorrectionNote.no = `${yearNow}-${monthNow}${division}-${code}-${this.pad(number, 4)}`;
                    } else {
                        unitPaymentPriceCorrectionNote.no = `${yearNow}-${monthNow}${division}-${code}-0001`;
                    }
                }

                var documentNumbersData = {
                    type: type,
                    documentNumber: unitPaymentPriceCorrectionNote.no,
                    number: number,
                    year: yearNow,
                    description: NUMBER_DESCRIPTION
                };

                var options = { "upsert": true };

                return this.documentNumbers
                    .updateOne(query, documentNumbersData, options)
                    .then((id) => {
                        if (unitPaymentPriceCorrectionNote.unitPaymentOrder.useIncomeTax)
                             unitPaymentPriceCorrectionNote.returNoteNo = generateCode("returCode");
                        return Promise.resolve(unitPaymentPriceCorrectionNote);
                    })
            })
        // unitPaymentPriceCorrectionNote.no = generateCode("correctionQuantity");
        // if (unitPaymentPriceCorrectionNote.unitPaymentOrder.useIncomeTax)
        //     unitPaymentPriceCorrectionNote.returNoteNo = generateCode("returCode");
        // return Promise.resolve(unitPaymentPriceCorrectionNote)
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((unitPaymentQuantityCorrectionNote) => this.updatePurchaseOrder(unitPaymentQuantityCorrectionNote))
            .then((unitPaymentQuantityCorrectionNote) => this.updateUnitReceiptNote(unitPaymentQuantityCorrectionNote))
            .then((unitPaymentQuantityCorrectionNote) => this.updateUnitPaymentOrder(unitPaymentQuantityCorrectionNote))
            .then(() => {
                return this.syncItems(id);
            })
    }

    updatePurchaseOrder(unitPaymentQuantityCorrectionNote) {
        var correctionItems = unitPaymentQuantityCorrectionNote.items.map((item) => {
            return {
                purchaseOrderId: item.purchaseOrderId,
                productId: item.productId,
                quantity: item.quantity,
                priceTotal: item.priceTotal,
                currency: item.currency,
                unitReceiptNoteNo: item.unitReceiptNoteNo
            }
        })
        correctionItems = [].concat.apply([], correctionItems);

        var map = new Map();
        for (var correction of correctionItems) {
            var key = correction.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(correction);
        }

        var jobs = [];
        map.forEach((corrections, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var correction of corrections) {
                        var productId = correction.productId;
                        var poItem = purchaseOrder.items.find(item => item.product._id.toString() === productId.toString());
                        var fulfillment = poItem.fulfillments.find((fulfillment) => correction.unitReceiptNoteNo === fulfillment.unitReceiptNoteNo && unitPaymentQuantityCorrectionNote.unitPaymentOrder.no === fulfillment.interNoteNo)

                        if (fulfillment) {
                            if (!fulfillment.correction) {
                                fulfillment.correction = [];
                            }

                            var correctionPriceTotal = 0;
                            if (fulfillment.correction.length > 0) {
                                var lastPriceTotal = fulfillment.correction[fulfillment.correction.length - 1].correctionPriceTotal;
                                correctionPriceTotal = (correction.priceTotal * correction.currency.rate) - lastPriceTotal;
                            } else {
                                correctionPriceTotal = (correction.priceTotal * correction.currency.rate) - (correction.quantity * poItem.pricePerDealUnit * correction.currency.rate);
                            }

                            var _correction = {};
                            _correction.correctionDate = unitPaymentQuantityCorrectionNote.date;
                            _correction.correctionNo = unitPaymentQuantityCorrectionNote.no;
                            _correction.correctionQuantity = Number(correction.quantity);
                            _correction.correctionPriceTotal = Number(correctionPriceTotal);
                            _correction.correctionRemark = `Koreksi ${unitPaymentQuantityCorrectionNote.correctionType}`;
                            fulfillment.correction.push(_correction);
                        }
                    }
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitPaymentQuantityCorrectionNote);
        })
    }

    updateUnitReceiptNote(unitPaymentQuantityCorrectionNote) {
        var urnIds = unitPaymentQuantityCorrectionNote.unitPaymentOrder.items.map((upoItem) => upoItem.unitReceiptNoteId);
        var realizations = unitPaymentQuantityCorrectionNote.items.map((item) => {
            return {
                purchaseOrderId: item.purchaseOrderId,
                productId: item.productId,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                priceTotal: item.priceTotal,
                currency: item.currency,
                unitReceiptNoteNo: item.unitReceiptNoteNo
            }
        })
        realizations = [].concat.apply([], realizations);

        var jobs = [];
        for (var urnId of urnIds) {
            var job = this.unitReceiptNoteManager.getSingleById(urnId)
                .then((unitReceiptNote) => {
                    return Promise.all(unitReceiptNote.items.map((item) => {
                        return this.purchaseOrderManager.getSingleById(item.purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {
                            for (var item of unitReceiptNote.items) {
                                var realization = realizations.find((_realization) => _realization.productId.toString() === item.product._id.toString() && _realization.purchaseOrderId.toString() === item.purchaseOrderId.toString() && _realization.unitReceiptNoteNo === unitReceiptNote.no);
                                if (realization) {
                                    var _correction = {
                                        correctionDate: unitPaymentQuantityCorrectionNote.date,
                                        correctionNo: unitPaymentQuantityCorrectionNote.no,
                                        correctionQuantity: Number(realization.quantity),
                                        correctionPricePerUnit: Number(realization.pricePerUnit),
                                        correctionPriceTotal: Number(realization.priceTotal),
                                        correctionRemark: `Koreksi ${unitPaymentQuantityCorrectionNote.correctionType}`
                                    };
                                    item.correction.push(_correction);
                                }
                                var purchaseOrder = purchaseOrders.find((_purchaseOrder) => _purchaseOrder._id.toString() === item.purchaseOrderId.toString());
                                if (purchaseOrder) {
                                    item.purchaseOrder = purchaseOrder;
                                }
                            }
                            return this.unitReceiptNoteManager.updateCollectionUnitReceiptNote(unitReceiptNote);
                        })
                })
            jobs.push(job);
        }

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(unitPaymentQuantityCorrectionNote);
        })
    }

    updateUnitPaymentOrder(unitPaymentQuantityCorrectionNote) {
        var unitPaymentOrder = unitPaymentQuantityCorrectionNote.unitPaymentOrder;
        var getUnitReceiptNotes = unitPaymentOrder.items.map((unitPaymentOrderItem) => {
            return this.unitReceiptNoteManager.getSingleById(unitPaymentOrderItem.unitReceiptNoteId)
        })
        return this.unitPaymentOrderManager.getSingleByIdOrDefault(unitPaymentOrder._id)
            .then((_unitPaymentOrder) => {
                return Promise.all(getUnitReceiptNotes)
                    .then((unitReceiptNotes) => {
                        for (var unitPaymentOrderItem of _unitPaymentOrder.items) {
                            var _unitReceiptNote = unitReceiptNotes.find((unitReceiptNote) => unitPaymentOrderItem.unitReceiptNoteId.toString() === unitReceiptNote._id.toString())
                            if (_unitReceiptNote) {
                                unitPaymentOrderItem.unitReceiptNote = _unitReceiptNote;
                            }
                        }
                        if (!_unitPaymentOrder.stamp) {
                            _unitPaymentOrder = new UnitPaymentOrder(_unitPaymentOrder);
                        }
                        _unitPaymentOrder.stamp(this.user.username, 'manager');
                        return this.unitPaymentOrderManager.collection.update(_unitPaymentOrder)
                    })
                    .then((results) => {
                        return Promise.resolve(unitPaymentQuantityCorrectionNote);
                    })
            })

    }

    syncItems(id) {
        var query = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
        };
        return this.getSingleByQuery(query)
            .then((unitPaymentQuantityCorrectionNote) => {
                var realizations = unitPaymentQuantityCorrectionNote.items.map((item) => { return item.purchaseOrderId });
                realizations = [].concat.apply([], realizations);

                var _listPO = realizations.filter(function (elem, index, self) {
                    return index == self.indexOf(elem);
                })

                var jobGetPurchaseOrders = _listPO.map((po) => { return this.purchaseOrderManager.getSingleById(po) });

                return Promise.all(jobGetPurchaseOrders)
                    .then((purchaseOrders) => {
                        return this.unitPaymentOrderManager.getSingleById(unitPaymentQuantityCorrectionNote.unitPaymentOrderId)
                            .then((unitPaymentOrder) => {
                                unitPaymentQuantityCorrectionNote.unitPaymentOrder = unitPaymentOrder;
                                for (var item of unitPaymentQuantityCorrectionNote.items) {
                                    var _purchaseOrder = purchaseOrders.find((purchaseOrder) => purchaseOrder._id.toString() === item.purchaseOrderId.toString());
                                    if (_purchaseOrder) {
                                        item.purchaseOrder = _purchaseOrder;
                                    }
                                }
                                return this.collection
                                    .updateOne({
                                        _id: unitPaymentQuantityCorrectionNote._id
                                    }, {
                                        $set: unitPaymentQuantityCorrectionNote
                                    })
                                    .then((result) => Promise.resolve(unitPaymentQuantityCorrectionNote._id));
                            })
                    })
            })
    }

getXls(result, query){
         var xls = {};
         xls.data = [];
         xls.options = [];
         xls.name = '';

         var index = 0;
         var dateFormat = "DD/MM/YYYY";

         for(var corhrg of result.data){
            index++;
             var item = {};
             item["NO"] = index;
             item["NOMOR"] = corhrg.no ? corhrg.no : '';
             item["TANGGAL"] = corhrg.date ? moment(new Date(corhrg.date)).format(dateFormat) : '';
             item["NO SPB"] = corhrg.unitPaymentOrder? corhrg.unitPaymentOrder.no : '';
             item["NO PO EXTERNAL"] = corhrg.items.purchaseOrder.purchaseOrderExternal? corhrg.items.purchaseOrder.purchaseOrderExternal.no : '';
             item["NO PURCHASE REQUEST"] = corhrg.items.purchaseOrder.purchaseRequest? corhrg.items.purchaseOrder.purchaseRequest.no : '';
             item["FAKTUR PAJAK PPN"] = corhrg.incomeTaxCorrectionNo? corhrg.incomeTaxCorrectionNo : '';
             item["TANGGAL FAKTUR PAJAK PPN"] = corhrg.incomeTaxCorrectionDate? moment(new Date(corhrg.incomeTaxCorrectionDate)).format(dateFormat) : '';
              item["CODE SUPPLIER"] = corhrg.unitPaymentOrder.supplier? corhrg.unitPaymentOrder.supplier.code : '';
             item["SUPPLIER"] = corhrg.unitPaymentOrder.supplier? corhrg.unitPaymentOrder.supplier.name : '';
             item["JENIS KOREKSI"] = corhrg.correctionType? corhrg.correctionType : '';
             item["KODE"] = corhrg.items.product? corhrg.items.product.code : '';
             item["NAMA"] = corhrg.items.product? corhrg.items.product.name : '';

                var k= corhrg.items.quantity.toFixed(2).toString().split('.');
                var k1=k[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                var quantity= k1 + '.' + k[1];

             item["JUMLAH"] = quantity;
             item["SATUAN"] = corhrg.items.uom.unit? corhrg.items.uom.unit : '';

                var a= corhrg.items.pricePerUnit.toFixed(4).toString().split('.');
                var a1=a[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                var harga= a1 + '.' + a[1];

                var g= corhrg.items.priceTotal.toFixed(2).toString().split('.');
                var g1=g[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                var total= g1 + '.' + g[1];

             item["HARGA SATUAN"] = harga;
             item["HARGA TOTAL"] = total;
             item["USER INPUT"] = corhrg._createdBy? corhrg._createdBy : '';
             item["MATA UANG"] = corhrg.items.currency? corhrg.items.currency.code : '';
             item["KATEGORI"] = corhrg.unitPaymentOrder.category? corhrg.unitPaymentOrder.category.name : '';
                 if(corhrg.useIncomeTax==true){
                    var z =( (corhrg.items.quantity * corhrg.items.pricePerUnit)/10).toFixed(2).toString().split('.'); 
                    var z1=z[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    var ppn= z1 + '.' + z[1];
                    item["PPN"] =ppn;
                    }else{
                    item["PPN"] =0;
                    }
             xls.data.push(item);
         }

         xls.options["NO"] = "number";
         xls.options["NOMOR"] = "string";
         xls.options["TANGGAL"] = "date";
         xls.options["NO SPB"] = "string";
         xls.options["NO PO EXTERNAL"] = "string";
         xls.options["NO PURCHASE REQUEST"] = "string";
         xls.options["FAKTUR PAJAK PPN"] = "string";
         xls.options["TANGGAL FAKTUR PAJAK PPN"] = "string";
         xls.options["CODE SUPPLIER"] = "string";
         xls.options["SUPPLIER"] = "string";
         xls.options["JENIS KOREKSI"] = "string";
         xls.options["KODE"] = "string";
         xls.options["NAMA"] = "string";
         xls.options["JUMLAH"] = "number";
         xls.options["SATUAN"] = "string";
         xls.options["HARGA SATUAN"] = "number";
         xls.options["HARGA TOTAL"] = "number";
         xls.options["USER INPUT"] = "string";
         xls.options["MATA UANG"] = "string";
         xls.options["KATEGORI"] = "string";
         xls.options["PPN"] = "number";
         if(query.dateFrom && query.dateTo){
             xls.name = `Monitoring Koreksi Harga ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
         }
         
         return Promise.resolve(xls);
     }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.purchasing.collection.UnitPaymentCorrectionNote}_date`,
            key: {
                date: -1
            }
        }

        var noIndex = {
            name: `ix_${map.purchasing.collection.UnitPaymentCorrectionNote}_no`,
            key: {
                no: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    _getQueryAllUnitPaymentCorrection(paging) {
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

            var filterSupplierName = {
                'unitPaymentOrder.supplier.name': {
                    '$regex': regex
                }
            };

            var filterUnitCoverLetterNo = {
                "unitCoverLetterNo": {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterNo, filterSupplierName, filterUnitCoverLetterNo]
            };
        }
        query = {
            '$and': [deletedFilter, paging.filter, keywordFilter]
        }
        return query;
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
                        "correctionType",
                        "unitPaymentOrder.no",
                        "invoiceCorrectionNo",
                        "invoiceCorrectionDate",
                        "incomeTaxCorrectionNo",
                        "incomeTaxCorrectionDate",
                        "vatTaxCorrectionNo",
                        "vatTaxCorrectionDate",
                        "unitPaymentOrder.supplier",
                        "unitPaymentOrder.items.unitReceiptNote.no",
                        "unitPaymentOrder.items.unitReceiptNote.date",
                        "unitPaymentOrder.items.unitReceiptNote.items.purchaseOrder._id",
                        "releaseOrderNoteNo",
                        "remark",
                        "_createdBy",
                        "items.purchaseOrder._id",
                        "items.purchaseOrder.purchaseOrderExternal.no",
                        "items.purchaseOrder.purchaseRequest.no",
                        "items.product",
                        "items.quantity",
                        "items.uom",
                        "items.pricePerUnit",
                        "items.currency",
                        "items.priceTotal",
                        "useIncomeTax",
                        "useVat"
                    ];

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
}