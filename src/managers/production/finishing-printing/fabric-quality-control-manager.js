"use strict";

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var assert = require('assert');

var generateCode = require("../../../utils/code-generator");

var ProductionOrderManager = require('../../sales/production-order-manager');
var KanbanManager = require('./kanban-manager');
var UomManager = require('../../master/uom-manager');

var Models = require("dl-models");
var Map = Models.map;
var KanbanModel = Models.production.finishingPrinting.Kanban;
var FabricQualityControlModel = Models.production.finishingPrinting.qualityControl.defect.FabricQualityControl;
var FabricGradeTestModel = Models.production.finishingPrinting.qualityControl.defect.FabricGradeTest;
var FabricTestCriterionModel = Models.production.finishingPrinting.qualityControl.defect.FabricTestCriterion;

var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var moment = require("moment");

module.exports = class FabricQualityControlManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(Map.production.finishingPrinting.qualityControl.defect.collection.FabricQualityControl); 

        this.kanbanManager = new KanbanManager(db, user);
        this.productionOrderManager = new ProductionOrderManager(db, user);
        this.uomManager = new UomManager(db, user);
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
            var operatorFilter = {
                "operatorIm": {
                    "$regex": regex
                }
            };
            var machineFilter = {
                "machineNoIm": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [operatorFilter, machineFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _beforeInsert(data) {
        data.code = generateCode();
        return Promise.resolve(data);
    }

    _validate(fabricQualityControl) {
        var errors = {};
        var valid = fabricQualityControl;

        var getDbFabricQualityControl = this.collection.singleOrDefault({
            _id: new ObjectId(valid._id)
        });
        var getDuplicateFabricQualityControl = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            code: valid.code
        });
        var getKanban = valid.kanbanId && ObjectId.isValid(valid.kanbanId) ? this.kanbanManager.getSingleByIdOrDefault(valid.kanbanId) : Promise.resolve(null);

        return Promise.all([getDbFabricQualityControl, getDuplicateFabricQualityControl, getKanban])
            .then(results => {
                var _dbFabricQualityControl = results[0];
                var _duplicateFabricQualityControl = results[1];
                var _kanban = results[2];

                if (_dbFabricQualityControl)
                    valid.code = _dbFabricQualityControl.code; // prevent code changes.

                if (_duplicateFabricQualityControl)
                    errors["code"] = i18n.__("FabricQualityControl.code.isExist: %s is exist", i18n.__("FabricQualityControl.code._:Code"));

                if (!valid.kanbanId || valid.kanbanId === '')
                    errors["kanbanId"] = i18n.__("FabricQualityControl.kanbanId.isRequired:%s is required", i18n.__("FabricQualityControl.kanbanId._:Kanban")); //"Grade harus diisi";   
                else if (!_kanban)
                    errors["kanbanId"] = i18n.__("FabricQualityControl.kanbanId: %s not found", i18n.__("FabricQualityControl.KanbanId._:Kanban"));

                if (valid.pointSystem !== 10 && valid.pointSystem !== 4)
                    errors["pointSystem"] = i18n.__("FabricQualityControl.pointSystem.invalid:%s is not valid", i18n.__("FabricQualityControl.pointSystem._:Point System")); //"Grade harus diisi";   

                if (!valid.dateIm)
                    errors["dateIm"] = i18n.__("FabricQualityControl.dateIm.isRequired:%s is required", i18n.__("FabricQualityControl.dateIm._:Date")); //"Grade harus diisi";

                if (!valid.shiftIm || valid.shiftIm === '')
                    errors["shiftIm"] = i18n.__("FabricQualityControl.shiftIm.isRequired:%s is required", i18n.__("FabricQualityControl.shiftIm._:Shift")); //"Grade harus diisi";   

                if (!valid.operatorIm || valid.operatorIm === '')
                    errors["operatorIm"] = i18n.__("FabricQualityControl.operatorIm.isRequired:%s is required", i18n.__("FabricQualityControl.operatorIm._:Operator IM")); //"Operator IM harus diisi";   

                if (!valid.machineNoIm || valid.machineNoIm === '')
                    errors["machineNoIm"] = i18n.__("FabricQualityControl.machineNoIm.isRequired:%s is required", i18n.__("FabricQualityControl.machineNoIm._:IM Machine No")); //"Grade harus diisi";   

                valid.fabricGradeTests = valid.fabricGradeTests || [];
                if (valid.fabricGradeTests && valid.fabricGradeTests.length <= 0) {
                    errors["fabricGradeTests"] = i18n.__("FabricQualityControl.fabricGradeTests.isRequired:%s is required", i18n.__("FabricQualityControl.fabricGradeTests._: Fabric Grade Tests")); //"Harus ada minimal 1 barang";
                }
                else {
                    var fabricGradeTestsErrors = [];
                    valid.fabricGradeTests.forEach((item, index) => {
                        var fabricGradeTestsError = {};
                        if (!item.pcsNo || item.pcsNo.trim() === "")
                            fabricGradeTestsError["pcsNo"] = i18n.__("FabricQualityControl.fabricGradeTests.pcsNo.isRequired:%s is required", i18n.__("FabricQualityControl.fabricGradeTests.pcsNo._:Pcs No"));
                        else {
                            var dup = valid.fabricGradeTests.find((test, idx) => item.pcsNo === test.pcsNo && index != idx);
                            if (dup)
                                fabricGradeTestsError["pcsNo"] = i18n.__("FabricQualityControl.fabricGradeTests.pcsNo.isDuplicate:%s is duplicate", i18n.__("FabricQualityControl.fabricGradeTests.pcsNo._:Pcs No"));
                        }

                        if (item.initLength <= 0)
                            fabricGradeTestsError["initLength"] = i18n.__("FabricQualityControl.fabricGradeTests.initLength.isRequired:%s is required", i18n.__("FabricQualityControl.fabricGradeTests.pcsNo._:Initial Length"));

                        if (item.width <= 0)
                            fabricGradeTestsError["width"] = i18n.__("FabricQualityControl.fabricGradeTests.width.isRequired:%s is required", i18n.__("FabricQualityControl.fabricGradeTests.width._:Width"));


                        fabricGradeTestsErrors.push(fabricGradeTestsError);
                    })

                    for (var fabricGradeTestsError of fabricGradeTestsErrors) {
                        if (Object.getOwnPropertyNames(fabricGradeTestsError).length > 0) {
                            errors.fabricGradeTests = fabricGradeTestsErrors;
                            break;
                        }
                    }

                }

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }


                valid.productionOrderNo = _kanban.productionOrder.orderNo;
                valid.productionOrderType = _kanban.productionOrder.orderType.name;
                valid.kanbanCode = _kanban.code;
                valid.buyer = _kanban.productionOrder.buyer.name;
                valid.orderQuantity = _kanban.productionOrder.orderQuantity;
                valid.cartNo = _kanban.cart.cartNumber;
                valid.color = _kanban.selectedProductionOrderDetail.colorRequest;
                valid.construction = `${_kanban.productionOrder.material.name} / ${_kanban.productionOrder.materialConstruction.name} / ${_kanban.productionOrder.materialWidth}`;
                valid.packingInstruction = `${_kanban.productionOrder.packingInstruction}`;
                valid.uom = `${_kanban.productionOrder.uom.unit}`;

                valid.fabricGradeTests.forEach(test => {
                    test.pointSystem = valid.pointSystem;
                    this.calculateGrade(test);
                });

                if (!valid.stamp) {
                    valid = new FabricQualityControlModel(valid);
                }

                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);


            })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.production.finishingPrinting.qualityControl.defect.collection.FabricQualityControl}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }
        var codeIndex = {
            name: `ix_${Map.production.finishingPrinting.qualityControl.defect.collection.FabricQualityControl}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

    calculateGrade(fabricGradeTest) {
        var multiplier = fabricGradeTest.pointSystem === 10 ? {
            A: 1,
            B: 3,
            C: 5,
            D: 10
        } : {
                A: 1,
                B: 2,
                C: 3,
                D: 4
            };
        fabricGradeTest.criteria = fabricGradeTest.criteria || [];
        var score = fabricGradeTest.criteria.reduce((p, c, i) => {
            return p + ((c.score.A * multiplier.A) + (c.score.B * multiplier.B) + (c.score.C * multiplier.C) + (c.score.D * multiplier.D))
        }, 0);

        var finalLength = fabricGradeTest.initLength - fabricGradeTest.avalLength - fabricGradeTest.sampleLength;
        var finalScore = finalLength > 0 ? score / finalLength : 0;
        var grade = this.__scoreGrade(fabricGradeTest.pointSystem, finalScore);

        fabricGradeTest.score = score;
        fabricGradeTest.finalLength = finalLength;
        fabricGradeTest.finalScore = finalScore;
        fabricGradeTest.grade = grade;
    }

    __scoreGrade(pointSystem, finalScore) {
        if (pointSystem === 10) {
            if (finalScore >= 2.71)
                return "BS";
            else if (finalScore >= 1.31)
                return "C";
            else if (finalScore >= 0.91)
                return "B";
            else
                return "A";
        }
        else
            return "-";
    }

    pdf(qualityControl) {
        return new Promise((resolve, reject) => {
            var getDefinition = require("../../../pdf/definitions/fabric-quality-control");
            var definition = getDefinition(qualityControl);

            var generatePdf = require("../../../pdf/pdf-generator");
            generatePdf(definition)
                .then((binary) => {
                    resolve(binary);
                })
                .catch((e) => {
                    reject(e);
                });
        })
    }

    getReport(info) {
        var _defaultFilter = {
            _deleted: false
        };
        var kanbanCodeFilter = {};
        var productionOrderNoFilter = {};
        var productionOrderTypeFilter = {};
        var shiftImFilter = {};
        var dateFromFilter = {};
        var dateToFilter = {};
        var query = {};

        var dateFrom = info.dateFrom ? (new Date(info.dateFrom)) : (new Date(1900, 1, 1));
        var dateTo = info.dateTo ? (new Date(info.dateTo + "T23:59")) : (new Date());
        var now = new Date();

        if (info.kanbanCode && info.kanbanCode !== '') {
            kanbanCodeFilter = { 'kanbanCode': info.kanbanCode };
        }

        if (info.productionOrderNo && info.productionOrderNo != '') {
            productionOrderNoFilter = { 'productionOrderNo': info.productionOrderNo };
        }

        if (info.productionOrderType && info.productionOrderType != '') {
            productionOrderTypeFilter = { 'productionOrderType': info.productionOrderType };
        }

        if (info.shiftIm && info.shiftIm != '') {
            shiftImFilter = { 'shiftIm': info.shiftIm };
        }

        var filterDate = {
            "dateIm": {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            }
        };

        query = { '$and': [_defaultFilter, kanbanCodeFilter, productionOrderNoFilter, productionOrderTypeFilter, shiftImFilter, filterDate] };

        return this._createIndexes()
            .then((createIndexResults) => {
                return this.collection
                    .where(query)
                    .execute();
            });
    }

    getXls(results, query) {
        var xls = {};
        xls.data = [];
        xls.options = [];
        xls.name = "";

        var index = 1;
        var dateFormat = "DD/MM/YYYY";

        for (var result of results.data) {
            var item = {};
            item["No"] = index;
            item["Nomor Kanban"] = result.kanbanCode ? result.kanbanCode : "";
            item["Nomor Kereta"] = result.cartNo ? result.cartNo : "";
            item["Jenis Order"] = result.productionOrderType ? result.productionOrderType : "";
            item["Nomor Order"] = result.productionOrderNo ? result.productionOrderNo : "";
            item["Tanggal IM"] = result.dateIm ? moment(result.dateIm).format(dateFormat) : "";
            item["Shift"] = result.shiftIm ? result.shiftIm : "";
            item["Operator IM"] = result.operatorIm ? result.operatorIm : "";
            item["No Mesin IM"] = result.machineNoIm ? result.machineNoIm : "";
            item["Konstruksi"] = result.construction ? result.construction : "";
            item["Buyer"] = result.buyer ? result.buyer : "";
            item["Warna"] = result.color ? result.color : "";
            item["Jumlah Order (meter)"] = result.orderQuantity ? result.orderQuantity : 0;
            item["Packing Instruction"] = result.packingInstruction ? result.packingInstruction : "";

            for (var fabricGradeTest of result.fabricGradeTests) {
                item["Nomor PCS"] = fabricGradeTest.pcsNo ? fabricGradeTest.pcsNo : "";
                item["Panjang PCS (meter)"] = fabricGradeTest.initLength;
                item["Lebar PCS (meter)"] = fabricGradeTest.width;
                item["Nilai"] = fabricGradeTest.finalScore;
                item["Grade"] = fabricGradeTest.grade ? fabricGradeTest.grade : "";
                item["Aval (meter)"] = fabricGradeTest.avalLength;
                item["Sampel (meter)"] = fabricGradeTest.sampleLength;

                xls.options["Nomor PCS"] = "string";
                xls.options["Panjang PCS (meter)"] = "number";
                xls.options["Lebar PCS (meter)"] = "number";
                xls.options["Nilai"] = "number";
                xls.options["Grade"] = "string";
                xls.options["Aval (meter)"] = "number";
                xls.options["Sampel (meter)"] = "number";
                index++;

            }

            xls.data.push(item);

        }

        xls.options["No"] = "number";
        xls.options["Nomor Kanban"] = "string";
        xls.options["Nomor Kereta"] = "string";
        xls.options["Jenis Order"] = "string";
        xls.options["Nomor Order"] = "string";
        xls.options["Tanggal IM"] = "string";
        xls.options["Shift"] = "string";
        xls.options["Operator IM"] = "string";
        xls.options["No Mesin IM"] = "string";
        xls.options["Konstruksi"] = "string";
        xls.options["Buyer"] = "string";
        xls.options["Warna"] = "string";
        xls.options["Jumlah Order (meter)"] = "string";
        xls.options["Packing Instruction"] = "string";

        if (query.dateFrom && query.dateTo) {
            xls.name = `Laporan Pemeriksaan Kain ${moment(new Date(query.dateFrom)).format(dateFormat)} - ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (!query.dateFrom && query.dateTo) {
            xls.name = `Laporan Pemeriksaan Kain ${moment(new Date(query.dateTo)).format(dateFormat)}.xlsx`;
        }
        else if (query.dateFrom && !query.dateTo) {
            xls.name = `Laporan Pemeriksaan Kain ${moment(new Date(query.dateFrom)).format(dateFormat)}.xlsx`;
        }
        else
            xls.name = `Laporan Pemeriksaan Kain.xlsx`;

        return Promise.resolve(xls);
    }
};
