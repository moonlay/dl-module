"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var generateCode = require("../../../utils/code-generator");
var KanbanManager = require('./kanban-manager');
var FabricQualityControlManager = require('./fabric-quality-control-manager');
var InspectionLotColor = DLModels.production.finishingPrinting.qualityControl.InspectionLotColor;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require('moment');

module.exports = class InspectionLotColorManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.production.finishingPrinting.qualityControl.collection.InspectionLotColor);
        this.kanbanManager = new KanbanManager(db, user);
        this.fabricQualityControlManager = new FabricQualityControlManager(db, user);
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
            var fabricQcCodeFilter = {
                "fabricQualityControlCode": {
                    "$regex": regex
                }
            };
            var orderNoFilter = {
                "productionOrderNo": {
                    "$regex": regex
                }
            };
            var colorFilter = {
                "color": {
                    "$regex": regex
                }
            };
            var cartFilter = {
                "cartNo": {
                    "$regex": regex
                }
            };
            var orderTypeFilter = {
                "productionOrderType": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [fabricQcCodeFilter, orderNoFilter, colorFilter, cartFilter, orderTypeFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(inspectionLotColor) {

        var errors = {};

        return new Promise((resolve, reject) => {

            var valid = inspectionLotColor;

            var dateNow = new Date();
            var dateNowString = moment(dateNow).format('YYYY-MM-DD');

            var getFabricQc = valid.fabricQualityControlId && ObjectId.isValid(valid.fabricQualityControlId) ? this.fabricQualityControlManager.getSingleByIdOrDefault(new ObjectId(valid.fabricQualityControlId)) : Promise.resolve(null);

            Promise.all([getFabricQc])
                .then(results => {
                    var _fabricQc = results[0];

                    if (!valid.fabricQualityControlId || valid.fabricQualityControlId.toString() === "")
                        errors["fabricQualityControlId"] = i18n.__("Harus diisi", i18n.__("InspectionLotColor.fabricQualityControlId._:FabricQualityControlId")); //"kanban tidak ditemukan";
                    else if (!_fabricQc)
                        errors["fabricQualityControlId"] = i18n.__("Data Pemeriksaan Defect tidak ditemukan", i18n.__("InspectionLotColor.fabricQualityControlId._:FabricQualityControlId")); //"kanban tidak ditemukan";


                    if (!valid.date || valid.date === '')
                        errors["date"] = i18n.__("Harus diisi", i18n.__("InspectionLotColor.date._:Date")); //"date tidak ditemukan";
                    else {
                        var dateProces = new Date(valid.date);
                        if (dateProces > dateNow)
                            errors["date"] = i18n.__("Tanggal tidak boleh lebih dari tanggal hari ini", i18n.__("InspectionLotColor.date._:Date")); //"date tidak ditemukan";
                    }

                    if (!valid.items || valid.items.length <= 0)
                        errors["items"] = i18n.__("Harus diisi", i18n.__("InspectionLotColor.items._:Items"));
                    else if (valid.items.length > 0) {
                        var itemErrors = [];
                        for (var item of valid.items) {
                            var itemError = {};
                            if (!item.pcsNo || item.pcsNo === "")
                                itemError["pcsNo"] = i18n.__("Harus diisi", i18n.__("InspectionLotColor.items.pcsNo._:Pcs No"));
                            if (!item.grade || item.grade === "")
                                itemError["grade"] = i18n.__("Harus diisi", i18n.__("InspectionLotColor.items.grade._:Grade"));
                            if (!item.lot || item.lot === "")
                                itemError["lot"] = i18n.__("Harus diisi", i18n.__("InspectionLotColor.items.lot._:Lot"));
                            if (!item.lot || item.status === "")
                                itemError["status"] = i18n.__("Harus diisi", i18n.__("InspectionLotColor.items.status._:Status"));
                            itemErrors.push(itemError);
                        }
                        for (var item of itemErrors) {
                            if (Object.getOwnPropertyNames(item).length > 0) {
                                errors["items"] = itemErrors;
                                break;
                            }
                        }
                    }

                    if (Object.getOwnPropertyNames(errors).length > 0) {
                        var ValidationError = require('module-toolkit').ValidationError;
                        return Promise.reject(new ValidationError('data does not pass validation', errors));
                    }

                    if (_fabricQc) {
                        valid.fabricQualityControlCode = _fabricQc.code;
                        valid.fabricQualityControlId = _fabricQc._id;
                    }

                    valid.date = new Date(valid.date);

                    if (!valid.stamp) {
                        valid = new InspectionLotColor(valid);
                    }

                    valid.stamp(this.user.username, "manager");

                    resolve(valid);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((lotInspection) => {
                return this.fabricQualityControlManager.getSingleById(lotInspection.fabricQualityControlId)
                    .then((fabricQc) => {
                        fabricQc.isUsed = true;
                        return this.fabricQualityControlManager.update(fabricQc)
                            .then((fabricQc) => Promise.resolve(id))
                    })
            })
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((lotInspection) => {
                return this.fabricQualityControlManager.getSingleById(lotInspection.fabricQualityControlId)
                    .then((fabricQc) => {

                        if (lotInspection._deleted) {
                            fabricQc.isUsed = false;
                        }

                        return this.fabricQualityControlManager.update(fabricQc)
                            .then((fabricQc) => Promise.resolve(id))
                    })
            })
    }

    delete(data) {
        data._deleted = true;

        return this.fabricQualityControlManager.getSingleById(data.fabricQualityControlId)
            .then((fabricQc) => {
                fabricQc.isUsed = false;

                return this.fabricQualityControlManager.update(fabricQc)
                    .then((fabricQc) => {
                        return this.collection.update(data);

                    })
            })
    }

    getReport(query) {
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
        var fabricQcQuery = {};
        if (query.fabricQc) {
            fabricQcQuery = {
                "fabricQualityControlId": new ObjectId(query.fabricQc)
            };
        }
        var productionOrderQuery = {};
        if (query.productionOrder) {
            productionOrderQuery = {
                "productionOrderNo": query.productionOrder
            }
        }
        var Query = { "$and": [dateQuery, deletedQuery, fabricQcQuery, productionOrderQuery] };
        var order = {
            "date": -1
        };
        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(Query)
                    .order(order)
                    .execute();
            });
    }

    getXls(result, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = '';

        var index = 0;
        var dateFormat = "DD/MM/YYYY";

        for (var lotColor of result.data) {
            var dateString = '';
            if (lotColor.date) {
                var dateTamp = new Date(lotColor.date);
                var date = new Date(dateTamp.setHours(dateTamp.getHours() + 7));
                dateString = moment(date).format(dateFormat);
            }
            for (var detail of lotColor.items) {
                index++;
                var item = {};
                item["No"] = index;
                item["Nomor Pemeriksaan Kain"] = lotColor.fabricQualityControlCode ? lotColor.fabricQualityControlCode : '';
                item["No Order"] = lotColor.productionOrderNo ? lotColor.productionOrderNo : '';
                item["Konstruksi"] = lotColor.construction ? `${lotColor.construction}` : '';
                item["Warna"] = lotColor.color ? lotColor.color : '';
                item["No Kereta"] = lotColor.cartNo ? lotColor.cartNo : '';;
                item["Jenis Order"] = lotColor.productionOrderType ? lotColor.productionOrderType : '';;
                item["Tgl Pemeriksaan"] = dateString;
                item["No Pcs"] = detail.pcsNo ? detail.pcsNo : '';
                item["Grade"] = detail.grade ? detail.grade : '';
                item["Lot"] = detail.lot ? detail.lot : '';
                item["Status"] = detail.status ? detail.status : '';

                xls.data.push(item);
            }
        }

        xls.options["No"] = "number";
        xls.options["Nomor Pemeriksaan Kain"] = "string";
        xls.options["No Order"] = "string";
        xls.options["Konstruksi"] = "string";
        xls.options["Warna"] = "string";
        xls.options["No Kereta"] = "string";
        xls.options["Jenis Order"] = "string";
        xls.options["Tgl Pemeriksaan"] = "string";
        xls.options["No Pcs"] = "string";
        xls.options["Grade"] = "string";
        xls.options["Lot"] = "string";
        xls.options["Status"] = "string";

        if (query.dateFrom && query.dateTo) {
            xls.name = `Inspection Lot Color Report ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Inspection Lot Color Report ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Inspection Lot Color Report ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Inspection Lot Color Report.xlsx`;

        return Promise.resolve(xls);
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.production.finishingPrinting.qualityControl.collection.InspectionLotColor}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        return this.collection.createIndexes([dateIndex]);
    }
};