'use strict'
var ObjectId = require("mongodb").ObjectId;
require('mongodb-toolkit');
var DLModels = require('dl-models');
var assert = require('assert');
var map = DLModels.map;
var i18n = require('dl-i18n');
var UnitPaymentOrder = DLModels.purchasing.UnitPaymentOrder;
var UnitReceiptNote = DLModels.purchasing.UnitReceiptNote;
var PurchaseOrderManager = require('./purchase-order-manager');
var UnitReceiptNoteManager = require('./unit-receipt-note-manager');
var BaseManager = require('module-toolkit').BaseManager;
var generateCode = require('../../utils/code-generator');
var poStatusEnum = DLModels.purchasing.enum.PurchaseOrderStatus;
var moment = require('moment');

const NUMBER_DESCRIPTION = "Surat Perintah Bayar";

module.exports = class UnitPaymentOrderManager extends BaseManager {

    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.purchasing.collection.UnitPaymentOrder);
        this.purchaseOrderManager = new PurchaseOrderManager(db, user);
        this.unitReceiptNoteManager = new UnitReceiptNoteManager(db, user);
        this.documentNumbers = this.db.collection("document-numbers");
        this.unitReceiptNoteFields = ["no",
            "date",
            "deliveryOrder.no",
            "items.product._id",
            "items.product.code",
            "items.product.name",
            "items.deliveredQuantity",
            "items.deliveredUom._id",
            "items.deliveredUom.unit",
            "items.pricePerDealUnit",
            "items.currency._id",
            "items.currency.code",
            "items.currency.symbol",
            "items.currency.rate",
            "items.currencyRate",
            "items.correction",
            "items.purchaseOrderId",
            "items.purchaseOrder._id",
            "items.purchaseOrder.purchaseOrderExternal.paymentDueDays",
            "items.purchaseOrder.purchaseOrderExternal.no",
            "items.purchaseOrder.purchaseOrderExternal._id",
            "items.purchaseOrder.currency._id",
            "items.purchaseOrder.currency.symbol",
            "items.purchaseOrder.currency.code",
            "items.purchaseOrder.currency.rate",
            "items.purchaseOrder.categoryId",
            "items.purchaseOrder.category._id",
            "items.purchaseOrder.purchaseRequest.no",
            "items.purchaseOrder.purchaseRequest._id",
            "items.purchaseOrder.items.useIncomeTax",
            "items.purchaseOrder.items.product._id",
            "items.purchaseOrder.items.product.code",
            "items.purchaseOrder.items.product.name"];
    }

    _validate(unitPaymentOrder) {
        var errors = {};
        return new Promise((resolve, reject) => {
            var valid = unitPaymentOrder || {};
            var getUnitReceiptNote = [];
            if (Object.getOwnPropertyNames(valid).length > 0) {
                for (var item of valid.items) {
                    getUnitReceiptNote.push(ObjectId.isValid(item.unitReceiptNoteId) ? this.unitReceiptNoteManager.getSingleByIdOrDefault(item.unitReceiptNoteId, this.unitReceiptNoteFields) : Promise.resolve(null));
                }
            }
            var getUnitPaymentOrderPromise = this.collection.singleOrDefault({
                "$and": [{
                    _id: {
                        '$ne': new ObjectId(valid._id)
                    }
                }, {
                    "no": valid.no
                }]
            });

            Promise.all([getUnitPaymentOrderPromise].concat(getUnitReceiptNote))
                .then(results => {
                    var _module = results[0];
                    var now = new Date();
                    var getURN = results.slice(1, results.length);

                    if (_module) {
                        errors["no"] = i18n.__("UnitPaymentOrder.no.isExist:%s is exist", i18n.__("UnitPaymentOrder.no._:No"));
                    }

                    if (!valid.divisionId) {
                        errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi"));
                    }
                    else if (valid.division) {
                        if (!valid.division._id)
                            errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi")); //"Unit tidak boleh kosong";
                    }
                    else if (!valid.division) {
                        errors["division"] = i18n.__("UnitPaymentOrder.division.isRequired:%s is required", i18n.__("UnitPaymentOrder.division._:Divisi")); //"Unit tidak boleh kosong";
                    }

                    if (!valid.date || valid.date == '') {
                        errors["date"] = i18n.__("UnitPaymentOrder.date.isRequired:%s is required", i18n.__("UnitPaymentOrder.date._:Date")); //tanggal surat perintah bayar tidak boleh kosong";
                    }

                    if (!valid.invoceNo || valid.invoceNo == '') {
                        errors["invoceNo"] = i18n.__("UnitPaymentOrder.invoceNo.isRequired:%s is required", i18n.__("UnitPaymentOrder.invoceNo._:InvoceNo")); //No. surat invoice tidak boleh kosong";
                    }
                    if (!valid.invoceDate || valid.invoceDate == '') {
                        errors["invoceDate"] = i18n.__("UnitPaymentOrder.invoceDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.invoceDate._:InvoceDate")); //tanggal surat invoice tidak boleh kosong";
                    }
                    if (!valid.supplierId) {
                        errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    }
                    else if (valid.supplier) {
                        if (!valid.supplier._id)
                            errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Supplier")); //"Nama supplier tidak boleh kosong";
                    }
                    else if (!valid.supplier) {
                        errors["supplier"] = i18n.__("UnitPaymentOrder.supplier.isRequired:%s name is required", i18n.__("UnitPaymentOrder.supplier._:Category")); //"Category tidak boleh kosong";
                    }
                    if (!valid.categoryId) {
                        errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";
                    }
                    else if (valid.category) {
                        if (!valid.supplier._id)
                            errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";
                    }
                    else if (!valid.category) {
                        errors["category"] = i18n.__("UnitPaymentOrder.category.isRequired:%s name is required", i18n.__("UnitPaymentOrder.category._:Category")); //"Category tidak boleh kosong";
                    }
                    // if (!valid.dueDate || valid.dueDate == '') {
                    //     errors["dueDate"] = i18n.__("UnitPaymentOrder.dueDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.dueDate._:DueDate")); //tanggal jatuh tempo tidak boleh kosong";
                    // }
                    if (!valid.paymentMethod || valid.paymentMethod == '') {
                        errors["paymentMethod"] = i18n.__("UnitPaymentOrder.paymentMethod.isRequired:%s is required", i18n.__("UnitPaymentOrder.paymentMethod._:PaymentMethod")); //Term pembayaran tidak boleh kosong";
                    }
                    if (!valid.currency) {
                        errors["currency"] = i18n.__("UnitPaymentOrder.currency.isRequired:%s name is required", i18n.__("UnitPaymentOrder.currency._:Currency")); //"currency tidak boleh kosong";
                    }
                    // if (valid.useVat) {
                    //     if (valid.vat) {
                    //         if (!valid.vat._id) {
                    //             errors["vat"] = i18n.__("UnitPaymentOrder.vat.isRequired:%s name is required", i18n.__("UnitPaymentOrder.vat._:Jenis PPh"));
                    //         }
                    //     } else {
                    //         errors["vat"] = i18n.__("UnitPaymentOrder.vat.isRequired:%s name is required", i18n.__("UnitPaymentOrder.vat._:Jenis PPh"));
                    //     }

                    //     if (!valid.vatNo || valid.vatNo == '') {
                    //         errors["vatNo"] = i18n.__("UnitPaymentOrder.vatNo.isRequired:%s is required", i18n.__("UnitPaymentOrder.vatNo._:Nomor Faktur Pajak (PPh)"));
                    //     }

                    if (!valid.vatDate || valid.vatDate == '' || valid.vatDate === "undefined") {
                        // errors["vatDate"] = i18n.__("UnitPaymentOrder.vatDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.vatDate._:Tanggal Faktur Pajak (PPh)"));
                        valid.vatDate = "";
                    }
                    // }
                    if (valid.useIncomeTax) {
                        if (!valid.incomeTaxNo || valid.incomeTaxNo == '') {
                            errors["incomeTaxNo"] = i18n.__("UnitPaymentOrder.incomeTaxNo.isRequired:%s is required", i18n.__("UnitPaymentOrder.incomeTaxNo._:Nomor Faktur Pajak (PPn)"));
                        }

                        if (!valid.incomeTaxDate || valid.incomeTaxDate == '') {
                            errors["incomeTaxDate"] = i18n.__("UnitPaymentOrder.incomeTaxDate.isRequired:%s is required", i18n.__("UnitPaymentOrder.incomeTaxDate._:Tanggal Faktur Pajak (PPn)"));
                        }
                    }

                    if (valid.items) {
                        if (valid.items.length <= 0) {
                            errors["items"] = [{ "unitReceiptNote": i18n.__("UnitPaymentOrder.unitReceiptNote.isRequired:%s is required", i18n.__("UnitPaymentOrder.unitReceiptNote._:Unit Receipt Note")) }]
                        } else {
                            var errItems = []
                            var isEror = false;
                            for (var item of valid.items) {
                                if (!item.unitReceiptNote._id) {
                                    isEror = true;
                                    errItems.push({ "unitReceiptNote": i18n.__("UnitPaymentOrder.unitReceiptNote.isRequired:%s is required", i18n.__("UnitPaymentOrder.unitReceiptNote._:Unit Receipt Note")) })
                                } else {
                                    errItems.push({})
                                }
                            }
                            if (errItems.length > 0 && isEror) {
                                errors["items"] = errItems
                            }
                        }
                    }
                    else {
                        errors["items"] = [{ "unitReceiptNote": i18n.__("UnitPaymentOrder.unitReceiptNote.isRequired:%s is required", i18n.__("UnitPaymentOrder.unitReceiptNote._:Unit Receipt Note")) }]
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
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
                    valid.pibNo = valid.pibNo;
                    valid.division._id = new ObjectId(valid.division._id);
                    valid.supplierId = new ObjectId(valid.supplierId);
                    valid.supplier._id = new ObjectId(valid.supplierId);
                    valid.date = new Date(valid.date);
                    valid.invoceDate = new Date(valid.invoceDate);
                    //valid.dueDate = new Date(valid.dueDate);

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
                                item.unitReceiptNote = new UnitReceiptNote(item.unitReceiptNote);
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

   getDataMonitorSpb(unitId, supplierId, dateFrom, dateTo, offset) {
        return new Promise((resolve, reject) => {
            var qryMatch = {};
            var nilai = {};
            qryMatch["$and"] = [
                { "_deleted": false }];


           if (dateFrom !== "undefined" && dateFrom !== "" && dateFrom !== "null" && dateTo !== "undefined" && dateTo !== "" && dateTo !== "null") {
                var validStartDate = new Date(dateFrom);
                var validEndDate = new Date(dateTo);
                 validStartDate.setHours(validStartDate.getHours() - offset);
                validEndDate.setHours(validEndDate.getHours() - offset);
                qryMatch["$and"].push(
                    {
                        "date": {
                            $gte: validStartDate,
                            $lte: validEndDate

                        }
                    }

                )
            }

         

            if (supplierId !== "undefined" && supplierId !== "") {
                qryMatch["$and"].push({
             supplierId: new ObjectId(supplierId)
                })
            }

       
            var nilai={};
if (unitId !== undefined && unitId !== "") {
                nilai = { "pr_docs.unitId": new ObjectId(unitId) };
            }
            this.collection.aggregate(
                [
                    {
                        $match: qryMatch
                    },
                    {
                        $unwind: "$items"
                    },
                    {
                        $unwind: "$items.unitReceiptNote.items"
                    },

                    {
                        $lookup:
                            {
                                from: "purchase-requests",
                                localField: "items.unitReceiptNote.items.purchaseOrder.purchaseRequest.no",
                                foreignField: "no",
                                as: "pr_docs"
                            }
                    },
                    {
                        $unwind: "$pr_docs"
                    },
                     { $match: nilai },
                  
                    {
                        $project: {
                            no: "$no",
                            date: "$date",
                            _createdBy: "$_createdBy",
                            "items.unitReceiptNote.items.product.name": "$items.unitReceiptNote.items.product.name",
                            "items.unitReceiptNote.items.deliveredQuantity": "$items.unitReceiptNote.items.deliveredQuantity",
                            "items.unitReceiptNote.items.pricePerDealUnit": "$items.unitReceiptNote.items.pricePerDealUnit",
                            invoceDate: "$invoceDate",
                            invoceNo: "$invoceNo",
                            dueDate: "$dueDate",
                            "suppliernm": "$supplier.name",
                            "division.name": "$division.name",
                            "useIncomeTax": "$useIncomeTax",
                            "useVat": "$useVat",
                            "vat.rate": "$vat.rate",
                            "namaUnit": "$pr_docs.unit.name",
                            "items.unitReceiptNote.items.purchaseOrder.purchaseRequest.no": "$items.unitReceiptNote.items.purchaseOrder.purchaseRequest.no",
                            "items.unitReceiptNote.items.purchaseOrder.purchaseRequest.date": "$pr_docs.date",
                            "items.unitReceiptNote.no": "$items.unitReceiptNote.no",
                            "items.unitReceiptNote.date": "$items.unitReceiptNote.date",
                             "codesupplier": "$supplier.code",
                            "satuan": "$items.unitReceiptNote.items.deliveredUom.unit",
                            "matauang": "$items.unitReceiptNote.items.currency.code",
                            "kdkategori": "$category.code",
                            "kategori": "$category.name",
                              "tgltambah": "$items.unitReceiptNote.items.purchaseOrder.purchaseOrderExternal.paymentDueDays",
                            "noserippn": "$incomeTaxNo",
                        }
                    },

                    { $sort: { "date": 1 } }
                ]

            )
                .toArray(function (err, result) {
                    assert.equal(err, null);
                    resolve(result);
                });
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

    _beforeInsert(unitPaymentOrder) {
        var monthNow = moment(unitPaymentOrder.date).format("MM");
        var yearNow = parseInt(moment(unitPaymentOrder.date).format("YY"));
        var code="";
        // var unitCode=unitPaymentOrder.division ? unitPaymentOrder.division.code : "";
        if(unitPaymentOrder && unitPaymentOrder.supplier){
            code= unitPaymentOrder.supplier.import ? "NKI" : "NKL";
        }
        var division="";
        if(unitPaymentOrder && unitPaymentOrder.division){
            if(unitPaymentOrder.division.name=="GARMENT"){
                division="-G";
            }
            else if(unitPaymentOrder.division.name=="UMUM" || unitPaymentOrder.division.name=="SPINNING" || unitPaymentOrder.division.name=="FINISHING & PRINTING" || unitPaymentOrder.division.name=="UTILITY"|| unitPaymentOrder.division.name=="WEAVING"){
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

                if (!unitPaymentOrder.no) {
                    if (previousDocumentNumber) {
                        var oldYear = previousDocumentNumber.year;
                        number = yearNow > oldYear ? number : previousDocumentNumber.number + 1;
                        if(code=="NKL")
                            unitPaymentOrder.no = `${yearNow}-${monthNow}${division}-${code}-${this.pad(number, 4)}`;
                        else if(code=="NKI")
                            unitPaymentOrder.no = `${yearNow}-${monthNow}${division}-${code}-${this.pad(number, 3)}`;
                    } else {
                        if(code=="NKL")
                            unitPaymentOrder.no = `${yearNow}-${monthNow}${division}-${code}-0001`;
                        else if(code=="NKI")
                            unitPaymentOrder.no = `${yearNow}-${monthNow}${division}-${code}-001`;
                    }
                }

                var documentNumbersData = {
                    type: type,
                    documentNumber: unitPaymentOrder.no,
                    number: number,
                    year: yearNow,
                    description: NUMBER_DESCRIPTION
                };

                var options = { "upsert": true };

                return this.documentNumbers
                    .updateOne(query, documentNumbersData, options)
                    .then((id) => {
                        return Promise.resolve(unitPaymentOrder);
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
            .then((unitPaymentOrder) => this.getRealization(unitPaymentOrder))
            .then((realizations) => this.updatePurchaseOrder(realizations))
            .then((realizations) => this.updateUnitReceiptNote(realizations))
            .then(() => {
                return this.syncItems(id);
            })
    }

    _beforeUpdate(unitPaymentOrder) {
        return this.getSingleById(unitPaymentOrder._id)
            .then((oldUnitPaymentOrder) => this.mergeUnitPaymentOrder(unitPaymentOrder, oldUnitPaymentOrder))
            .then(() => {
                return Promise.resolve(unitPaymentOrder)
            })

    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((unitPaymentOrder) => this.getRealization(unitPaymentOrder))
            .then((realizations) => this.updatePurchaseOrderUpdateUnitPaymentOrder(realizations))
            .then((realizations) => this.updateUnitReceiptNote(realizations))
            .then(() => {
                return this.syncItems(id);
            })
    }

    getRealization(unitPaymentOrder) {
        var realizations = unitPaymentOrder.items.map((unitPaymentOrderItem) => {
            return unitPaymentOrderItem.unitReceiptNote.items.map((item) => {
                return {
                    unitPaymentOrder: unitPaymentOrder,
                    unitReceiptNoteId: unitPaymentOrderItem.unitReceiptNoteId,
                    unitReceiptNoteNo: unitPaymentOrderItem.unitReceiptNote.no,
                    purchaseOrderId: item.purchaseOrderId,
                    productId: item.product._id,
                    deliveredQuantity: item.deliveredQuantity,
                    pricePerDealUnit: item.pricePerDealUnit,
                    currency: item.purchaseOrder.currency
                }
            })
        })
        realizations = [].concat.apply([], realizations);
        return Promise.resolve(realizations);
    }

    mergeUnitPaymentOrder(newUnitPaymentOrder, oldUnitPaymentOrder) {
        if (newUnitPaymentOrder.items.length !== oldUnitPaymentOrder.items.length) {
            return this.getRealization(newUnitPaymentOrder)
                .then((newRealizations) => {
                    return this.getRealization(oldUnitPaymentOrder)
                        .then((oldRealizations) => {
                            var _newRealizations = [];
                            var _oldRealizations = [];
                            for (var oldRealization of oldRealizations) {
                                var realization = newRealizations.find(item => item.unitReceiptNoteId.toString() === oldRealization.unitReceiptNoteId.toString());

                                if (!realization) {
                                    _oldRealizations.push(oldRealization);
                                }
                            }

                            for (var newRealization of newRealizations) {
                                var realization = oldRealizations.find(item => item.unitReceiptNoteId.toString() === newRealization.unitReceiptNoteId.toString());

                                if (!realization) {
                                    _newRealizations.push(newRealization);
                                }
                            }
                            var oldJobs = [];
                            var newJobs = [];
                            if (_oldRealizations.length > 0) {
                                oldJobs.push(this.updatePurchaseOrderDeleteUnitPaymentOrder(_oldRealizations));
                                oldJobs.push(this.updateUnitReceiptNoteDeleteUnitPaymentOrder(_oldRealizations));
                            }

                            if (_newRealizations.length > 0) {
                                newJobs.push(this.updatePurchaseOrder(_newRealizations));
                                newJobs.push(this.updateUnitReceiptNote(_newRealizations));
                            }
                            return _oldRealizations.length > 0 ? Promise.all(oldJobs) : Promise.resolve(null)
                                .then((res) => {
                                    return _newRealizations.length > 0 ? Promise.all(newJobs) : Promise.resolve(null)
                                })
                                .then((res) => { return Promise.resolve(newUnitPaymentOrder) });
                        })
                });
        }
        else { return Promise.resolve(newUnitPaymentOrder) }
    }

    updatePurchaseOrder(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var realization of realizations) {
                        var unitPaymentOrder = realization.unitPaymentOrder;
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === realization.productId.toString());
                        if (poItem) {
                            var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.unitReceiptNoteNo === realization.unitReceiptNoteNo);
                            if (fulfillment) {
                                fulfillment.invoiceDate = unitPaymentOrder.invoceDate;
                                fulfillment.invoiceNo = unitPaymentOrder.invoceNo;
                                fulfillment.interNoteDate = unitPaymentOrder.date;
                                fulfillment.interNoteNo = unitPaymentOrder.no;
                                fulfillment.interNoteValue = realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                                fulfillment.interNoteDueDate = unitPaymentOrder.dueDate;
                                if (unitPaymentOrder.useIncomeTax) {
                                    fulfillment.ppnNo = unitPaymentOrder.incomeTaxNo;
                                    fulfillment.ppnDate = unitPaymentOrder.incomeTaxDate
                                    fulfillment.ppnValue = 0.1 * realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                                }
                                if (unitPaymentOrder.useVat) {
                                    fulfillment.pphNo = unitPaymentOrder.vatNo;
                                    fulfillment.pphValue = (unitPaymentOrder.vatRate / 100) * realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                                    fulfillment.pphDate = unitPaymentOrder.vatDate;
                                }
                            }
                        }
                    }

                    var isFull = purchaseOrder.items
                        .map((item) => {
                            return item.fulfillments
                                .map((fulfillment) => fulfillment.hasOwnProperty("invoiceNo"))
                                .reduce((prev, curr, index) => {
                                    return prev && curr
                                }, true);
                        })
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);

                    var isRealized = purchaseOrder.items
                        .map((poItem) => poItem.realizationQuantity === poItem.dealQuantity)
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);

                    var totalReceived = purchaseOrder.items
                        .map(poItem => {
                            var total = poItem.fulfillments
                                .map(fulfillment => fulfillment.unitReceiptNoteDeliveredQuantity)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            return total;
                        })
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    var totalDealQuantity = purchaseOrder.items
                        .map(poItem => poItem.dealQuantity)
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    if (isFull && purchaseOrder.isClosed && isRealized && totalReceived === totalDealQuantity) {
                        purchaseOrder.status = poStatusEnum.COMPLETE;
                    } else if (isFull && purchaseOrder.isClosed && !isRealized && totalReceived !== totalDealQuantity) {
                        purchaseOrder.status = poStatusEnum.PREMATURE;
                    } else {
                        purchaseOrder.status = poStatusEnum.PAYMENT;
                    }
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderUpdateUnitPaymentOrder(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var realization of realizations) {
                        var unitPaymentOrder = realization.unitPaymentOrder;
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === realization.productId.toString());
                        var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.unitReceiptNoteNo === realization.unitReceiptNoteNo && fulfillment.interNoteNo === unitPaymentOrder.no);
                        if (poItem) {
                            if (fulfillment) {
                                fulfillment.invoiceDate = unitPaymentOrder.invoceDate;
                                fulfillment.invoiceNo = unitPaymentOrder.invoceNo;
                                fulfillment.interNoteDate = unitPaymentOrder.date;
                                fulfillment.interNoteNo = unitPaymentOrder.no;
                                fulfillment.interNoteValue = realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                                fulfillment.interNoteDueDate = unitPaymentOrder.dueDate;
                                if (unitPaymentOrder.useIncomeTax) {
                                    fulfillment.ppnNo = unitPaymentOrder.incomeTaxNo;
                                    fulfillment.ppnDate = unitPaymentOrder.incomeTaxDate
                                    fulfillment.ppnValue = 0.1 * realization.pricePerDealUnit * realization.currency.rate;
                                }
                                if (unitPaymentOrder.useVat) {
                                    fulfillment.pphNo = unitPaymentOrder.vatNo;
                                    fulfillment.pphValue = (unitPaymentOrder.vatRate / 100) * realization.deliveredQuantity * realization.pricePerDealUnit * realization.currency.rate;
                                    fulfillment.pphDate = unitPaymentOrder.vatDate;
                                }
                            }
                        }
                    }

                    var isFull = purchaseOrder.items
                        .map((item) => {
                            return item.fulfillments
                                .map((fulfillment) => fulfillment.hasOwnProperty("interNoteNo"))
                                .reduce((prev, curr, index) => {
                                    return prev && curr
                                }, true);
                        })
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);

                    var isRealized = purchaseOrder.items
                        .map((poItem) => poItem.realizationQuantity === poItem.dealQuantity)
                        .reduce((prev, curr, index) => {
                            return prev && curr
                        }, true);

                    var totalReceived = purchaseOrder.items
                        .map(poItem => {
                            var total = poItem.fulfillments
                                .map(fulfillment => fulfillment.unitReceiptNoteDeliveredQuantity)
                                .reduce((prev, curr, index) => {
                                    return prev + curr;
                                }, 0);
                            return total;
                        })
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    var totalDealQuantity = purchaseOrder.items
                        .map(poItem => poItem.dealQuantity)
                        .reduce((prev, curr, index) => {
                            return prev + curr;
                        }, 0);

                    if (isFull && purchaseOrder.isClosed && isRealized && totalReceived === totalDealQuantity) {
                        purchaseOrder.status = poStatusEnum.COMPLETE;
                    } else if (isFull && purchaseOrder.isClosed && !isRealized && totalReceived !== totalDealQuantity) {
                        purchaseOrder.status = poStatusEnum.PREMATURE;
                    } else {
                        purchaseOrder.status = poStatusEnum.PAYMENT;
                    }
                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updatePurchaseOrderDeleteUnitPaymentOrder(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.purchaseOrderId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization);
        }

        var jobs = [];
        map.forEach((realizations, purchaseOrderId) => {
            var job = this.purchaseOrderManager.getSingleById(purchaseOrderId)
                .then((purchaseOrder) => {
                    for (var realization of realizations) {
                        var unitPaymentOrder = realization.unitPaymentOrder;
                        var poItem = purchaseOrder.items.find(_item => _item.product._id.toString() === realization.productId.toString());
                        if (poItem) {
                            var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.unitReceiptNoteNo === realization.unitReceiptNoteNo && fulfillment.interNoteNo === unitPaymentOrder.no);
                            if (fulfillment) {
                                delete fulfillment.invoiceDate;
                                delete fulfillment.invoiceNo;
                                delete fulfillment.interNoteDate;
                                delete fulfillment.interNoteNo;
                                delete fulfillment.interNoteValue;
                                delete fulfillment.interNoteDueDate;
                                if (unitPaymentOrder.useIncomeTax) {
                                    delete fulfillment.ppnNo;
                                    delete fulfillment.ppnDate;
                                    delete fulfillment.ppnValue;
                                }
                                if (unitPaymentOrder.useVat) {
                                    delete fulfillment.pphNo;
                                    delete fulfillment.pphValue;
                                    delete fulfillment.pphDate;
                                }

                            }
                        }
                    }
                    var isPaid = purchaseOrder.items
                        .map((item) => {
                            return item.fulfillments
                                .map((fulfillment) => fulfillment.hasOwnProperty("invoiceNo"))
                                .reduce((prev, curr, index) => {
                                    return prev || curr
                                }, false);
                        })
                        .reduce((prev, curr, index) => {
                            return prev || curr
                        }, false);

                    purchaseOrder.status = isPaid ? poStatusEnum.PAYMENT : (purchaseOrder.isClosed ? poStatusEnum.RECEIVED : poStatusEnum.RECEIVING);

                    return this.purchaseOrderManager.updateCollectionPurchaseOrder(purchaseOrder);
                })
            jobs.push(job);
        })
        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updateUnitReceiptNote(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.unitReceiptNoteId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization.purchaseOrderId);
        }

        var jobs = [];
        map.forEach((purchaseOrderIds, unitReceiptNoteId) => {
            var job = this.unitReceiptNoteManager.getSingleById(unitReceiptNoteId)
                .then((unitReceiptNote) => {
                    var listPO = unitReceiptNote.items.filter(function (elem, index, self) {
                        return self.findIndex((t) => { return t.purchaseOrder.no === elem.purchaseOrder.no }) === index
                    })
                    return Promise.all(listPO.map((item) => {
                        return this.purchaseOrderManager.getSingleById(item.purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {
                            // for (var purchaseOrder of purchaseOrders) {
                            //     var item = unitReceiptNote.items.find(item => item.purchaseOrderId.toString() === purchaseOrder._id.toString());
                            //     var index = unitReceiptNote.items.indexOf(item);
                            //     if (index !== -1) {
                            //         unitReceiptNote.items[index].purchaseOrder = purchaseOrder;
                            //     }
                            // }

                            for (var item of unitReceiptNote.items) {
                                var purchaseOrder = purchaseOrders.find(purchaseOrder => item.purchaseOrderId.toString() === purchaseOrder._id.toString());
                                // var index = unitReceiptNote.items.indexOf(item);
                                if (purchaseOrder) {
                                    item.purchaseOrder = purchaseOrder;
                                }
                            }
                            var isPaid = false;
                            // var listPO = unitReceiptNote.items.filter(function (elem, index, self) {
                            //     return self.findIndex((t) => { return t.purchaseOrder.no === elem.purchaseOrder.no }) === index
                            // })
                            for (var poInternal of purchaseOrders) {
                                for (var poItem of poInternal.items) {
                                    var fulfillment = poItem.fulfillments.find(fulfillment => fulfillment.unitReceiptNoteNo === unitReceiptNote.no);
                                    if (fulfillment) {
                                        if (fulfillment.invoiceNo) {
                                            isPaid = true;
                                        } else {
                                            isPaid = false;
                                            break;
                                        }
                                    } else {
                                        isPaid = false;
                                        break;
                                    }
                                }
                                if (!isPaid) {
                                    break;
                                }
                            }
                            unitReceiptNote.isPaid = isPaid;
                            return this.unitReceiptNoteManager.updateCollectionUnitReceiptNote(unitReceiptNote);
                        })
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    updateUnitReceiptNoteDeleteUnitPaymentOrder(realizations) {
        var map = new Map();
        for (var realization of realizations) {
            var key = realization.unitReceiptNoteId.toString();
            if (!map.has(key))
                map.set(key, [])
            map.get(key).push(realization.purchaseOrderId);
        }

        var jobs = [];
        map.forEach((purchaseOrderIds, unitReceiptNoteId) => {
            var job = this.unitReceiptNoteManager.getSingleById(unitReceiptNoteId)
                .then((unitReceiptNote) => {
                    return Promise.all(purchaseOrderIds.map((purchaseOrderId) => {
                        return this.purchaseOrderManager.getSingleById(purchaseOrderId)
                    }))
                        .then((purchaseOrders) => {
                            for (var purchaseOrder of purchaseOrders) {
                                var item = unitReceiptNote.items.find(item => item.purchaseOrderId.toString() === purchaseOrder._id.toString());
                                var index = unitReceiptNote.items.indexOf(item);
                                if (index !== -1) {
                                    unitReceiptNote.items[index].purchaseOrder = purchaseOrder;
                                }
                            }
                            unitReceiptNote.isPaid = false;
                            return this.unitReceiptNoteManager.updateCollectionUnitReceiptNote(unitReceiptNote);
                        })
                })
            jobs.push(job);
        })

        return Promise.all(jobs).then((results) => {
            return Promise.resolve(realizations);
        })
    }

    delete(unitPaymentOrder) {
        return this._pre(unitPaymentOrder)
            .then((validData) => {
                validData._deleted = true;
                return this.collection.update(validData)
                    .then((id) => {
                        var query = {
                            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
                        };
                        return this.getSingleByQuery(query)
                            .then((unitPaymentOrder) => this.getRealization(unitPaymentOrder))
                            .then((realizations) => this.updatePurchaseOrderDeleteUnitPaymentOrder(realizations))
                            .then((realizations) => this.updateUnitReceiptNoteDeleteUnitPaymentOrder(realizations))
                            .then(() => {
                                return this.syncItems(id);
                            })
                    })
            });
    }

    syncItems(id) {
        var query = {
            _id: ObjectId.isValid(id) ? new ObjectId(id) : {}
        };
        return this.getSingleByQuery(query)
            .then((unitPaymentOrder) => {
                var getUnitReceiptNotes = unitPaymentOrder.items.map((unitPaymentOrderItem) => {
                    return this.unitReceiptNoteManager.getSingleById(unitPaymentOrderItem.unitReceiptNoteId, this.unitReceiptNoteFields)
                })
                return Promise.all(getUnitReceiptNotes)
                    .then((unitReceiptNotes) => {
                        for (var unitPaymentOrderItem of unitPaymentOrder.items) {
                            var item = unitReceiptNotes.find(unitReceiptNote => unitPaymentOrderItem.unitReceiptNoteId.toString() === unitReceiptNote._id.toString())
                            if (item) {
                                var items = [];
                                for (var _item of item.items) {
                                    if (_item.purchaseOrder.categoryId.toString() === unitPaymentOrder.categoryId.toString()) {
                                        items.push(_item);
                                    }
                                }
                                item.items = items;
                                unitPaymentOrderItem.unitReceiptNote = item;
                            }
                        }
                        return this.collection
                            .updateOne({
                                _id: unitPaymentOrder._id
                            }, {
                                $set: unitPaymentOrder
                            })
                            .then((result) => Promise.resolve(unitPaymentOrder._id));
                    })
            })
    }

    pdf(id, offset) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(unitPaymentOrder => {
                    var getDefinition = require('../../pdf/definitions/unit-payment-order');
                    var definition = getDefinition(unitPaymentOrder, offset);

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
            name: `ix_${map.purchasing.collection.UnitPaymentOrder}_date`,
            key: {
                date: -1
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
                        "invoceNo",
                        "invoceDate",
                        "dueDate",
                        "remark",
                        "useIncomeTax",
                        "incomeTaxNo",
                        "incomeTaxDate",
                        "useVat",
                        "vat",
                        "vatNo",
                        "vatDate",
                        "_createdBy",
                        "category.name",
                        "items.unitReceiptNote.no",
                        "items.unitReceiptNote.date",
                        "items.unitReceiptNote.items.purchaseOrder.purchaseOrderExternal.no",
                        "items.unitReceiptNote.items.purchaseOrder.purchaseOrderExternal.paymentDueDays",
                        "items.unitReceiptNote.items.purchaseOrder.items.product",
                        "items.unitReceiptNote.items.purchaseOrder.items.useIncomeTax",
                        "items.unitReceiptNote.items.purchaseOrder.purchaseRequest.no",
                        "items.unitReceiptNote.items.product",
                        "items.unitReceiptNote.items.deliveredQuantity",
                        "items.unitReceiptNote.items.deliveredUom",
                        "items.unitReceiptNote.items.pricePerDealUnit",
                        "items.unitReceiptNote.items.currency",
                        "paymentMethod"];

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

    updatePosition(data) {
        return this
            .collection
            .updateMany({ "no": { "$in": data.unitPaymentOrders } },
                {
                    "$set": {
                        "position": data.position,
                        "_updatedBy": this.user.username,
                        "_updatedDate": new Date()
                    }
                });
    }

    getExpeditionReport(paging, offset) {
        let filter = paging.filter;
        let filterApply = {};

        if (filter.no)
            filterApply.no = filter.no;

        if (filter.supplierCode)
            filterApply['supplier.code'] = filter.supplierCode;
        
        if (filter.divisionCode)
            filterApply['division.code'] = filter.divisionCode;

        if (filter.status)
            filterApply.position = filter.status;

        if (filter.dateFrom && filter.dateTo) {
            let validStartDate = new Date(filter.dateFrom);
            let validEndDate = new Date(filter.dateTo);
            validStartDate.setHours(validStartDate.getHours() - offset);
            validEndDate.setHours(23, 59, 59);
            validEndDate.setHours(validEndDate.getHours() - offset);
            
            filterApply.date = {
                $gte: validStartDate,
                $lte: validEndDate,
            };
        }

        paging.filter = filterApply;

        let _paging = Object.assign({
            page: 1,
            size: 20,
            order: {},
            filter: {},
            select: []
        }, paging);

        let query = this._getQuery(_paging);
        return this.collection
            .where(query)
            .select(_paging.select)
            .page(_paging.page, _paging.size)
            .order(_paging.order)
            .execute();
    }
};