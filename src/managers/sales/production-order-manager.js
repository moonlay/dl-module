'use strict'

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");

var DLModels = require('dl-models');
var map = DLModels.map;
var ProductionOrder = DLModels.sales.ProductionOrder;
var ProductionOrderDetail = DLModels.sales.ProductionOrderDetail;
var ProductionOrderLampStandard = DLModels.sales.ProductionOrderLampStandard;
var FPSalesContractManager = require('./finishing-printing-sales-contract-manager');
var LampStandardManager = require('../master/lamp-standard-manager');
var BuyerManager = require('../master/buyer-manager');
var UomManager = require('../master/uom-manager');
var ProductManager = require('../master/product-manager');
var ProcessTypeManager = require('../master/process-type-manager');
var OrderTypeManager = require('../master/order-type-manager');
var ColorTypeManager = require('../master/color-type-manager');
var FinishTypeManager = require('../master/finish-type-manager');
var StandardTestManager = require('../master/standard-test-manager');
var MaterialConstructionManager = require('../master/material-construction-manager');
var YarnMaterialManager = require('../master/yarn-material-manager');
var AccountManager = require('../auth/account-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");
var assert = require('assert');
var moment = require('moment');

module.exports = class ProductionOrderManager extends BaseManager {
    //#region CRUD and Report

    constructor(db, user) {
        super(db, user);

        this.collection = this.db.collection(map.sales.collection.ProductionOrder);
        this.dailyOperationCollection = this.db.collection(map.production.finishingPrinting.collection.DailyOperation);
        this.fabricQualityControlCollection = this.db.use(map.production.finishingPrinting.qualityControl.defect.collection.FabricQualityControl);
        this.fpPackingReceiptCollection = this.db.use(map.inventory.finishingPrinting.collection.FPPackingReceipt);
        this.fpPackingShipmentCollection = this.db.use(map.inventory.finishingPrinting.collection.FPPackingShipmentDocument);
        this.kanbanCollection = this.db.use(map.production.finishingPrinting.collection.Kanban);
        this.LampStandardManager = new LampStandardManager(db, user);
        this.BuyerManager = new BuyerManager(db, user);
        this.UomManager = new UomManager(db, user);
        this.ProductManager = new ProductManager(db, user);
        this.ProcessTypeManager = new ProcessTypeManager(db, user);
        this.ColorTypeManager = new ColorTypeManager(db, user);
        this.OrderTypeManager = new OrderTypeManager(db, user);
        this.MaterialConstructionManager = new MaterialConstructionManager(db, user);
        this.YarnMaterialManager = new YarnMaterialManager(db, user);
        this.FinishTypeManager = new FinishTypeManager(db, user);
        this.StandardTestManager = new StandardTestManager(db, user);
        this.AccountManager = new AccountManager(db, user);
        this.fpSalesContractManager = new FPSalesContractManager(db, user);
    }

    _getQuery(paging) {
        var deletedFilter = {
            _deleted: false
        }, keywordFilter = {};

        var query = {};
        if (paging.keyword) {
            var regex = new RegExp(paging.keyword, "i");

            var filterSalesContract = {
                'salesContractNo': {
                    '$regex': regex
                }
            };

            var filterOrderNo = {
                'orderNo': {
                    '$regex': regex
                }
            };

            var filterBuyerName = {
                'buyer.name': {
                    '$regex': regex
                }
            };

            var filterBuyerType = {
                'buyer.type': {
                    '$regex': regex
                }
            };

            var filterProcessType = {
                'processType.name': {
                    '$regex': regex
                }
            };

            keywordFilter = {
                '$or': [filterSalesContract, filterOrderNo, filterBuyerName, filterBuyerType, filterProcessType]
            };
        }
        query = { '$and': [deletedFilter, paging.filter, keywordFilter] }
        return query;
    }

    _beforeInsert(productionOrder) {
        productionOrder.orderNo = productionOrder.orderNo === "" ? generateCode() : productionOrder.orderNo;
        productionOrder._createdDate = new Date();
        return Promise.resolve(productionOrder);
    }

    _validate(productionOrder) {
        var errors = {};

        var valid = productionOrder;
        var getProductionOrder = this.collection.singleOrDefault({
            _id: {
                '$ne': new ObjectId(valid._id)
            },
            orderNo: valid.orderNo
        });

        var uomQuery = {
            "unit": "MTR"
        };
        //var getUom =this.UomManager.getSingleByQueryOrDefault(uomQuery);

        var getBuyer = ObjectId.isValid(valid.buyerId) ? this.BuyerManager.getSingleByIdOrDefault(valid.buyerId) : Promise.resolve(null);
        var getUom = valid.uom && ObjectId.isValid(valid.uomId) ? this.UomManager.getSingleByIdOrDefault(valid.uomId) : this.UomManager.getSingleByQueryOrDefault(uomQuery);

        var getProduct = ObjectId.isValid(valid.materialId) ? this.ProductManager.getSingleByIdOrDefault(valid.materialId) : Promise.resolve(null);
        var getProcessType = ObjectId.isValid(valid.processTypeId) ? this.ProcessTypeManager.getSingleByIdOrDefault(valid.processTypeId) : Promise.resolve(null);
        var getOrderType = ObjectId.isValid(valid.orderTypeId) ? this.OrderTypeManager.getSingleByIdOrDefault(valid.orderTypeId) : Promise.resolve(null);
        var getFinishType = ObjectId.isValid(valid.finishTypeId) ? this.FinishTypeManager.getSingleByIdOrDefault(valid.finishTypeId) : Promise.resolve(null);
        var getYarnMaterial = ObjectId.isValid(valid.yarnMaterialId) ? this.YarnMaterialManager.getSingleByIdOrDefault(valid.yarnMaterialId) : Promise.resolve(null);
        var getStandardTest = ObjectId.isValid(valid.standardTestId) ? this.StandardTestManager.getSingleByIdOrDefault(valid.standardTestId) : Promise.resolve(null);
        var getMaterialConstruction = ObjectId.isValid(valid.materialConstructionId) ? this.MaterialConstructionManager.getSingleByIdOrDefault(valid.materialConstructionId) : Promise.resolve(null);
        var getAccount = ObjectId.isValid(valid.accountId) ? this.AccountManager.getSingleByIdOrDefault(valid.accountId) : Promise.resolve(null);
        var getSC = ObjectId.isValid(valid.salesContractId) ? this.fpSalesContractManager.getSingleByIdOrDefault(valid.salesContractId) : Promise.resolve(null);

        valid.details = valid.details || [];
        var getColorTypes = [];
        for (var detail of valid.details) {
            if (ObjectId.isValid(detail.colorTypeId)) {
                var color = ObjectId.isValid(detail.colorTypeId) ? this.ColorTypeManager.getSingleByIdOrDefault(detail.colorTypeId) : Promise.resolve(null);
                getColorTypes.push(color);
            }
        }

        valid.lampStandards = valid.lampStandards || [];
        var getLampStandards = [];
        for (var lamp of valid.lampStandards) {
            if (ObjectId.isValid(lamp.lampStandardId)) {
                var lamps = ObjectId.isValid(lamp.lampStandardId) ? this.LampStandardManager.getSingleByIdOrDefault(lamp.lampStandardId) : Promise.resolve(null);
                getLampStandards.push(lamps);
            }
        }

        return Promise.all([getProductionOrder, getBuyer, getUom, getProduct, getProcessType, getOrderType, getFinishType, getYarnMaterial, getStandardTest, getMaterialConstruction, getAccount, getSC].concat(getColorTypes, getLampStandards))
            .then(results => {
                var _productionOrder = results[0];
                var _buyer = results[1];
                var _uom = results[2];
                var _material = results[3];
                var _process = results[4];
                var _order = results[5];
                var _finish = results[6];
                var _yarn = results[7];
                var _standard = results[8];
                var _construction = results[9];
                var _account = results[10];
                var _sc = results[11];
                var _colors = results.slice(12, 12 + getColorTypes.length);
                var _lampStandards = results.slice(12 + getColorTypes.length, results.length);

                if (_productionOrder) {
                    errors["orderNo"] = i18n.__("ProductionOrder.orderNo.isExist:%s is Exist", i18n.__("Product.orderNo._:orderNo")); //"orderNo sudah ada";
                }


                if (valid.uom) {
                    if (!_uom)
                        errors["uom"] = i18n.__("ProductionOrder.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";
                }
                else
                    errors["uom"] = i18n.__("ProductionOrder.uom.isRequired:%s is required", i18n.__("Product.uom._:Uom")); //"Satuan tidak boleh kosong";

                if (!valid.salesContractNo || valid.salesContractNo === '') {
                    errors["salesContractNo"] = i18n.__("ProductionOrder.salesContractNo.isRequired:%s is required", i18n.__("ProductionOrder.salesContractNo._:SalesContractNo")); //"salesContractNo tidak boleh kosong";
                }

                if (!_sc)
                    errors["salesContractNo"] = i18n.__("ProductionOrder.salesContractNo.isRequired:%s is not exists", i18n.__("ProductionOrder.salesContractNo._:SalesContractNo")); //"salesContractNo tidak boleh kosong";


                if (!_material)
                    errors["material"] = i18n.__("ProductionOrder.material.isRequired:%s is not exists", i18n.__("ProductionOrder.material._:Material")); //"material tidak boleh kosong";

                if (!_process)
                    errors["processType"] = i18n.__("ProductionOrder.processType.isRequired:%s is not exists", i18n.__("ProductionOrder.processType._:ProcessType")); //"processType tidak boleh kosong";

                if (!_order)
                    errors["orderType"] = i18n.__("ProductionOrder.orderType.isRequired:%s is not exists", i18n.__("ProductionOrder.orderType._:OrderType")); //"orderType tidak boleh kosong";

                if (!_yarn)
                    errors["yarnMaterial"] = i18n.__("ProductionOrder.yarnMaterial.isRequired:%s is not exists", i18n.__("ProductionOrder.yarnMaterial._:YarnMaterial")); //"yarnMaterial tidak boleh kosong";

                if (!_construction)
                    errors["materialConstruction"] = i18n.__("ProductionOrder.materialConstruction.isRequired:%s is not exists", i18n.__("ProductionOrder.materialConstruction._:MaterialConstruction")); //"materialConstruction tidak boleh kosong";

                if (!_finish)
                    errors["finishType"] = i18n.__("ProductionOrder.finishType.isRequired:%s is not exists", i18n.__("ProductionOrder.finishType._:FinishType")); //"finishType tidak boleh kosong";

                if (!_standard)
                    errors["standardTest"] = i18n.__("ProductionOrder.standardTest.isRequired:%s is not exists", i18n.__("ProductionOrder.standardTest._:StandardTest")); //"standardTest tidak boleh kosong";

                if (!_account) {
                    errors["account"] = i18n.__("ProductionOrder.account.isRequired:%s is not exists", i18n.__("ProductionOrder.account._:Account")); //"account tidak boleh kosong";
                }
                if (!valid.packingInstruction || valid.packingInstruction === '') {
                    errors["packingInstruction"] = i18n.__("ProductionOrder.packingInstruction.isRequired:%s is required", i18n.__("ProductionOrder.packingInstruction._:PackingInstruction")); //"PackingInstruction tidak boleh kosong";
                }

                if (!valid.materialOrigin || valid.materialOrigin === '') {
                    errors["materialOrigin"] = i18n.__("ProductionOrder.materialOrigin.isRequired:%s is required", i18n.__("ProductionOrder.materialOrigin._:MaterialOrigin")); //"materialOrigin tidak boleh kosong";
                }

                if (!valid.finishWidth || valid.finishWidth === '') {
                    errors["finishWidth"] = i18n.__("ProductionOrder.finishWidth.isRequired:%s is required", i18n.__("ProductionOrder.finishWidth._:FinishWidth")); //"finishWidth tidak boleh kosong";
                }

                if (!valid.sample || valid.sample === '') {
                    errors["sample"] = i18n.__("ProductionOrder.sample.isRequired:%s is required", i18n.__("ProductionOrder.sample._:Sample")); //"sample tidak boleh kosong";
                }

                if (!valid.handlingStandard || valid.handlingStandard === '') {
                    errors["handlingStandard"] = i18n.__("ProductionOrder.handlingStandard.isRequired:%s is required", i18n.__("ProductionOrder.handlingStandard._:HandlingStandard")); //"handlingStandard tidak boleh kosong";
                }

                if (!valid.shrinkageStandard || valid.shrinkageStandard === '') {
                    errors["shrinkageStandard"] = i18n.__("ProductionOrder.shrinkageStandard.isRequired:%s is required", i18n.__("ProductionOrder.shrinkageStandard._:ShrinkageStandard")); //"shrinkageStandard tidak boleh kosong";
                }

                if (!valid.deliveryDate || valid.deliveryDate === "") {
                    errors["deliveryDate"] = i18n.__("ProductionOrder.deliveryDate.isRequired:%s is required", i18n.__("ProductionOrder.deliveryDate._:deliveryDate")); //"deliveryDate tidak boleh kosong";
                }
                // else{
                //     valid.deliveryDate=new Date(valid.deliveryDate);
                //     var today=new Date();
                //     today.setHours(0,0,0,0);
                //     if(today>valid.deliveryDate){
                //         errors["deliveryDate"] = i18n.__("ProductionOrder.deliveryDate.shouldNot:%s should not be less than today's date", i18n.__("ProductionOrder.deliveryDate._:deliveryDate")); //"deliveryDate tidak boleh kurang dari tanggal hari ini";
                //     }
                // }

                if (_order) {
                    if (_order.name.trim().toLowerCase() == "printing") {
                        if (!valid.RUN || valid.RUN == "") {
                            errors["RUN"] = i18n.__("ProductionOrder.RUN.isRequired:%s is required", i18n.__("ProductionOrder.RUN._:RUN")); //"RUN tidak boleh kosong";
                        }
                        if (valid.RUN && valid.RUN != "Tanpa RUN") {
                            if (!valid.RUNWidth || valid.RUNWidth.length <= 0) {
                                errors["RUNWidth"] = i18n.__("ProductionOrder.RUNWidth.isRequired:%s is required", i18n.__("ProductionOrder.RUNWidth._:RUNWidth")); //"RUNWidth tidak boleh kosong";
                            }
                            if (valid.RUNWidth.length > 0) {
                                for (var r = 0; r < valid.RUNWidth.length; r++) {
                                    if (valid.RUNWidth[r] <= 0) {
                                        errors["RUNWidth"] = i18n.__("ProductionOrder.RUNWidth.shouldNot:%s should not be less than or equal zero", i18n.__("ProductionOrder.RUNWidth._:RUNWidth")); //"RUNWidth tidak boleh nol";
                                        break;
                                    }
                                }
                            }
                        }
                        if (!valid.designNumber || valid.designNumber == "") {
                            errors["designNumber"] = i18n.__("ProductionOrder.designNumber.isRequired:%s is required", i18n.__("ProductionOrder.designNumber._:DesignNumber")); //"designNumber tidak boleh kosong";
                        }
                        if (!valid.designCode || valid.designCode == "") {
                            errors["designCode"] = i18n.__("ProductionOrder.designCode.isRequired:%s is required", i18n.__("ProductionOrder.designCode._:DesignCode")); //"designCode tidak boleh kosong";
                        }
                    }
                }

                if (!_buyer)
                    errors["buyer"] = i18n.__("ProductionOrder.buyer.isRequired:%s is not exists", i18n.__("ProductionOrder.buyer._:Buyer")); //"Buyer tidak boleh kosong";

                if (!valid.orderQuantity || valid.orderQuantity === 0)
                    errors["orderQuantity"] = i18n.__("ProductionOrder.orderQuantity.isRequired:%s is required", i18n.__("ProductionOrder.orderQuantity._:OrderQuantity")); //"orderQuantity tidak boleh kosong";
                else {
                    //validasi remainingQuantity SC
                    // if(valid.remainingQuantity!=undefined){
                    //     valid.remainingQuantity+=valid.beforeQuantity;
                    //     if(valid.orderQuantity>valid.remainingQuantity){
                    //         errors["orderQuantity"] =i18n.__("ProductionOrder.orderQuantity.isRequired:%s should not be more than SC remaining quantity", i18n.__("ProductionOrder.orderQuantity._:OrderQuantity"));
                    //     }
                    // }
                    var totalqty = 0;
                    if (valid.details.length > 0) {
                        for (var i of valid.details) {
                            totalqty += i.quantity;
                        }
                    }
                    if (valid.orderQuantity != totalqty) {
                        errors["orderQuantity"] = i18n.__("ProductionOrder.orderQuantity.shouldNot:%s should equal SUM quantity in details", i18n.__("ProductionOrder.orderQuantity._:OrderQuantity")); //"orderQuantity tidak boleh berbeda dari total jumlah detail";

                    }

                }

                if (valid.shippingQuantityTolerance > 100) {
                    errors["shippingQuantityTolerance"] = i18n.__("ProductionOrder.shippingQuantityTolerance.shouldNot:%s should not more than 100", i18n.__("ProductionOrder.shippingQuantityTolerance._:ShippingQuantityTolerance")); //"shippingQuantityTolerance tidak boleh lebih dari 100";
                }

                if (!valid.materialWidth || valid.materialWidth === "")
                    errors["materialWidth"] = i18n.__("ProductionOrder.materialWidth.isRequired:%s is required", i18n.__("ProductionOrder.materialWidth._:MaterialWidth")); //"materialWidth tidak boleh kosong";

                valid.lampStandards = valid.lampStandards || [];
                if (valid.lampStandards && valid.lampStandards.length <= 0) {
                    errors["lampStandards"] = i18n.__("ProductionOrder.lampStandards.isRequired:%s is required", i18n.__("ProductionOrder.lampStandards._:LampStandards")); //"Harus ada minimal 1 lampStandard";
                }
                else if (valid.lampStandards.length > 0) {
                    var lampErrors = [];
                    for (var lamp of valid.lampStandards) {
                        var lampError = {};
                        if (!_lampStandards || _lampStandards.length <= 0) {
                            lampError["lampStandards"] = i18n.__("ProductionOrder.lampStandards.lampStandard.isRequired:%s is not exists", i18n.__("ProductionOrder.lampStandards.lampStandard._:LampStandard")); //"lampStandard tidak boleh kosong";

                        }
                        if (!lamp.lampStandard._id) {
                            lampError["lampStandards"] = i18n.__("ProductionOrder.lampStandards.lampStandard.isRequired:%s is not exists", i18n.__("ProductionOrder.lampStandards.lampStandard._:LampStandard")); //"lampStandard tidak boleh kosong";

                        }
                        if (Object.getOwnPropertyNames(lampError).length > 0)
                            lampErrors.push(lampError);
                    }
                    if (lampErrors.length > 0)
                        errors.lampStandards = lampErrors;
                }

                valid.details = valid.details || [];
                if (valid.details && valid.details.length <= 0) {
                    errors["details"] = i18n.__("ProductionOrder.details.isRequired:%s is required", i18n.__("ProductionOrder.details._:Details")); //"Harus ada minimal 1 detail";
                }
                else if (valid.details.length > 0) {
                    var detailErrors = [];
                    var totalqty = 0;
                    for (var i of valid.details) {
                        totalqty += i.quantity;
                    }
                    for (var detail of valid.details) {
                        var detailError = {};
                        detail.code = generateCode();
                        if (!detail.colorRequest || detail.colorRequest == "")
                            detailError["colorRequest"] = i18n.__("ProductionOrder.details.colorRequest.isRequired:%s is required", i18n.__("ProductionOrder.details.colorRequest._:ColorRequest")); //"colorRequest tidak boleh kosong";
                        if (detail.quantity <= 0)
                            detailError["quantity"] = i18n.__("ProductionOrder.details.quantity.isRequired:%s is required", i18n.__("ProductionOrder.details.quantity._:Quantity")); //Jumlah barang tidak boleh kosong";
                        if (valid.orderQuantity != totalqty)
                            detailError["total"] = i18n.__("ProductionOrder.details.quantity.shouldNot:%s Total should equal Order Quantity", i18n.__("ProductionOrder.details.quantity._:Quantity")); //Jumlah barang tidak boleh berbeda dari jumlah order";

                        if (!_uom)
                            detailError["uom"] = i18n.__("ProductionOrder.details.uom.isRequired:%s is not exists", i18n.__("ProductionOrder.details.uom._:Uom")); //"satuan tidak boleh kosong";

                        if (_uom) {
                            detail.uomId = new ObjectId(_uom._id);
                        }
                        if (!detail.colorTemplate || detail.colorTemplate == "")
                            detailError["colorTemplate"] = i18n.__("ProductionOrder.details.colorTemplate.isRequired:%s is required", i18n.__("ProductionOrder.details.colorTemplate._:ColorTemplate")); //"colorTemplate tidak boleh kosong";

                    }
                    if (_order) {
                        if (_order.name.toLowerCase() == "yarn dyed" || _order.name.toLowerCase() == "printing") {
                            _colors = {};
                        }
                        else {
                            if (!_colors)
                                detailError["colorType"] = i18n.__("ProductionOrder.details.colorType.isRequired:%s is required", i18n.__("ProductionOrder.details.colorType._:ColorType")); //"colorType tidak boleh kosong";
                            else if (!detail.colorType) {
                                detailError["colorType"] = i18n.__("ProductionOrder.details.colorType.isRequired:%s is required", i18n.__("ProductionOrder.details.colorType._:ColorType")); //"colorType tidak boleh kosong";

                            }

                        }

                        if (Object.getOwnPropertyNames(detailError).length > 0)
                            detailErrors.push(detailError);
                    }
                    if (detailErrors.length > 0)
                        errors.details = detailErrors;

                }
                if (!valid.orderNo || valid.orderNo === '') {
                    valid.orderNo = generateCode();
                }
                if (_buyer) {
                    valid.buyerId = new ObjectId(_buyer._id);
                }
                if (_sc) {
                    valid.salesContractId = new ObjectId(_sc._id);
                }
                if (_uom) {
                    valid.uomId = new ObjectId(_uom._id);
                }
                if (_process) {
                    valid.processTypeId = new ObjectId(_process._id);
                }

                if (_account) {
                    valid.accountId = new ObjectId(_account._id);
                }

                if (valid.lampStandards.length > 0) {
                    for (var lamp of valid.lampStandards) {
                        for (var _lampStandard of _lampStandards) {
                            if (_lampStandard) {
                                if (lamp.lampStandardId.toString() === _lampStandard._id.toString()) {
                                    lamp.lampStandardId = _lampStandard._id;
                                    lamp.lampStandard = _lampStandard;
                                }
                            }
                        }
                    }
                }

                if (_order) {
                    valid.orderTypeId = new ObjectId(_order._id);
                    if (_order.name.toLowerCase() != "printing") {
                        valid.RUN = "";
                        valid.RUNWidth = [];
                        valid.designCode = "";
                        valid.designNumber = "";
                        valid.articleFabricEdge = "";
                    }
                    if (_order.name.toLowerCase() == "yarn dyed" || _order.name.toLowerCase() == "printing") {
                        for (var detail of valid.details) {
                            detail.colorTypeId = null;
                            detail.colorType = null;
                        }
                    }
                    else {
                        for (var detail of valid.details) {
                            if (detail.colorType) {
                                for (var _color of _colors) {
                                    if (_color) {
                                        if (detail.colorTypeId.toString() === _color._id.toString()) {
                                            detail.colorTypeId = _color._id;
                                            detail.colorType = _color;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (_material) {
                    valid.material = _material;
                    valid.materialId = new ObjectId(_material._id);
                }

                if (_finish) {
                    valid.finishType = _finish;
                    valid.finishTypeId = new ObjectId(_finish._id);
                }

                if (_yarn) {
                    valid.yarnMaterial = _yarn;
                    valid.yarnMaterialId = new ObjectId(_yarn._id);
                }

                if (_standard) {
                    valid.standardTest = _standard;
                    valid.standardTestId = _standard._id;
                }

                if (_construction) {
                    valid.materialConstruction = _construction;
                    valid.materialConstructionId = _construction._id;
                }

                valid.deliveryDate = new Date(valid.deliveryDate);

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require('module-toolkit').ValidationError;
                    return Promise.reject(new ValidationError('data does not pass validation', errors));
                }

                if (!valid.stamp) {
                    valid = new ProductionOrder(valid);
                }

                valid.stamp(this.user.username, "manager");

                return Promise.resolve(valid);
            });
    }

    _afterInsert(id) {
        return this.getSingleById(id)
            .then((spp) => {
                var sppId = id;
                return this.fpSalesContractManager.getSingleById(spp.salesContractId)
                    .then((sc) => {
                        if (sc.remainingQuantity != undefined) {
                            sc.remainingQuantity = sc.remainingQuantity - spp.orderQuantity;
                            return this.fpSalesContractManager.update(sc)
                                .then(
                                (id) =>
                                    Promise.resolve(sppId));
                        }
                        else {
                            Promise.resolve(sppId);
                        }
                    });

            });
    }

    _beforeUpdate(data) {
        return this.getSingleById(data._id)
            .then(spp => {
                if (spp.salesContractId) {
                    return this.fpSalesContractManager.getSingleById(spp.salesContractId)
                        .then((sc) => {
                            if (sc.remainingQuantity != undefined) {
                                sc.remainingQuantity = sc.remainingQuantity + spp.orderQuantity;
                                return this.fpSalesContractManager.update(sc)
                                    .then((id) =>
                                        Promise.resolve(data));
                            }
                            else {
                                return Promise.resolve(data);
                            }
                        });
                }
                else {
                    return Promise.resolve(data);
                }
            });
    }

    _afterUpdate(id) {
        return this.getSingleById(id)
            .then((spp) => {
                var sppId = id;
                if (spp.salesContractId) {
                    return this.fpSalesContractManager.getSingleById(spp.salesContractId)
                        .then((sc) => {
                            if (sc.remainingQuantity != undefined) {
                                sc.remainingQuantity -= spp.orderQuantity;
                            }
                            return this.fpSalesContractManager.update(sc)
                                .then((id) =>
                                    Promise.resolve(sppId));
                        });
                }
                else {
                    Promise.resolve(sppId);
                }
            });
    }

    delete(data) {
        return this.getSingleById(data._id)
            .then(spp => {
                spp._deleted = true;
                if (spp.salesContractId) {
                    return this.fpSalesContractManager.getSingleById(spp.salesContractId)
                        .then((sc) => {
                            if (sc.remainingQuantity != undefined) {
                                sc.remainingQuantity = sc.remainingQuantity + spp.orderQuantity;
                            }
                            return this.fpSalesContractManager.update(sc)
                                .then((id) => {
                                    return this.collection.update(spp);
                                });
                        });
                }
                else {
                    return this.collection.update(spp);
                }
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.sales.collection.ProductionOrder}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        }

        var noIndex = {
            name: `ix_${map.sales.collection.ProductionOrder}_orderNo`,
            key: {
                orderNo: 1
            },
            unique: true
        }

        return this.collection.createIndexes([dateIndex, noIndex]);
    }

    pdf(id) {
        return new Promise((resolve, reject) => {

            this.getSingleById(id)
                .then(productionOrder => {

                    var getDefinition = require("../../pdf/definitions/production-order");
                    var definition = getDefinition(productionOrder);

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

    getSingleProductionOrderDetail(detailCode) {
        return new Promise((resolve, reject) => {
            var query = { "details": { "$elemMatch": { "code": detailCode } } };
            this.collection.singleOrDefault(query).then((result) => {
                var dataReturn = {};
                if (result) {
                    for (var detail of result.details) {
                        if (detailCode === detail.code)
                            dataReturn = new ProductionOrderDetail(detail);
                    }
                }
                resolve(dataReturn);
            });
        });
    }

    getReport(query) {
        return new Promise((resolve, reject) => {
            if (!query.size) {
                query.size = 20;
            }
            if (!query.page) {
                query.page = 1;
            }
            var _page = parseInt(query.page);
            var _size = parseInt(query.size);
            var qry = Object.assign({});
            var filter = query.filter || {};

            if (query.salesContractNo) {
                Object.assign(qry, {
                    "salesContractNo": {
                        "$regex": (new RegExp(query.salesContractNo, "i"))
                    }
                });
            }
            if (query.salesContractNo) {
                Object.assign(qry, {
                    "salesContractNo": {
                        "$regex": (new RegExp(query.salesContractNo, "i"))
                    }
                });
            }
            if (query.orderNo) {
                Object.assign(qry, {
                    "orderNo": {
                        "$regex": (new RegExp(query.orderNo, "i"))
                    }
                });
            }
            if (query.orderNo) {
                Object.assign(qry, {
                    "orderNo": {
                        "$regex": (new RegExp(query.orderNo, "i"))
                    }
                });
            }
            if (query.orderTypeId) {
                Object.assign(qry, {
                    "orderTypeId": (new ObjectId(query.orderTypeId))
                });
            }
            if (query.orderTypeId) {
                Object.assign(qry, {
                    "orderTypeId": (new ObjectId(query.orderTypeId))
                });
            }
            if (query.processTypeId) {
                Object.assign(qry, {
                    "processTypeId": (new ObjectId(query.processTypeId))
                });
            }
            if (query.processTypeId) {
                Object.assign(qry, {
                    "processTypeId": (new ObjectId(query.processTypeId))
                });
            }

            if (query.buyerId) {
                Object.assign(qry, {
                    "buyerId": (new ObjectId(query.buyerId))
                });
            }

            if (query.buyerId) {
                Object.assign(qry, {
                    "buyerId": (new ObjectId(query.buyerId))
                });
            }
            if (query.accountId) {
                Object.assign(qry, {
                    "accountId": (new ObjectId(query.accountId))
                });
            }
            if (query.accountId) {
                Object.assign(qry, {
                    "accountId": (new ObjectId(query.accountId))
                });
            }
            if (query.sdate && query.edate) {
                Object.assign(qry, {
                    "_createdDate": {
                        "$gte": new Date(`${query.sdate} 00:00:00`),
                        "$lte": new Date(`${query.edate} 23:59:59`)
                    }
                });
            }

            if (query.sdate && query.edate) {
                Object.assign(qry, {
                    "_createdDate": {
                        "$gte": new Date(`${query.sdate} 00:00:00`),
                        "$lte": new Date(`${query.edate} 23:59:59`)
                    }
                });
            }

            qry = Object.assign(qry, { _deleted: false });
            var getPrdOrder = [];
            getPrdOrder.push(this.collection
                .aggregate([
                    { $match: qry },
                    { $unwind: "$details" },
                    { $group: { _id: null, count: { $sum: 1 } } }
                ])
                .toArray());
            if ((query.accept || '').toString().indexOf("application/xls") < 0) {
                getPrdOrder.push(this.collection
                    .aggregate([
                        { $match: qry },
                        { $unwind: "$details" },
                        {
                            $project: {
                                "salesContractNo": 1,
                                "_createdDate": 1,
                                "orderNo": 1,
                                "orderType": "$orderType.name",
                                "processType": "$processType.name",
                                "buyer": "$buyer.name",
                                "buyerType": "$buyer.type",
                                "orderQuantity": "$orderQuantity",
                                "uom": "$uom.unit",
                                "colorCode": "$details.code",
                                // "colorTemplate": "$details.colorTemplate",
                                // "colorRequest": "$details.colorRequest",
                                // "colorType": "$details.colorType.name",
                                "quantity": "$details.quantity",
                                // "uomDetail": "$details.uom.unit",
                                "deliveryDate": "$deliveryDate",
                                "firstname": "$account.profile.firstname",
                                "lastname": "$account.profile.lastname",
                                "materialName": "$material.name",
                                "materialConstruction": "$materialConstruction.name",
                                "materialWidth": "$materialWidth",
                                "designMotive": "$designMotive.name",
                            }
                        },
                        { $sort: { "_createdDate": -1 } },
                        { $skip: ((_page - 1) * _size) },
                        { $limit: (_size) }
                    ])
                    .toArray());
            } else {
                getPrdOrder.push(this.collection
                    .aggregate([
                        { $match: qry },
                        { $unwind: "$details" },
                        {
                            $project: {
                                "salesContractNo": 1,
                                "_createdDate": 1,
                                "orderNo": 1,
                                "orderType": "$orderType.name",
                                "processType": "$processType.name",
                                "buyer": "$buyer.name",
                                "buyerType": "$buyer.type",
                                "orderQuantity": "$orderQuantity",
                                "uom": "$uom.unit",
                                "colorCode": "$details.code",
                                // "colorTemplate": "$details.colorTemplate",
                                // "colorRequest": "$details.colorRequest",
                                // "colorType": "$details.colorType.name",
                                "quantity": "$details.quantity",
                                // "uomDetail": "$details.uom.unit",
                                "deliveryDate": "$deliveryDate",
                                "firstname": "$account.profile.firstname",
                                "lastname": "$account.profile.lastname",
                                "materialName": "$material.name",
                                "materialConstruction": "$materialConstruction.name",
                                "materialWidth": "$materialWidth",
                                "designMotive": "$designMotive.name",
                            }
                        },
                        { $sort: { "_createdDate": -1 } }
                    ])
                    .toArray());
            }
            Promise.all(getPrdOrder).then(result => {
                var resCount = result[0];
                var count = resCount.length > 0 ? resCount[0].count : 0;
                var prodOrders = result[1];
                prodOrders = [].concat.apply([], prodOrders);

                var jobsGetDailyOperation = [];
                prodOrders.map((prodOrder) => {
                    jobsGetDailyOperation.push(this.dailyOperationCollection.aggregate([
                        {
                            $match: {
                                "type": "input",
                                "_deleted": false,
                                "kanban.selectedProductionOrderDetail.code": prodOrder.colorCode,
                                "kanban.productionOrder.orderNo": prodOrder.orderNo
                            }
                        }, {
                            $project:
                            {
                                "orderNo": "$kanban.productionOrder.orderNo",
                                "kanbanCode": "$kanban.code",
                                "colorCode": "$kanban.selectedProductionOrderDetail.code",
                                "input": 1
                            }
                        }
                    ]).toArray());
                })
                if (jobsGetDailyOperation.length == 0) {
                    jobsGetDailyOperation.push(Promise.resolve(null))
                }
                Promise.all(jobsGetDailyOperation).then(dailyOperations => {//Get DailyOperation
                    dailyOperations = [].concat.apply([], dailyOperations);
                    dailyOperations = this.cleanUp(dailyOperations);
                    var jobsGetQC = [];
                    var no = 1;
                    prodOrders.map((prodOrder) => {
                        var _dailyOperations = dailyOperations.filter(function (dailyOperation) {
                            return dailyOperation.orderNo === prodOrder.orderNo && dailyOperation.colorCode === prodOrder.colorCode;
                        })
                        var filters = ["orderNo", "colorCode", "kanbanCode"];
                        _dailyOperations = this.removeDuplicates(_dailyOperations, filters);

                        if (_dailyOperations.length > 0) {
                            var kanbanCodes = [];
                            _dailyOperations.some(function (dailyOperation, idx) {
                                kanbanCodes.push(dailyOperation.kanbanCode);
                            });
                            var sum = _dailyOperations
                                .map(dailyOperation => dailyOperation.input)
                                .reduce(function (prev, curr, index, arr) {
                                    return prev + curr;
                                }, 0);

                            for (var dailyOperation of _dailyOperations) {
                                jobsGetQC.push(this.fabricQualityControlCollection.aggregate([
                                    {
                                        $match: {
                                            "_deleted": false,
                                            "productionOrderNo": dailyOperation.orderNo,
                                            "kanbanCode": dailyOperation.kanbanCode
                                        }
                                    }, {
                                        $project:
                                        {
                                            "productionOrderNo": 1,
                                            "kanbanCode": 1,
                                            "orderQuantityQC": { $sum: "$fabricGradeTests.initLength" }
                                        }
                                    }
                                ]).toArray());
                            }
                            prodOrder.input = sum;
                            prodOrder.kanbanCodes = kanbanCodes;
                        }
                        else {
                            prodOrder.input = 0;
                            prodOrder.kanbanCodes = [];
                        }
                        prodOrder.staffName = `${prodOrder.firstname} ${prodOrder.lastname}`;
                        prodOrder.no = no;
                        var construction = `${prodOrder.materialName} / ${prodOrder.materialConstruction} / ${prodOrder.materialWidth}`;
                        var designMotive = prodOrder.designMotive;
                        prodOrder.designMotive = designMotive;
                        prodOrder.construction = construction;
                        no++;
                    })
                    if (jobsGetQC.length == 0) {
                        jobsGetQC.push(Promise.resolve(null))
                    }
                    Promise.all(jobsGetQC).then(qualityControls => {//Get QC
                        qualityControls = [].concat.apply([], qualityControls);
                        qualityControls = this.cleanUp(qualityControls);
                        prodOrders.map((prodOrder) => {
                            var _qualityControls = qualityControls.filter(function (qualityControl) {
                                return qualityControl.productionOrderNo === prodOrder.orderNo && prodOrder.kanbanCodes.includes(qualityControl.kanbanCode);
                            })
                            // filters = ["productionOrderNo", "kanbanCode"];
                            // _qualityControls = this.removeDuplicates(_qualityControls, filters);
                            var _orderQuantityQC = 0
                            if (_qualityControls.length > 0) {
                                _orderQuantityQC = _qualityControls
                                    .map(qualityControl => qualityControl.orderQuantityQC)
                                    .reduce(function (prev, curr, index, arr) {
                                        return prev + curr;
                                    }, 0);
                            }
                            prodOrder.orderQuantityQC = _orderQuantityQC;

                            if (prodOrder.orderQuantityQC > 0) {
                                prodOrder.status = "Sudah dalam pemeriksaan kain";
                            } else if (prodOrder.input > 0) {
                                prodOrder.status = "Sudah dalam produksi";
                            } else if (prodOrder.input == 0) {
                                prodOrder.status = "Belum dalam produksi";
                            }
                            prodOrder.detail = `${prodOrder.quantity} di spp\n${prodOrder.input} di produksi\n${prodOrder.orderQuantityQC} di pemeriksaan`;

                        })
                        var results = {
                            data: prodOrders,
                            count: prodOrders.length,
                            size: 20,
                            total: count,
                            page: (_page * _size) / _size
                        };
                        resolve(results);
                    })
                })
            })
        });
    }

    getSalesMonthlyReport(query) {
        return new Promise((resolve, reject) => {
            var qry = Object.assign({});
            var filter = query.filter || {};

            if (filter.orderTypeId) {
                Object.assign(qry, {
                    "orderTypeId": (new ObjectId(filter.orderTypeId))
                });
            }

            if (filter.accountId) {
                Object.assign(qry, {
                    "accountId": (new ObjectId(filter.accountId))
                });
            }

            if (filter.sdate && filter.edate) {
                Object.assign(qry, {
                    "_createdDate": {
                        "$gte": new Date(`${filter.sdate} 00:00:00`),
                        "$lte": new Date(`${filter.edate} 23:59:59`)
                    }
                });
            }

            qry = Object.assign(qry, { _deleted: false });
            var getPrdOrder = [];
            var orderInMeter = { "$cond": [{ "$eq": ["$uom.unit", "YDS"] }, { $multiply: ["$orderQuantity", 0.9144] }, "$orderQuantity"] }
            getPrdOrder.push(this.collection
                .aggregate([
                    { $match: qry }
                ])
                .toArray());
            getPrdOrder.push(this.collection
                .aggregate([
                    { $match: qry },
                    {
                        $project: {
                            "account": "$account.username",
                            "januari": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 1] }, orderInMeter, 0] },
                            "februari": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 2] }, orderInMeter, 0] },
                            "maret": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 3] }, orderInMeter, 0] },
                            "april": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 4] }, orderInMeter, 0] },
                            "mei": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 5] }, orderInMeter, 0] },
                            "juni": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 6] }, orderInMeter, 0] },
                            "juli": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 7] }, orderInMeter, 0] },
                            "agustus": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 8] }, orderInMeter, 0] },
                            "september": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 9] }, orderInMeter, 0] },
                            "oktober": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 10] }, orderInMeter, 0] },
                            "november": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 11] }, orderInMeter, 0] },
                            "desember": { "$cond": [{ "$eq": [{ "$month": "$_createdDate" }, 12] }, orderInMeter, 0] },
                            "totalOrder": orderInMeter
                        }
                    },
                    {
                        $group: {
                            _id: { "sales": "$account" },
                            "jan": { "$sum": "$januari" },
                            "feb": { "$sum": "$februari" },
                            "mar": { "$sum": "$maret" },
                            "apr": { "$sum": "$april" },
                            "mei": { "$sum": "$mei" },
                            "jun": { "$sum": "$juni" },
                            "jul": { "$sum": "$juli" },
                            "agu": { "$sum": "$agustus" },
                            "sep": { "$sum": "$september" },
                            "okt": { "$sum": "$oktober" },
                            "nov": { "$sum": "$november" },
                            "des": { "$sum": "$desember" },
                            "totalOrder": { "$sum": "$totalOrder" }
                        }
                    }
                ])
                .toArray());
            Promise.all(getPrdOrder).then(result => {
                var resCount = result[0];
                var prodOrders = result[1];
                prodOrders = [].concat.apply([], prodOrders);

                var results = {
                    data: prodOrders,
                };
                resolve(results);
            })
        });
    }

    getDetailReport(salesContractNo) {
        return new Promise((resolve, reject) => {
            var qry = Object.assign({});
            var data = {}
            if (salesContractNo) {
                Object.assign(qry, {
                    "salesContractNo": {
                        "$regex": (new RegExp(salesContractNo, "i"))
                    }
                });
            }
            qry = Object.assign(qry, { _deleted: false });

            this.collection
                .aggregate([
                    { $match: qry },
                    { $unwind: "$details" },
                    {
                        $group: {
                            "_id": "$orderNo",
                            "salesContractNo": { "$first": "$salesContractNo" },
                            "orderQuantity": { "$first": "$orderQuantity" },
                            "uom": { "$first": "$uom.unit" },
                            "details": {
                                "$push": {
                                    "colorTemplate": "$details.colorTemplate",
                                    "colorCode": "$details.code",
                                    "colorRequest": "$details.colorRequest",
                                    "colorType": "$details.colorType.name",
                                    "quantity": "$details.quantity",
                                    "uomDetail": "$details.uom.unit",
                                }
                            }
                        }
                    },
                    { $sort: { "_createdDate": -1 } }
                ])
                .toArray().then(prodOrders => {
                    prodOrders = [].concat.apply([], prodOrders);
                    Object.assign(data, { productionOrders: prodOrders });
                    var _prodOrders = prodOrders.map((prodOrder) => {
                        return prodOrder.details.map((detail) => {
                            return {
                                salesContractNo: prodOrder.salesContractNo,
                                orderNo: prodOrder._id,
                                colorCode: detail.colorCode
                            }
                        })
                    })
                    _prodOrders = [].concat.apply([], _prodOrders);

                    var filters = ["orderNo"];
                    _prodOrders = this.removeDuplicates(_prodOrders, filters);
                    var jobsGetDailyOperation = [];
                    for (var prodOrder of _prodOrders) {
                        jobsGetDailyOperation.push(this.dailyOperationCollection.aggregate([
                            {
                                $match: {
                                    "type": "input",
                                    "_deleted": false,
                                    // "kanban.selectedProductionOrderDetail.code": prodOrder.colorCode,
                                    "kanban.productionOrder.orderNo": prodOrder.orderNo
                                }
                            },
                            // {
                            //     $unwind: "$kanban.instruction.steps"
                            // },
                            {
                                $project:
                                {
                                    "orderNo": "$kanban.productionOrder.orderNo",
                                    "kanbanCode": "$kanban.code",
                                    "machine": "$machine.name",
                                    "color": "$kanban.selectedProductionOrderDetail.colorRequest",
                                    // "step": "$kanban.instruction.steps.process",
                                    "step": "$step.process",
                                    "area": "$step.processArea",
                                    // "cmp": { "$eq": ["$stepId", "$kanban.instruction.steps._id"] },
                                    "qty": "$input"
                                }
                            },
                            // {
                            //     $match: { "cmp": true }
                            // },
                            { $sort: { "kanbanCode": -1, "_createdDate": 1 } }
                        ]).toArray());
                    }
                    if (jobsGetDailyOperation.length == 0) {
                        jobsGetDailyOperation.push(Promise.resolve(null))
                    }
                    Promise.all(jobsGetDailyOperation).then(dailyOperations => {
                        dailyOperations = [].concat.apply([], dailyOperations);
                        var _dailyOperations = []
                        if (dailyOperations.length > 0) {
                            dailyOperations.reduce(function (res, value) {
                                if (!res[`${value.step}${value.machine}${value.color}${value.orderNo}`]) {
                                    res[`${value.step}${value.machine}${value.color}${value.orderNo}`] = {
                                        qty: 0,
                                        orderNo: value.orderNo,
                                        color: value.color,
                                        step: value.step,
                                        area: value.area,
                                        machine: value.machine,
                                        kanbanCode: value.kanbanCode
                                    };
                                    _dailyOperations.push(res[`${value.step}${value.machine}${value.color}${value.orderNo}`])
                                }
                                res[`${value.step}${value.machine}${value.color}${value.orderNo}`].qty += value.qty
                                return res;
                            }, {});
                        }
                        _dailyOperations = this.cleanUp(_dailyOperations);
                        dailyOperations = this.cleanUp(dailyOperations);
                        Object.assign(data, { dailyOperations: _dailyOperations });
                        var jobsGetQC = []
                        var filters = ["orderNo", "colorCode", "kanbanCode"];
                        var _dailyOperations = this.removeDuplicates(dailyOperations, filters);
                        for (var dailyOperation of _dailyOperations) {
                            jobsGetQC.push(this.fabricQualityControlCollection.aggregate([
                                {
                                    $match: {
                                        "_deleted": false,
                                        "productionOrderNo": dailyOperation.orderNo,
                                        "kanbanCode": dailyOperation.kanbanCode
                                    }
                                },
                                { $unwind: "$fabricGradeTests" },
                                {
                                    $group:
                                    {
                                        "_id": "$fabricGradeTests.grade",
                                        "productionOrderNo": { "$first": "$productionOrderNo" },
                                        "qty": { "$sum": "$fabricGradeTests.initLength" },
                                    }
                                }, {
                                    $sort: { "_id": 1 }
                                }
                            ]).toArray());
                        }
                        if (jobsGetQC.length == 0) {
                            jobsGetQC.push(Promise.resolve(null))
                        }
                        Promise.all(jobsGetQC).then(qualityControls => {
                            qualityControls = [].concat.apply([], qualityControls);
                            qualityControls = this.cleanUp(qualityControls);
                            Object.assign(data, { qualityControls: qualityControls });
                            resolve(data);
                        })
                    })
                })
        });
    }

    removeDuplicates(arr, filters) {
        var new_arr = [];
        var lookup = {};
        for (var i in arr) {
            var attr = "";
            for (var n in filters) {
                attr += arr[i][filters[n]];
            }
            if (!lookup[attr]) {
                lookup[attr] = arr[i];
            }
        }

        for (i in lookup) {
            new_arr.push(lookup[i]);
        }

        return new_arr;
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

    //#endregion CRUD and Report

    //#region Status Order

    getOrderStatusReport(info) {
        var year = parseInt(info.year);
        var orderType = info.orderType;

        return this.getProductionOrderData(year, orderType)
            .then((productionOrders) => {
                var getDailyOperationStatus = this.getDailyOperationStatus(year, orderType);
                var getProductionOrderStatus = this.getProductionOrderStatus(year, orderType);
                var getPackingReceiptStatus = this.getPackingReceiptStatus(year, orderType, productionOrders);
                var getShipmentStatus = this.getShipmentStatus(year, orderType, productionOrders);
                // var getProductionOrderNotInKanban = this.getProductionOrderNotInKanban(year, null, orderType);

                return Promise.all([getProductionOrderStatus, getDailyOperationStatus, getPackingReceiptStatus, getShipmentStatus])
                    .then((results) => {
                        var _productionOrders = results[0];
                        var dailyOperations = results[1];
                        var packingReceipts = results[2];
                        var packingShipments = results[3];
                        // var productionOrdersNotInKanban = results[4];

                        var data = [];
                        var monthName = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

                        var grandTotal = {};
                        grandTotal.name = "Total"
                        grandTotal.preProductionQuantity = 0;
                        grandTotal.onProductionQuantity = 0;
                        grandTotal.orderQuantity = 0;

                        grandTotal.storageQuantity = 0;
                        grandTotal.shipmentQuantity = 0;
                        grandTotal.productionOrderNotInKanbanQuantity = 0;
                        for (var i = 0; i < 12; i++) {
                            var datum = {};

                            datum.name = monthName[i];

                            datum.preProductionQuantity = 0;
                            datum.onProductionQuantity = 0;
                            for (var dailyOperation of dailyOperations) {
                                let dailyMonth, dailyYear, dailyQuantity;
                                let processArea = dailyOperation.step ? dailyOperation.step.processArea : null;

                                if (processArea) {
                                    switch (dailyOperation.type.toLowerCase()) {
                                        case "input": {
                                            dailyMonth = moment(dailyOperation.dateInput).month();
                                            dailyYear = moment(dailyOperation.dateInput).year();
                                            dailyQuantity = dailyOperation.input;
                                            break;
                                        }
                                        case "output": {
                                            dailyMonth = moment(dailyOperation.dateOutput).month();
                                            dailyYear = moment(dailyOperation.dateOutput).year();
                                            dailyQuantity = dailyOperation.goodOutput;
                                            break;
                                        }
                                    }

                                    if (dailyMonth === i && dailyYear === year) {
                                        if (processArea.toLowerCase() === "area pre treatment") {
                                            grandTotal.preProductionQuantity += dailyQuantity;
                                            datum.preProductionQuantity += dailyQuantity;
                                        } else if (processArea.toLowerCase() !== "area pre treatment" && processArea.toLowerCase() !== "area inspecting" && processArea.toLowerCase() !== "area qc") {
                                            grandTotal.onProductionQuantity += dailyQuantity;
                                            datum.onProductionQuantity += dailyQuantity;
                                        }
                                    }
                                }
                            }

                            datum.orderQuantity = 0;
                            for (var productionOrder of _productionOrders) {
                                if (productionOrder.month - 1 === i) {
                                    grandTotal.orderQuantity += productionOrder.quantity;
                                    datum.orderQuantity += productionOrder.quantity;
                                }
                            }

                            datum.storageQuantity = 0;
                            for (var packingReceipt of packingReceipts) {
                                if (packingReceipt.month - 1 === i) {
                                    grandTotal.storageQuantity += packingReceipt.quantity;
                                    datum.storageQuantity += packingReceipt.quantity;
                                }
                            }

                            datum.shipmentQuantity = 0;
                            for (var packingShipment of packingShipments) {
                                if (packingShipment.month - 1 === i) {
                                    grandTotal.shipmentQuantity += packingShipment.quantity;
                                    datum.shipmentQuantity += packingShipment.quantity;
                                }
                            }

                            // datum.productionOrderNotInKanbanQuantity = 0;
                            // for (var productionOrderNotInKanban of productionOrdersNotInKanban) {
                            //     if (productionOrderNotInKanban.month - 1 === i) {
                            //         grandTotal.productionOrderNotInKanbanQuantity += productionOrderNotInKanban.quantity;
                            //         datum.productionOrderNotInKanbanQuantity += productionOrderNotInKanban.quantity;
                            //     }
                            // }

                            datum.preProductionQuantity = datum.preProductionQuantity;
                            datum.onProductionQuantity = datum.onProductionQuantity;
                            datum.orderQuantity = datum.orderQuantity;
                            datum.storageQuantity = datum.storageQuantity;
                            datum.shipmentQuantity = datum.shipmentQuantity;
                            datum.productionOrderNotInKanbanQuantity = datum.productionOrderNotInKanbanQuantity;

                            data.push(datum);
                        }

                        grandTotal.preProductionQuantity = grandTotal.preProductionQuantity;
                        grandTotal.onProductionQuantity = grandTotal.onProductionQuantity;
                        grandTotal.orderQuantity = grandTotal.orderQuantity;

                        grandTotal.storageQuantity = grandTotal.storageQuantity;
                        grandTotal.shipmentQuantity = grandTotal.shipmentQuantity;
                        grandTotal.productionOrderNotInKanbanQuantity = grandTotal.productionOrderNotInKanbanQuantity;

                        data.push(grandTotal);

                        return Promise.resolve(data)
                    });
            });
    }

    getProductionOrderNotInKanban(year, month, orderType) {
        let query = {
            "_deleted": false,
            "year": year,
            "month": month
        };

        switch (orderType.toString().toLowerCase()) {
            case "yarn dyed":
            case "printing": {
                query["orderType.name"] = orderType;
                break;
            }
            case "dyeing":
            case "white": {
                query["processType.name"] = orderType;
                break;
            }
            default: {
                query["$or"] = [
                    { "orderType.name": { "$in": ["PRINTING", "YARN DYED"] } },
                    { "processType.name": { "$in": ["WHITE", "DYEING"] } }
                ];
            }
        }

        return this.collection.aggregate([
            {
                $project: {
                    _deleted: 1,
                    month: { $month: "$deliveryDate" },
                    year: { $year: "$deliveryDate" },
                    "processType.name": 1,
                    "orderType.name": 1,
                    orderNo: 1
                }
            },
            {
                $match: query
            },
            {
                $lookup:
                {
                    from: "kanbans",
                    localField: "orderNo",
                    foreignField: "productionOrder.orderNo",
                    as: "kanbans"
                }
            },
            {
                $project: {
                    orderNo: 1,
                    "kanbans._deleted": 1,
                }
            }
        ]).toArray()
            .then((productionOrders) => {
                var productionOrderData = [];

                if (productionOrders.length > 0) {
                    for (var productionOrder of productionOrders) {
                        if (productionOrder.kanbans) {
                            if (productionOrder.kanbans.length === 0) {
                                productionOrderData.push(productionOrder);
                            }
                            else {
                                let valid = true;
                                for (let i = 0; i < productionOrder.kanbans.length; i++) {
                                    if (productionOrder.kanbans[i]._deleted === false) {
                                        valid = false;
                                        break;
                                    }
                                }

                                if (valid === true) {
                                    productionOrderData.push(productionOrder);
                                }
                            }

                        }
                    }
                }

                return Promise.resolve(productionOrderData);
            });
    }

    getProductionOrderData(year, orderType) {
        let query = {
            "_deleted": false,
            "year": year
        };

        switch (orderType.toString().toLowerCase()) {
            case "yarn dyed":
            case "printing": {
                query["orderType.name"] = orderType;
                break;
            }
            case "dyeing":
            case "white": {
                query["processType.name"] = orderType;
                break;
            }
            default: {
                query["$or"] = [
                    { "orderType.name": { "$in": ["PRINTING", "YARN DYED"] } },
                    { "processType.name": { "$in": ["WHITE", "DYEING"] } }
                ];
            }
        }

        return this.collection.aggregate([
            {
                "$project": {
                    "_deleted": 1,
                    "processType.name": 1,
                    "orderType.name": 1,
                    "orderNo": 1,
                    "year": {
                        "$year": "$deliveryDate"
                    }
                }
            },
            {
                "$match": query
            }
        ]).toArray()
    }

    getShipmentStatus(year, orderType, productionOrders) {
        var orderNumbers = productionOrders.map((productionOrder) => productionOrder.orderNo);

        return this.fpPackingShipmentCollection.aggregate([
            {
                "$match": {
                    "_deleted": false,
                    "details.productionOrderNo": {
                        "$in": orderNumbers
                    }
                }
            },
            {
                "$project": {
                    "_deleted": 1,
                    "year": {
                        "$year": "$deliveryDate"
                    },
                    "month": {
                        "$month": "$deliveryDate"
                    },
                    "details.productionOrderNo": 1,
                    "details.items": 1
                }
            },
            {
                "$match": {
                    "year": year
                }
            }
        ]).toArray()
            .then((shipmentDocuments) => {
                var shipmentDocumentData = [];

                if (shipmentDocuments.length > 0) {
                    for (var shipmentDocument of shipmentDocuments) {
                        var shipmentDocumentDatum = {};

                        shipmentDocumentDatum.month = shipmentDocument.month;

                        shipmentDocumentDatum.quantity = 0;
                        if (shipmentDocument.details && shipmentDocument.details.length > 0) {
                            for (var detail of shipmentDocument.details) {
                                // var orderNumber = orderNumbers.find((orderNo) => orderNo.toString() === detail.productionOrderNo.toString());

                                if (detail.items) {
                                    for (var item of detail.items) {
                                        if (item.packingReceiptItems && item.packingReceiptItems.length > 0) {
                                            for (var packingReceiptItem of item.packingReceiptItems) {
                                                shipmentDocumentDatum.quantity = shipmentDocumentDatum.quantity + (packingReceiptItem.quantity && packingReceiptItem.length ? (packingReceiptItem.quantity * packingReceiptItem.length) : 0);
                                            }
                                        } else if (item.quantity) {
                                            shipmentDocumentDatum.quantity = shipmentDocumentDatum.quantity + (item.quantity && item.length ? (item.quantity * item.length) : 0);
                                        }
                                    }
                                }
                            }
                        }

                        shipmentDocumentData.push(shipmentDocumentDatum);
                    }
                }


                return Promise.resolve(shipmentDocumentData);
            });
    }

    getProductionOrderStatus(year, orderType) {
        let query = {
            "_deleted": false,
            "year": year
        };

        switch (orderType.toString().toLowerCase()) {
            case "yarn dyed":
            case "printing": {
                query["orderType.name"] = orderType;
                break;
            }
            case "dyeing":
            case "white": {
                query["processType.name"] = orderType;
                break;
            }
            default: {
                query["$or"] = [
                    { "orderType.name": { "$in": ["PRINTING", "YARN DYED"] } },
                    { "processType.name": { "$in": ["WHITE", "DYEING"] } }
                ];
            }
        }

        return this.collection.aggregate([
            {
                "$project": {
                    "_deleted": 1,
                    "processType": 1,
                    "orderQuantity": 1,
                    "year": {
                        "$year": "$deliveryDate"
                    },
                    "month": {
                        "$month": "$deliveryDate"
                    }
                }
            },
            {
                "$match": query
            },
            {
                "$group": {
                    "_id": { "month": "$month" },
                    "total": { "$sum": "$orderQuantity" },
                }
            }
        ]).toArray()
            .then((productionOrders) => {
                var productionOrderData = [];

                if (productionOrders.length > 0) {
                    for (var productionOrder of productionOrders) {
                        var productionOrderDatum = {};

                        productionOrderDatum.month = productionOrder._id.month;

                        productionOrderDatum.quantity = productionOrder.total;

                        productionOrderData.push(productionOrderDatum);
                    }
                }

                return Promise.resolve(productionOrderData);
            })
    }

    getDailyOperationStatus(year, orderType) {
        let kanbanQuery = {
            "_deleted": false,
            "isComplete": false
        };

        switch (orderType.toString().toLowerCase()) {
            case "yarn dyed":
            case "printing": {
                kanbanQuery["productionOrder.orderType.name"] = orderType;
                break;
            }
            case "dyeing":
            case "white": {
                kanbanQuery["productionOrder.processType.name"] = orderType;
                break;
            }
            default: {
                kanbanQuery["$or"] = [
                    { "productionOrder.orderType.name": { "$in": ["PRINTING", "YARN DYED"] } },
                    { "productionOrder.processType.name": { "$in": ["WHITE", "DYEING"] } }
                ];
            }
        }

        let kanbanFields = {
            "code": 1,
            "currentStepIndex": 1,
            "instruction.steps._id": 1,
            "cart.qty": 1,
            "_createdDate": 1
        };

        return this.kanbanCollection.find(kanbanQuery, kanbanFields).toArray()
            .then((kanbans) => {
                let joinDailyOperations = kanbans.map((kanban) => {
                    kanban.currentStepIndex = Math.floor(kanban.currentStepIndex);

                    let currentStep = kanban.instruction.steps[Math.abs(kanban.currentStepIndex === kanban.instruction.steps.length ? kanban.currentStepIndex - 1 : kanban.currentStepIndex)];
                    let kanbanCurrentStepId = kanban.instruction && kanban.instruction.steps.length > 0 && currentStep && currentStep._id ? currentStep._id : null;

                    if (ObjectId.isValid(kanbanCurrentStepId)) {
                        let getDailyOperations;

                        if (kanban.currentStepIndex != kanban.instruction.steps.length) {
                            let dailyQuery = {
                                _deleted: false,
                                "kanban.code": kanban.code,
                                "step._id": kanbanCurrentStepId,
                                type: "input",
                                "kanban.currentStepIndex": kanban.currentStepIndex
                            };

                            let dailyFields = {
                                "input": 1,
                                "step.processArea": 1,
                                "dateInput": 1,
                                "type": 1,
                                "kanban.productionOrder.orderNo": 1
                            };

                            getDailyOperations = this.dailyOperationCollection.findOne(dailyQuery, dailyFields)
                        }
                        else {
                            getDailyOperations = Promise.resolve(null);
                        }

                        return new Promise((resolve, reject) => {
                            getDailyOperations.then((dailyOperation) => {
                                if (dailyOperation) {
                                    resolve(dailyOperation);
                                }
                                else if (kanban.currentStepIndex === 0) {
                                    kanban.type = "kanban";
                                    resolve(kanban);
                                }
                                else {
                                    let currStepIndex = kanban.currentStepIndex - 1;
                                    let currStep = kanban.instruction.steps[currStepIndex];
                                    let kanbanCurrStepId = kanban.instruction && kanban.instruction.steps.length > 0 && currStep && currStep._id ? currStep._id : null;

                                    if (ObjectId.isValid(kanbanCurrStepId)) {
                                        let dailyQueryOutput = {
                                            _deleted: false,
                                            "kanban.code": kanban.code,
                                            "step._id": kanbanCurrStepId,
                                            type: "output",
                                            "kanban.currentStepIndex": currStepIndex
                                        };

                                        let dailyFieldsOutput = {
                                            "goodOutput": 1,
                                            "step.processArea": 1,
                                            "dateOutput": 1,
                                            "type": 1,
                                            "kanban.productionOrder.orderNo": 1
                                        };

                                        let getDailyOpOutput = this.dailyOperationCollection.findOne(dailyQueryOutput, dailyFieldsOutput);

                                        getDailyOpOutput.then((dailyOpOutput) => {
                                            resolve(dailyOpOutput);
                                        });
                                    }
                                    else
                                        resolve(null);
                                }
                            });
                        });
                    }
                });

                return Promise.all(joinDailyOperations)
                    .then(((joinDailyOperation) => {
                        return joinDailyOperation.filter((d) => d);
                    }));
            });
    }

    getPackingReceiptStatus(year, orderType, productionOrders) {
        var orderNumbers = productionOrders.map((productionOrder) => productionOrder.orderNo);

        return this.fpPackingReceiptCollection.aggregate([
            {
                "$match": {
                    "_deleted": false,
                    "productionOrderNo": {
                        "$in": orderNumbers
                    }
                }
            },
            {
                "$project": {
                    "isVoid": 1,
                    "items": 1,
                    "year": {
                        "$year": "$date"
                    },
                    "month": {
                        "$month": "$date"
                    }
                }
            },
            {
                "$match": {
                    "year": year
                }
            }
        ]).toArray()
            .then((packingReceipts) => {
                var packingReceiptData = [];

                if (packingReceipts.length > 0) {
                    for (var packingReceipt of packingReceipts) {
                        var packingReceiptDatum = {};

                        packingReceiptDatum.month = packingReceipt.month;

                        packingReceiptDatum.quantity = 0;
                        if (packingReceipt.items && packingReceipt.items.length > 0) {
                            for (var item of packingReceipt.items) {
                                packingReceiptDatum.quantity += item.availableQuantity && item.length ? (item.availableQuantity * item.length) : 0;
                            }
                        }

                        packingReceiptData.push(packingReceiptDatum);
                    }
                }

                return Promise.resolve(packingReceiptData);
            });
    }

    getOrderStatusXls(result, query) {
        var xls = {};
        var year = parseInt(query.year);
        var orderType = query.orderType;
        xls.data = [];
        xls.options = [];
        xls.name = `LAPORAN STATUS ORDER ${orderType} BERDASARKAN DELIVERY TAHUN ${year}.xlsx`;

        for (var statusOrder of result.data) {

            var item = {};
            item["Bulan"] = statusOrder.name ? statusOrder.name : '';
            item["Belum Produksi"] = statusOrder.preProductionQuantity ? Number(statusOrder.preProductionQuantity) : 0;
            item["Sudah Produksi"] = statusOrder.onProductionQuantity ? Number(statusOrder.onProductionQuantity) : 0;
            item["Total"] = statusOrder.orderQuantity ? Number(statusOrder.orderQuantity) : 0;
            item["Sudah Dikirim Ke Gudang"] = statusOrder.storageQuantity ? Number(statusOrder.storageQuantity) : 0;
            item["Sudah Dikirim Ke Buyer"] = statusOrder.shipmentQuantity ? Number(statusOrder.shipmentQuantity) : 0;

            xls.data.push(item);
        }

        xls.options["Bulan"] = "string";
        xls.options["Belum Produksi"] = "number";
        xls.options["Sudah Produksi"] = "number";
        xls.options["Total"] = "number";
        xls.options["Sudah Dikirim Ke Gudang"] = "number";
        xls.options["Sudah Dikirim Ke Buyer"] = "number";

        return Promise.resolve(xls);
    }

    //#endregion Status Order

    //#region Detail

    groupDailyData(data) {
        var results = [];

        if (data.length > 0) {
            let i = 1;

            for (var datum of data) {
                var exist = results.find((result) => result && result.orderNo.toString() === datum.orderNo.toString() && (result.processArea ? result.processArea.toString() === datum.processArea.toString() : true));
                if (exist) {
                    var index = results.findIndex(result => result.orderNo === exist.orderNo && result.processArea === exist.processArea);
                    results[index].quantity += datum.quantity;
                } else {
                    datum.no = i++;
                    results.push(datum);
                }
            }
        }

        return results;
    }

    getProductionOrderDataDetail(year, month, orderType) {
        let query = {
            "_deleted": false,
            "year": year
        };

        switch (orderType.toString().toLowerCase()) {
            case "yarn dyed":
            case "printing": {
                query["orderType.name"] = orderType;
                break;
            }
            case "dyeing":
            case "white": {
                query["processType.name"] = orderType;
                break;
            }
            default: {
                query["$or"] = [
                    { "orderType.name": { "$in": ["PRINTING", "YARN DYED"] } },
                    { "processType.name": { "$in": ["WHITE", "DYEING"] } }
                ];
            }
        }

        return this.collection.aggregate([
            {
                "$project": {
                    "_deleted": 1,
                    "processType.name": 1,
                    "orderType.name": 1,
                    "orderNo": 1,
                    "year": {
                        "$year": "$deliveryDate"
                    },
                    "orderQuantity": 1,
                    "buyer.name": 1,
                    "account.username": 1,
                    "_createdDate": 1,
                    "deliveryDate": 1
                }
            },
            {
                "$match": query
            }
        ]).toArray()
    }

    getOrderStatusDetailReport(info) {
        var monthName = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
        var year = parseInt(info.year);
        var orderType = info.orderType;
        var month = monthName.indexOf(info.month) + 1;

        return this.getProductionOrderDataDetail(year, month, orderType)
            .then((productionOrders) => {
                var getDailyOperationDetailStatus = this.getDailyOperationStatus(year, orderType);
                var getPackingReceiptDetailStatus = this.getPackingReceiptDetailStatus(year, month, orderType, productionOrders);
                var getShipmentDetailStatus = this.getShipmentDetailStatus(year, month, orderType, productionOrders);
                var getProductionOrderNotInKanban = this.getProductionOrderNotInKanban(year, month, orderType);

                // return Promise.all([Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), getProductionOrderNotInKanban])
                return Promise.all([getDailyOperationDetailStatus, getPackingReceiptDetailStatus, getShipmentDetailStatus, getProductionOrderNotInKanban])
                    .then((results) => {
                        var dailyOperations = results[0];
                        var packingReceipts = results[1];
                        var packingShipments = results[2];
                        var productionOrdersNotInKanban = results[3];

                        var data = {};
                        data.preProductionData = [];
                        data.onProductionData = [];
                        data.storageData = [];
                        data.shipmentData = [];
                        data.productionOrdersNotInKanban = [];

                        // let preIndex = 1;
                        // let onIndex = 1;
                        let storageIndex = 1;
                        let shipmentIndex = 1;

                        for (var dailyOperation of dailyOperations) {
                            let dailyMonth, dailyYear, dailyQuantity;
                            let processArea = dailyOperation.step ? dailyOperation.step.processArea : null;

                            if (processArea) {
                                switch (dailyOperation.type.toLowerCase()) {
                                    case "input": {
                                        dailyMonth = moment(dailyOperation.dateInput).month();
                                        dailyYear = moment(dailyOperation.dateInput).year();
                                        dailyQuantity = dailyOperation.input;
                                        break;
                                    }
                                    case "output": {
                                        dailyMonth = moment(dailyOperation.dateOutput).month();
                                        dailyYear = moment(dailyOperation.dateOutput).year();
                                        dailyQuantity = dailyOperation.goodOutput;
                                        break;
                                    }
                                    case "kanban": {
                                        dailyMonth = moment(dailyOperation._createdDate).month();
                                        dailyYear = moment(dailyOperation._createdDate).year();
                                        dailyQuantity = dailyOperation.cart ? dailyOperation.cart.qty : 0;
                                    }
                                }

                                if (dailyMonth === (month - 1) && dailyYear === year) {
                                    let dailyProductionOrder = dailyOperation.kanban.productionOrder.orderNo;

                                    let pOrder = productionOrders.find((productionOrder) => productionOrder.orderNo === dailyProductionOrder);

                                    if (processArea.toLowerCase() === "area pre treatment") {
                                        let obj = {
                                            orderNo: dailyProductionOrder,
                                            quantity: dailyQuantity,
                                            processArea: processArea
                                        };

                                        if (pOrder)
                                            Object.assign(obj, pOrder);

                                        data.preProductionData.push(obj);
                                    } else if (processArea.toLowerCase() !== "area pre treatment" && processArea.toLowerCase() !== "area inspecting" && processArea.toLowerCase() !== "area qc") {
                                        let obj = {
                                            orderNo: dailyOperation.kanban.productionOrder.orderNo,
                                            quantity: dailyQuantity,
                                            processArea: processArea
                                        };

                                        if (pOrder)
                                            Object.assign(obj, pOrder);

                                        data.onProductionData.push(obj);
                                    }
                                }
                            }
                        }

                        data.preProductionData = this.groupDailyData(data.preProductionData);
                        data.onProductionData = this.groupDailyData(data.onProductionData);

                        for (var packingReceipt of packingReceipts) {
                            if (packingReceipt.total > 0) {
                                let pOrder = productionOrders.find((productionOrder) => productionOrder.orderNo === packingReceipt._id);

                                let obj = {
                                    no: storageIndex++,
                                    orderNo: packingReceipt._id,
                                    quantity: packingReceipt.total
                                };

                                if (pOrder)
                                    Object.assign(obj, pOrder);

                                data.storageData.push(obj);
                            }
                        }

                        for (var packingShipment of packingShipments) {
                            let pOrder = productionOrders.find((productionOrder) => productionOrder.orderNo === packingShipment.orderNo);

                            let obj = {
                                no: shipmentIndex++,
                                orderNo: packingShipment.orderNo,
                                quantity: packingShipment.quantity
                            };

                            if (pOrder)
                                Object.assign(obj, pOrder);

                            data.shipmentData.push(obj);
                        }

                        data.shipmentData = this.groupDailyData(data.shipmentData);

                        var notInKanbanIndex = 1;
                        for (var productionOrderNotInKanban of productionOrdersNotInKanban) {
                            let pOrder = productionOrders.find((productionOrder) => productionOrder.orderNo === productionOrderNotInKanban.orderNo);

                            let obj = {
                                no: notInKanbanIndex++,
                            };

                            if (pOrder) {
                                pOrder.orderQuantity = pOrder.orderQuantity;
                                Object.assign(obj, pOrder);
                            }

                            data.productionOrdersNotInKanban.push(obj);
                        }

                        return Promise.resolve(data)
                    });
            });
    }

    getShipmentDetailStatus(year, month, orderType, productionOrders) {
        var orderNumbers = productionOrders.map((productionOrder) => productionOrder.orderNo);

        return this.fpPackingShipmentCollection.aggregate([
            {
                "$match": {
                    "_deleted": false,
                    "details.productionOrderNo": {
                        "$in": orderNumbers
                    }
                }
            },
            {
                "$project": {
                    "_deleted": 1,
                    "year": {
                        "$year": "$deliveryDate"
                    },
                    "month": {
                        "$month": "$deliveryDate"
                    },
                    "details": 1,
                }
            },
            {
                "$match": {
                    "year": year,
                    "month": month
                }
            }
            // { $unwind: "$details" },
            // { $unwind: "$details.items" },
            // { $unwind: "$details.items.packingReceiptItems" },
            // {
            //     "$project": {
            //         "details.productionOrderNo": 1,
            //         "details.items": 1,
            //         "totalLength": { "$multiply": ["$details.items.packingReceiptItems.length", "$details.items.packingReceiptItems.quantity"] }
            //     }
            // },
            // {
            //     "$group": {
            //         "_id": "$details.productionOrderNo",
            //         "total": { "$sum": "$totalLength" }
            //     }
            // }
        ]).toArray()
            .then((shipmentDocuments) => {
                var shipmentDocumentData = [];

                if (shipmentDocuments.length > 0) {
                    for (var shipmentDocument of shipmentDocuments) {
                        var shipmentDocumentDatum = {};

                        shipmentDocumentDatum.month = shipmentDocument.month;

                        shipmentDocumentDatum.quantity = 0;
                        if (shipmentDocument.details && shipmentDocument.details.length > 0) {
                            for (var detail of shipmentDocument.details) {

                                shipmentDocumentDatum.orderNo = detail.productionOrderNo;

                                if (detail.items) {
                                    for (var item of detail.items) {
                                        if (item.packingReceiptItems && item.packingReceiptItems.length > 0) {
                                            for (var packingReceiptItem of item.packingReceiptItems) {
                                                shipmentDocumentDatum.quantity = shipmentDocumentDatum.quantity + (packingReceiptItem.quantity && packingReceiptItem.length ? (packingReceiptItem.quantity * packingReceiptItem.length) : 0);
                                            }
                                        } else if (item.quantity) {
                                            shipmentDocumentDatum.quantity = shipmentDocumentDatum.quantity + (item.quantity && item.length ? (item.quantity * item.length) : 0);
                                        }
                                    }
                                }
                            }
                        }

                        shipmentDocumentData.push(shipmentDocumentDatum);
                    }
                }
                return Promise.resolve(shipmentDocumentData);
            });
    }

    getPackingReceiptDetailStatus(year, month, orderType, productionOrders) {
        var orderNumbers = productionOrders.map((productionOrder) => productionOrder.orderNo);

        return this.fpPackingReceiptCollection.aggregate([
            {
                "$match": {
                    "_deleted": false,
                    "productionOrderNo": {
                        "$in": orderNumbers
                    }
                }
            },
            {
                "$project": {
                    "isVoid": 1,
                    "items": 1,
                    "year": {
                        "$year": "$date"
                    },
                    "month": {
                        "$month": "$date"
                    },
                    "productionOrderNo": 1,
                    "items": 1
                }
            },
            {
                "$match": {
                    "year": year,
                    "month": month
                }
            },
            { $unwind: "$items" },
            {
                "$project": {
                    "productionOrderNo": 1,
                    "items": 1,
                    "totalLength": { "$multiply": ["$items.availableQuantity", "$items.length"] }
                }
            },
            {
                "$group": {
                    "_id": "$productionOrderNo",
                    "total": { "$sum": "$totalLength" }
                }
            }
        ]).toArray()
            .then((packingReceipts) => {

                return Promise.resolve(packingReceipts);
            });
    }

    //#endregion Detail
}