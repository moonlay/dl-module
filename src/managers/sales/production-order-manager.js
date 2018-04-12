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
var OrderStatusHistoryManager = require('./order-status-history-manager');
var BaseManager = require('module-toolkit').BaseManager;
var i18n = require('dl-i18n');
var generateCode = require("../../utils/code-generator");
var assert = require('assert');
var moment = require('moment');

const NUMBER_DESCRIPTION = "SPP Finishing Printing"

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
        this.orderStatusHistoryManager = new OrderStatusHistoryManager(db, user);
        this.documentNumbers = this.db.collection("document-numbers");
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
        if (!productionOrder.orderNo) {
            var type = productionOrder && productionOrder.orderType && productionOrder.orderType.name && (productionOrder.orderType.name.toString().toLowerCase() === "printing") ? "P" : "F";
            var query = { "type": type, "description": NUMBER_DESCRIPTION };
            var fields = { "number": 1, "year": 1 };

            return this.documentNumbers
                .findOne(query, fields)
                .then((previousDocumentNumber) => {
                    var yearNow = parseInt(moment().format("YYYY"));

                    var number = 0;
                    let productionOrders = [];

                    if (previousDocumentNumber) {

                        var oldYear = previousDocumentNumber.year;
                        number = yearNow > oldYear ? number : previousDocumentNumber.number;

                        /* productionOrder.orderNo = `${type}${moment().format("YY")}${this.pad(number, 4)}`; */
                    }
                    /*
                        else {
                            productionOrder.orderNo = `${type}${moment().format("YY")}0001`;
                        }
                    */

                    let now = new Date();

                    for (let detail of productionOrder.details) {
                        let pOrder = Object.create(productionOrder);
                        pOrder._createdDate = now;
                        pOrder.orderNo = `${type}${moment().format("YY")}${this.pad(++number, 4)}`;
                        pOrder.orderQuantity = detail.quantity;
                        pOrder.details = [detail];

                        productionOrders.push(pOrder);
                    }

                    var documentNumbersData = {
                        "$set": {
                            documentNumber: productionOrders[productionOrders.length - 1].orderNo,
                            number: number,
                            year: parseInt(moment().format("YYYY"))
                        }
                    };

                    var options = { "upsert": true };

                    return this.documentNumbers
                        .updateOne(query, documentNumbersData, options)
                        .then((id) => {
                            return Promise.resolve(productionOrders)
                        });
                });
        }
        else {
            return Promise.resolve([productionOrder])
        }
    }

    pad(number, length) {

        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }

        return str;
    }

    checkAvailability(productionOrders, index, id) {
        if (index + 1 != productionOrders.length) {
            return this.createSync(productionOrders, index + 1);
        }
        else {
            return Promise.resolve(id);
        }
    }

    createSync(productionOrders, index) {
        return this.collection.insert(productionOrders[index])
            .then(id => {
                let spp = productionOrders[index];

                return this.fpSalesContractManager.getSingleById(spp.salesContractId)
                    .then((sc) => {
                        if (sc.remainingQuantity != undefined) {
                            sc.remainingQuantity = sc.remainingQuantity - spp.orderQuantity;
                            return this.fpSalesContractManager.update(sc)
                                .then((scId) => {
                                    return this.checkAvailability(productionOrders, index, id);
                                });
                        }
                        else {
                            return this.checkAvailability(productionOrders, index, id);
                        }
                    });
            })
            .catch(err => {
                if (err.errmsg && err.errmsg.indexOf("duplicate key error") != -1) {
                    let msg = "";

                    for (let i = 0; i < productionOrders.length; i++) {
                        msg += "Data Acuan Warna " + productionOrders[i].details[0].colorTemplate + " dan Warna Yang Diminta " + productionOrders[i].details[0].colorRequest;

                        if (i < index) { /* Success Data */
                            msg += " Berhasil\n";
                        }
                        else {
                            msg += " Gagal\n";
                        }
                    }
                    return Promise.reject({ name: "DuplicateError", message: "Beberapa atau semua data gagal tersimpan", errors: msg });
                }
                else {
                    return Promise.reject({ name: "UnknownError", message: "Terjadi kesalahan" });
                }
            });
    }

    create(data) {
        return this._pre(data)
            .then((validData) => {
                return this._beforeInsert(validData);
            })
            .then((processedData) => {
                return this.createSync(processedData, 0);
            })
            .then((id) => {
                return this._afterInsert(id);
            });
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
                    let indexDetail = 1;
                    for (var detail of valid.details) {
                        var detailError = {};
                        let unique = "CODE" + indexDetail++;
                        detail.code = generateCode(unique);

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

    /*

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

    */

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
                                "colorTemplate": "$details.colorTemplate",
                                "colorRequest": "$details.colorRequest",
                                // "colorType": "$details.colorType.name",
                                "quantity": "$details.quantity",
                                // "uomDetail": "$details.uom.unit",
                                "deliveryDate": "$deliveryDate",
                                "firstname": "$account.profile.firstname",
                                "lastname": "$account.profile.lastname",
                                "materialName": "$material.name",
                                "materialConstruction": "$materialConstruction.name",
                                "materialWidth": "$materialWidth",
                                // "designMotive": "$designMotive.name",
                                "designCode": "$designCode"
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
                                "colorTemplate": "$details.colorTemplate",
                                "colorRequest": "$details.colorRequest",
                                // "colorType": "$details.colorType.name",
                                "quantity": "$details.quantity",
                                // "uomDetail": "$details.uom.unit",
                                "deliveryDate": "$deliveryDate",
                                "firstname": "$account.profile.firstname",
                                "lastname": "$account.profile.lastname",
                                "materialName": "$material.name",
                                "materialConstruction": "$materialConstruction.name",
                                "materialWidth": "$materialWidth",
                                // "designMotive": "$designMotive.name",
                                "designCode": "$designCode"
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
                        var construction = `${prodOrder.materialName} / ${prodOrder.materialConstruction} / ${prodOrder.materialWidth}`;
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

    getDetailReport(orderNo) {
        return new Promise((resolve, reject) => {
            var qry = Object.assign({});
            var data = {}
            if (orderNo) {
                Object.assign(qry, {
                    "orderNo": {
                        "$regex": (new RegExp(orderNo, "i"))
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

    //#region order status xls

    getOrderStatusXls(result, query) {
        var xls = {};
        var year = parseInt(query.year);
        var orderType = query.orderType;
        xls.data = [];
        xls.options = [];
        xls.name = `LAPORAN STATUS ORDER ${orderType} BERDASARKAN DELIVERY TAHUN ${year}.xlsx`;

        for (var kanbanDetail of result.data) {

            var item = {};
            item["Bulan"] = kanbanDetail.name ? kanbanDetail.name : '';
            item["Target Kirim Ke Buyer"] = kanbanDetail.orderQuantity ? Number(kanbanDetail.orderQuantity) : 0;
            item["Belum Produksi"] = kanbanDetail.preProductionQuantity ? Number(kanbanDetail.preProductionQuantity) : 0;
            item["Sedang Produksi"] = kanbanDetail.onProductionQuantity ? Number(kanbanDetail.onProductionQuantity) : 0;
            item["Sedang QC"] = kanbanDetail.inspectingQuantity ? Number(kanbanDetail.inspectingQuantity) : 0;
            item["Sudah Produksi"] = kanbanDetail.afterProductionQuantity ? Number(kanbanDetail.afterProductionQuantity) : 0;
            item["Sudah Dikirim Ke Gudang"] = kanbanDetail.storageQuantity ? Number(kanbanDetail.storageQuantity) : 0;
            item["Sudah Dikirim Ke Buyer"] = kanbanDetail.shipmentQuantity ? Number(kanbanDetail.shipmentQuantity) : 0;
            item["Sisa Belum Turun Kanban"] = kanbanDetail.diffOrderKanbanQuantity ? Number(kanbanDetail.diffOrderKanbanQuantity) : 0;
            item["Sisa Belum Kirim Ke Buyer"] = kanbanDetail.diffOrderShipmentQuantity ? Number(kanbanDetail.diffOrderShipmentQuantity) : 0;

            xls.data.push(item);
        }

        xls.options["Bulan"] = "string";
        xls.options["Target Kirim Ke Buyer"] = "number";
        xls.options["Belum Produksi"] = "number";
        xls.options["Sedang Produksi"] = "number";
        xls.options["Sedang QC"] = "number";
        xls.options["Sudah Produksi"] = "number";
        xls.options["Sudah Dikirim Ke Gudang"] = "number";
        xls.options["Sudah Dikirim Ke Buyer"] = "number";
        xls.options["Sisa Belum Turun Kanban"] = "number";
        xls.options["Sisa Belum Kirim Ke Buyer"] = "number";

        return Promise.resolve(xls);
    }

    getOrderStatusDetailXls(result, query, offset) {
        var xls = {};
        var year = parseInt(query.year);
        var month = query.month;
        var orderType = query.orderType;
        xls.data = [];
        xls.options = [];
        xls.name = `LAPORAN DETAIL STATUS ORDER ${orderType} BERDASARKAN DELIVERY BULAN ${month} TAHUN ${year}.xlsx`;

        var grandTotal = {};
        grandTotal["No"] = "";
        grandTotal["Nomor SPP"] = "";
        grandTotal["Konstruksi"] = "";
        grandTotal["Jenis Proses"] = "";
        grandTotal["Motif"] = "";
        grandTotal["Warna"] = "";
        grandTotal["Buyer"] = "";
        grandTotal["Sales"] = "";
        grandTotal["Tanggal Terima Order"] = "";
        grandTotal["Permintaan Delivery"] = "Total";
        grandTotal["Panjang SPP"] = 0;
        grandTotal["Sisa Belum Turun Kanban"] = 0;
        grandTotal["Belum Produksi"] = 0;
        grandTotal["Sedang Produksi"] = 0;
        grandTotal["Sedang QC"] = 0;
        grandTotal["Sudah Produksi"] = 0;
        grandTotal["Sudah Dikirim Ke Gudang"] = 0;
        grandTotal["Sudah Dikirim Ke Buyer"] = 0;
        grandTotal["Sisa Belum Kirim Ke Buyer"] = 0;

        for (var statusOrder of result.data) {

            var item = {};
            item["No"] = statusOrder.no ? statusOrder.no : '';
            item["Nomor SPP"] = statusOrder.orderNo ? statusOrder.orderNo : '';
            item["Konstruksi"] = statusOrder.constructionComposite ? statusOrder.constructionComposite : '';
            item["Jenis Proses"] = statusOrder.processType ? statusOrder.processType : '';
            item["Motif"] = statusOrder.designCode ? statusOrder.designCode : '';
            item["Warna"] = statusOrder.colorRequest ? statusOrder.colorRequest : '';
            item["Buyer"] = statusOrder.buyerName ? statusOrder.buyerName : '';
            item["Sales"] = statusOrder.accountName ? statusOrder.accountName : '';
            item["Tanggal Terima Order"] = statusOrder._createdDate ? moment(statusOrder._createdDate).format('DD/MM/YYYY') : '';
            item["Permintaan Delivery"] = statusOrder.deliveryDate ? moment(statusOrder.deliveryDate).format('DD/MM/YYYY') : '';
            item["Posisi Kanban Terakhir"] = '';
            item["Perubahan Tanggal Delivery"] = statusOrder.deliveryDateCorrection ? moment(statusOrder.deliveryDateCorrection).add(offset, 'h').format('DD/MM/YYYY') : '';
            item["Alasan Perubahan Tanggal Delivery"] = statusOrder.reason;
            item["Panjang SPP"] = statusOrder.orderQuantity ? Number(Number(statusOrder.orderQuantity).toFixed(2)) : 0;
            item["Sisa Belum Turun Kanban"] = statusOrder.notInKanbanQuantity ? Number(Number(statusOrder.notInKanbanQuantity).toFixed(2)) : 0;
            item["Belum Produksi"] = statusOrder.preProductionQuantity ? Number(Number(statusOrder.preProductionQuantity).toFixed(2)) : 0;
            item["Sedang Produksi"] = statusOrder.onProductionQuantity ? Number(Number(statusOrder.onProductionQuantity).toFixed(2)) : 0;
            item["Sedang QC"] = statusOrder.inspectingQuantity ? Number(Number(statusOrder.inspectingQuantity).toFixed(2)) : 0;
            item["Sudah Produksi"] = statusOrder.afterProductionQuantity ? Number(Number(statusOrder.afterProductionQuantity).toFixed(2)) : 0;
            item["Sudah Dikirim Ke Gudang"] = statusOrder.storageQuantity ? Number(Number(statusOrder.storageQuantity).toFixed(2)) : 0;
            item["Sudah Dikirim Ke Buyer"] = statusOrder.shipmentQuantity ? Number(Number(statusOrder.shipmentQuantity).toFixed(2)) : 0;
            item["Sisa Belum Kirim Ke Buyer"] = statusOrder.diffOrderShipmentQuantity ? Number(Number(statusOrder.diffOrderShipmentQuantity).toFixed(2)) : 0;

            grandTotal["Panjang SPP"] += Number(Number(statusOrder.orderQuantity).toFixed(2));
            grandTotal["Sisa Belum Turun Kanban"] += Number(Number(statusOrder.notInKanbanQuantity).toFixed(2));
            grandTotal["Belum Produksi"] += Number(Number(statusOrder.preProductionQuantity).toFixed(2));
            grandTotal["Sedang Produksi"] += Number(Number(statusOrder.onProductionQuantity).toFixed(2));
            grandTotal["Sedang QC"] += Number(Number(statusOrder.inspectingQuantity).toFixed(2));
            grandTotal["Sudah Produksi"] += Number(Number(statusOrder.afterProductionQuantity).toFixed(2));
            grandTotal["Sudah Dikirim Ke Gudang"] += Number(Number(statusOrder.storageQuantity).toFixed(2));
            grandTotal["Sudah Dikirim Ke Buyer"] += Number(Number(statusOrder.shipmentQuantity).toFixed(2));
            grandTotal["Sisa Belum Kirim Ke Buyer"] += Number(Number(statusOrder.diffOrderShipmentQuantity).toFixed(2));
            xls.data.push(item);
        }

        xls.data.push(grandTotal);

        xls.options["No"] = "string";
        xls.options["Nomor SPP"] = "string";
        xls.options["Konstruksi"] = "string";
        xls.options["Jenis Proses"] = "string";
        xls.options["Motif"] = "string";
        xls.options["Warna"] = "string";
        xls.options["Buyer"] = "string";
        xls.options["Sales"] = "string";
        xls.options["Tanggal Terima Order"] = "string";
        xls.options["Posisi Kanban Terakhir"] = "string";
        xls.options["Perubahan Tanggal Delivery"] = "string";
        xls.options["Alasan Perubahan Tanggal Delivery"] = "string";
        xls.options["Permintaan Delivery"] = "string";
        xls.options["Panjang SPP"] = "number";
        xls.options["Sisa Belum Turun Kanban"] = "number";
        xls.options["Belum Produksi"] = "number";
        xls.options["Sedang Produksi"] = "number";
        xls.options["Sudah Produksi"] = "number";
        xls.options["Sudah Dikirim Ke Gudang"] = "number";
        xls.options["Sudah Dikirim Ke Buyer"] = "number";
        xls.options["Sisa Belum Kirim Ke Buyer"] = "number";

        return Promise.resolve(xls);
    }

    getOrderStatusKanbanDetailXls(result, query, offset) {
        var xls = {};
        var orderNo = query.orderNo;
        xls.data = [];
        xls.histories = [];
        xls.options = [];
        xls.name = `LAPORAN DETAIL SPP ${orderNo}.xlsx`;

        let res = result.data;

        for (var kanbanDetail of res.data) {

            var item = {};
            item["No"] = kanbanDetail.no ? kanbanDetail.no : '';
            item["Nomor Kereta"] = kanbanDetail.cartNumber ? kanbanDetail.cartNumber : '';
            item["Proses"] = kanbanDetail.process ? kanbanDetail.process : '';
            item["Area"] = kanbanDetail.processArea ? kanbanDetail.processArea : '';
            item["Kuantiti (m)"] = kanbanDetail.quantity ? Number(kanbanDetail.quantity) : 0;
            item["Status"] = kanbanDetail.status ? kanbanDetail.status : "";

            xls.data.push(item);
        }

        xls.options["No"] = "number";
        xls.options["Nomor Kereta"] = "string";
        xls.options["Proses"] = "string";
        xls.options["Area"] = "string";
        xls.options["Kuantiti (m)"] = "number";
        xls.options["Status"] = "string";

        for (let history of res.histories) {
            let item = {};
            item["Tanggal Buat"] = moment(history._createdDate).add(offset, 'h').format('DD/MM/YYYY');
            item["Tanggal Hasil Revisi"] = moment(history.deliveryDateCorrection).add(offset, 'h').format('DD/MM/YYYY');
            item["Alasan"] = history.reason;
            xls.histories.push(item);
        }

        return Promise.resolve(xls);
    }

    //#endregion order status xls

    //#region Close SPP

    close(listProductionOrders) {
        var getProductionOrders = [];
        return new Promise((resolve, reject) => {
            for (var productionOrder of listProductionOrders) {
                getProductionOrders.push(this.getSingleByIdOrDefault(productionOrder._id));
            }
            Promise.all(getProductionOrders)
                .then((productionOrders) => {
                    var _productionOrders = productionOrders || [];
                    var updateProductionOrder = [];
                    for (var productionOrder of listProductionOrders) {
                        var _productionOrder = _productionOrders.find((spp) => spp._id.toString() === productionOrder._id.toString());
                        if (_productionOrder) {
                            updateProductionOrder.push(this.updateClose(_productionOrder))
                        }
                    }
                    Promise.all(updateProductionOrder)
                        .then((result) => {
                            resolve(result);
                        })

                })
        });
    }

    updateClose(productionOrder) {
        var productionOrderError = {};

        if (productionOrder.isClosed) {
            productionOrderError["no"] = i18n.__("productionOrder.isClosed:%s already closed", i18n.__("productionOrder.isClosed._:Closed"));
        }
        if (Object.getOwnPropertyNames(productionOrderError).length > 0) {
            var ValidationError = require("module-toolkit").ValidationError;
            return Promise.reject(new ValidationError("data does not pass validation", productionOrderError));
        }
        return Promise.resolve(productionOrder)
            .then((productionOrder) => {
                productionOrder.isClosed = true;
                productionOrder._updatedDate = new Date();
                return this.collection.update(productionOrder);
            })
    }

    //#endregion Close SPP

    //#region New Status Order

    getOrderStatusReport(info, timeOffset) {
        var year = parseInt(info.year);
        var orderType = info.orderType;
        var timeOffsetInMilli = timeOffset * 60 * 60000;

        return this.getProductionOrders(orderType, year, null, timeOffsetInMilli)
            .then((productionOrders) => {

                var productionOrders = productionOrders;
                var orderNumbers = productionOrders.map((productionOrder) => productionOrder.orderNo);

                var getKanbanAndDailyOperations = this.getKanbanAndDailyOperations(orderNumbers);
                var getPackingReceipts = this.getPackingReceipts(orderNumbers);
                var getShipmentDocuments = this.getShipmentDocuments(orderNumbers);

                return Promise.all([getKanbanAndDailyOperations, getPackingReceipts, getShipmentDocuments])
                    .then((results) => {
                        var kanbanAndDailyOperations = results[0];
                        var packingReceipts = results[1];
                        var packingShipments = results[2];

                        var data = [];
                        var monthName = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

                        var grandTotal = {};
                        grandTotal.name = "Total"
                        grandTotal.preProductionQuantity = 0;
                        grandTotal.onProductionQuantity = 0;
                        grandTotal.inspectingQuantity = 0;
                        grandTotal.afterProductionQuantity = 0;
                        grandTotal.orderQuantity = 0;
                        grandTotal.storageQuantity = 0;
                        grandTotal.shipmentQuantity = 0;
                        grandTotal.diffOrderKanbanQuantity = 0;
                        grandTotal.diffOrderShipmentQuantity = 0;

                        for (var i = 0; i < 12; i++) {

                            var datum = {};

                            datum.name = monthName[i];

                            datum.preProductionQuantity = 0;
                            datum.onProductionQuantity = 0;
                            datum.inspectingQuantity = 0;
                            datum.afterProductionQuantity = 0;
                            datum.orderQuantity = 0;
                            datum.storageQuantity = 0;
                            datum.shipmentQuantity = 0;

                            for (var productionOrder of productionOrders) {
                                if (productionOrder.month - 1 === i) {

                                    grandTotal.orderQuantity += productionOrder.orderQuantity;
                                    datum.orderQuantity += productionOrder.orderQuantity;

                                    for (var kanbanDaily of kanbanAndDailyOperations) {
                                        if (kanbanDaily.productionOrder.orderNo === productionOrder.orderNo) {
                                            let kanbanDailyQuantity;
                                            let processArea = kanbanDaily.step ? kanbanDaily.step.processArea : null;

                                            if (processArea) {
                                                switch (kanbanDaily.type.toLowerCase()) {
                                                    case "input": {
                                                        kanbanDailyQuantity = kanbanDaily.input;
                                                        break;
                                                    }
                                                    case "output": {
                                                        kanbanDailyQuantity = kanbanDaily.goodOutput + kanbanDaily.badOutput;
                                                        break;
                                                    }
                                                    case "kanban": {
                                                        kanbanDailyQuantity = kanbanDaily.cart.qty;
                                                        break;
                                                    }
                                                    case "complete": {
                                                        kanbanDailyQuantity = kanbanDaily.goodOutput + kanbanDaily.badOutput;
                                                        break;
                                                    }
                                                }

                                                if (processArea.toLowerCase() === "area pre treatment") {
                                                    grandTotal.preProductionQuantity += kanbanDailyQuantity;
                                                    datum.preProductionQuantity += kanbanDailyQuantity;
                                                } else if (processArea.toLowerCase() !== "area pre treatment" && processArea.toLowerCase() !== "area inspecting" && processArea.toLowerCase() !== "area qc" && processArea.toLowerCase() !== "complete") {
                                                    grandTotal.onProductionQuantity += kanbanDailyQuantity;
                                                    datum.onProductionQuantity += kanbanDailyQuantity;
                                                } else if (processArea.toLowerCase() === "area inspecting" || processArea.toLowerCase() === "area qc") {
                                                    grandTotal.inspectingQuantity += kanbanDailyQuantity;
                                                    datum.inspectingQuantity += kanbanDailyQuantity;
                                                } else if (processArea.toLowerCase() === "complete") {
                                                    grandTotal.afterProductionQuantity += kanbanDailyQuantity;
                                                    datum.afterProductionQuantity += kanbanDailyQuantity;
                                                }
                                            }
                                        }
                                    }

                                    for (var packingReceipt of packingReceipts) {
                                        if (packingReceipt.orderNo === productionOrder.orderNo) {
                                            grandTotal.storageQuantity += packingReceipt.quantity;
                                            datum.storageQuantity += packingReceipt.quantity;
                                        }
                                    }

                                    for (var packingShipment of packingShipments) {
                                        if (packingShipment.orderNo === productionOrder.orderNo) {
                                            grandTotal.shipmentQuantity += packingShipment.quantity;
                                            datum.shipmentQuantity += packingShipment.quantity;
                                        }
                                    }
                                }
                            }

                            datum.diffOrderShipmentQuantity = datum.orderQuantity - datum.shipmentQuantity;
                            datum.diffOrderKanbanQuantity = datum.orderQuantity - (datum.afterProductionQuantity + datum.preProductionQuantity + datum.onProductionQuantity + datum.inspectingQuantity);
                            grandTotal.diffOrderKanbanQuantity += datum.diffOrderKanbanQuantity;
                            grandTotal.diffOrderShipmentQuantity += datum.diffOrderShipmentQuantity;

                            data.push(datum);
                        }

                        data.push(grandTotal);

                        return Promise.resolve(data)
                    });
            });
    }

    getOrderStatusDetailReport(info, timeOffset) {
        var year = parseInt(info.year);
        var orderType = info.orderType;
        var month = info.month;
        var timeOffset = timeOffset;
        var timeOffsetInMilli = timeOffset * 60 * 60000;

        return this.getProductionOrders(orderType, year, month, timeOffsetInMilli)
            .then((productionOrders) => {

                var productionOrders = productionOrders;
                var orderNumbers = productionOrders.map((productionOrder) => productionOrder.orderNo);

                var getKanbanAndDailyOperations = this.getKanbanAndDailyOperations(orderNumbers);
                var getPackingReceipts = this.getPackingReceipts(orderNumbers);
                var getShipmentDocuments = this.getShipmentDocuments(orderNumbers);
                var getOrderStatusHistories = this.orderStatusHistoryManager.read(orderNumbers);

                // return Promise.all([Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), getProductionOrderNotInKanban])
                return Promise.all([getKanbanAndDailyOperations, getPackingReceipts, getShipmentDocuments, getOrderStatusHistories])
                    .then((results) => {
                        var kanbanAndDailyOperations = results[0];
                        var packingReceipts = results[1];
                        var packingShipments = results[2];
                        var orderStatusHistories = results[3];

                        var data = [];

                        let detailIndex = 1;

                        for (var productionOrder of productionOrders) {

                            var datum = {};

                            let history = orderStatusHistories.find(p => p._id == productionOrder.orderNo);

                            if (history) {
                                datum.deliveryDateCorrection = history.deliveryDateCorrection;
                                datum.reason = history.reason;
                            }

                            datum.no = detailIndex++;
                            datum.orderNo = productionOrder.orderNo;
                            datum.constructionComposite = productionOrder.material.name + " " + productionOrder.materialConstruction.name + " - " + productionOrder.materialWidth;
                            datum.processType = productionOrder.processType.name;

                            datum.designCode = "";
                            datum.colorRequest = "";
                            if (productionOrder.orderType.name.toLowerCase() === "printing") { //Printing
                                datum.designCode = `${productionOrder.designCode}`; //Motif
                                datum.colorRequest = `${productionOrder.details[0].colorRequest} - ${productionOrder.details[0].colorTemplate}`; //Warna
                            } else {
                                datum.designCode = "";
                                datum.colorRequest = `${productionOrder.details[0].colorRequest} - ${productionOrder.details[0].colorTemplate}`;
                            }

                            datum.buyerName = productionOrder.buyer.name;
                            datum.accountName = productionOrder.account.username;
                            datum._createdDate = productionOrder._createdDate;
                            datum.deliveryDate = productionOrder.deliveryDate;
                            datum.orderQuantity = productionOrder.orderQuantity;

                            datum.preProductionQuantity = 0;
                            datum.onProductionQuantity = 0;
                            datum.inspectingQuantity = 0;
                            datum.afterProductionQuantity = 0;
                            for (var kanbanDaily of kanbanAndDailyOperations) {
                                if (kanbanDaily.productionOrder.orderNo === productionOrder.orderNo) {
                                    let kanbanDailyQuantity;
                                    let processArea = kanbanDaily.step ? kanbanDaily.step.processArea : null;

                                    if (processArea) {
                                        switch (kanbanDaily.type.toLowerCase()) {
                                            case "input": {
                                                kanbanDailyQuantity = kanbanDaily.input;
                                                break;
                                            }
                                            case "output": {
                                                kanbanDailyQuantity = kanbanDaily.goodOutput + kanbanDaily.badOutput;
                                                break;
                                            }
                                            case "kanban": {
                                                kanbanDailyQuantity = kanbanDaily.cart.qty;
                                                break;
                                            }
                                            case "complete": {
                                                kanbanDailyQuantity = kanbanDaily.goodOutput + kanbanDaily.badOutput;
                                                break;
                                            }
                                        }

                                        if (processArea.toLowerCase() === "area pre treatment") {
                                            datum.preProductionQuantity += kanbanDailyQuantity;
                                        } else if (processArea.toLowerCase() !== "area pre treatment" && processArea.toLowerCase() !== "area inspecting" && processArea.toLowerCase() !== "area qc" && processArea.toLowerCase() !== "complete") {
                                            datum.onProductionQuantity += kanbanDailyQuantity;
                                        } else if (processArea.toLowerCase() === "area inspecting" || processArea.toLowerCase() === "area qc") {
                                            datum.inspectingQuantity += kanbanDailyQuantity;
                                        } else if (processArea.toLowerCase() === "complete") {
                                            datum.afterProductionQuantity += kanbanDailyQuantity
                                        }
                                    }
                                }
                            }

                            datum.storageQuantity = 0;
                            for (var packingReceipt of packingReceipts) {
                                if (packingReceipt.orderNo === productionOrder.orderNo) {
                                    datum.storageQuantity += packingReceipt.quantity;
                                }
                            }

                            datum.shipmentQuantity = 0;
                            for (var packingShipment of packingShipments) {
                                if (packingShipment.orderNo === productionOrder.orderNo) {
                                    datum.shipmentQuantity += packingShipment.quantity;
                                }
                            }

                            datum.notInKanbanQuantity = datum.orderQuantity - (datum.afterProductionQuantity + datum.preProductionQuantity + datum.onProductionQuantity + datum.inspectingQuantity);
                            datum.diffOrderShipmentQuantity = datum.orderQuantity - datum.shipmentQuantity;

                            data.push(datum);
                        }

                        return Promise.resolve(data)
                    });
            });
    }

    getOrderStatusKanbanDetailReport(info) {
        var orderNumbers = [];
        orderNumbers.push(info.orderNo);



        return Promise.all([this.getKanbanAndDailyOperations(orderNumbers), this.orderStatusHistoryManager.getByProductionOrderNo(info.orderNo)])
            .then((results) => {
                var kanbanAndDailyOperations = results[0];
                var histories = results[1];

                var data = [];

                let detailIndex = 1;

                for (var kanbanDaily of kanbanAndDailyOperations) {

                    var datum = {};

                    datum.no = detailIndex++;
                    datum.cartNumber = kanbanDaily.cart && kanbanDaily.cart.cartNumber ? kanbanDaily.cart.cartNumber : null;
                    datum.process = kanbanDaily.step && kanbanDaily.step.process ? kanbanDaily.step.process : null;
                    datum.processArea = kanbanDaily.step ? kanbanDaily.step.processArea : null;
                    datum.status = kanbanDaily.isComplete ? "Complete" : "Incomplete";

                    if (datum.processArea) {
                        switch (kanbanDaily.type.toLowerCase()) {
                            case "input": {
                                datum.quantity = kanbanDaily.input;
                                break;
                            }
                            case "output": {
                                datum.quantity = kanbanDaily.goodOutput + kanbanDaily.badOutput;
                                break;
                            }
                            case "kanban": {
                                datum.quantity = kanbanDaily.cart.qty;
                                break;
                            }
                            case "complete": {
                                datum.quantity = kanbanDaily.goodOutput + kanbanDaily.badOutput;
                                break;
                            }
                        }
                    }

                    data.push(datum);
                }

                let result = {
                    data: data,
                    histories: histories
                };

                return Promise.resolve(result);
            })
    }

    getProductionOrders(orderType, year, month, timeOffset) {

        let query = {
            "_deleted": false,
            "year": year,
            "isClosed": false
        };

        if (month) {
            var monthName = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            var month = monthName.indexOf(month) + 1;
            query["month"] = month
        }

        switch (orderType.toString().toLowerCase()) {
            case "yarn dyed": {
                query["orderType.name"] = orderType;
                break;
            }
            case "printing": {
                query["orderType.name"] = orderType;
                break;
            }
            case "dyeing": {
                query["orderType.name"] = "SOLID";
                query["processType.name"] = { "$nin": ["WHITE"] };
                break;
            }
            case "white": {
                query["orderType.name"] = "SOLID";
                query["processType.name"] = orderType;
                break;
            }
        }

        return this.collection.aggregate([
            {
                "$project": {
                    "_createdDate": 1,
                    "_deleted": 1,
                    "isClosed": 1,
                    "buyer.name": 1,
                    "account.username": 1,
                    "processType.name": {
                        "$toUpper": "$processType.name"
                    },
                    "orderType.name": {
                        "$toUpper": "$orderType.name"
                    },
                    "orderQuantity": 1,
                    "orderNo": 1,
                    "material.name": 1,
                    "materialConstruction.name": 1,
                    "materialWidth": 1,
                    "designCode": 1,
                    "details.colorRequest": 1,
                    "details.colorTemplate": 1,
                    "deliveryDate": 1,
                    "year": {
                        "$year": {
                            "$add": ["$deliveryDate", timeOffset]
                        }
                    },
                    "month": {
                        "$month": {
                            "$add": ["$deliveryDate", timeOffset]
                        }
                    }
                }
            },
            {
                "$match": query
            }
        ]).toArray()
    }

    getKanbanAndDailyOperations(orderNumbers) {
        let kanbanQuery = {
            "_deleted": false,
            "isInactive": false,
            "productionOrder.orderNo": {
                "$in": orderNumbers
            }
        };

        let kanbanFields = {
            "code": 1,
            "isComplete": 1,
            "currentQuantity": 1,
            "goodOutput": 1,
            "badOutput": 1,
            "currentStepIndex": 1,
            "instruction.steps._id": 1,
            "cart.cartNumber": 1,
            "cart.qty": 1,
            "_createdDate": 1,
            "productionOrder.orderNo": 1
        };

        var kanbans = [];

        return this.kanbanCollection.find(kanbanQuery, kanbanFields).toArray()
            .then((kanbanResults) => {

                var kanbans = kanbanResults;

                let joinDailyOperations = kanbans.map((kanban) => {

                    kanban.currentStepIndex = Math.floor(kanban.currentStepIndex);

                    let currentStep = kanban.instruction.steps[Math.abs(kanban.currentStepIndex === kanban.instruction.steps.length ? kanban.currentStepIndex - 1 : kanban.currentStepIndex)];
                    let kanbanCurrentStepId = kanban.instruction && kanban.instruction.steps.length > 0 && currentStep && currentStep._id ? currentStep._id : null;

                    if (ObjectId.isValid(kanbanCurrentStepId)) {
                        let getDailyOperations;

                        if (kanban.currentStepIndex != kanban.instruction.steps.length) {
                            let dailyQuery = {
                                "_deleted": false,
                                "kanban.code": kanban.code,
                                "step._id": kanbanCurrentStepId,
                                "type": "input",
                                "kanban.currentStepIndex": kanban.currentStepIndex
                            };

                            let dailyFields = {
                                "input": 1,
                                "step.processArea": 1,
                                "step.process": 1,
                                "dateInput": 1,
                                "type": 1,
                                "kanban.code": 1
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
                                else if (kanban.currentStepIndex === 0 || kanban.isComplete) {
                                    resolve(null);
                                }
                                else {
                                    let currStepIndex = kanban.currentStepIndex - 1;
                                    let currStep = kanban.instruction.steps[currStepIndex];
                                    let kanbanCurrStepId = kanban.instruction && kanban.instruction.steps.length > 0 && currStep && currStep._id ? currStep._id : null;

                                    if (ObjectId.isValid(kanbanCurrStepId)) {
                                        let dailyQueryOutput = {
                                            "_deleted": false,
                                            "kanban.code": kanban.code,
                                            "step._id": kanbanCurrStepId,
                                            "type": "output",
                                            "kanban.currentStepIndex": currStepIndex
                                        };

                                        let dailyFieldsOutput = {
                                            "goodOutput": 1,
                                            "badOutput": 1,
                                            "step.processArea": 1,
                                            "step.process": 1,
                                            "dateOutput": 1,
                                            "type": 1,
                                            "kanban.code": 1
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
                    .then(((dailyOperations) => {
                        return kanbans.filter((kanban) => {
                            var dailyOperation = dailyOperations.find((dailyOperation) => dailyOperation && dailyOperation.kanban.code.toString() === kanban.code.toString())

                            if (dailyOperation) {
                                kanban = Object.assign(kanban, dailyOperation)
                            } else if (kanban.isComplete) {
                                var step = {};
                                step["processArea"] = "Complete";
                                step["process"] = "Complete";
                                kanban.step = step;
                                kanban.type = "complete";
                            } else {
                                var step = {};
                                step["processArea"] = "Area Pre Treatment";
                                step["process"] = "Belum Masuk Produksi";
                                kanban.step = step;
                                kanban.type = "kanban";
                            }

                            return kanban;
                        });
                    }));
            });
    }

    getPackingReceipts(orderNumbers) {
        return this.fpPackingReceiptCollection.aggregate([
            {
                "$project": {
                    "_deleted": 1,
                    "productionOrderNo": 1,
                    "isVoid": 1,
                    "items": 1,
                    "date": 1
                }
            },
            {
                "$match": {
                    "_deleted": false,
                    "isVoid": false,
                    "productionOrderNo": {
                        "$in": orderNumbers
                    }
                }
            }
        ]).toArray()
            .then((packingReceipts) => {
                var packingReceiptData = [];

                if (packingReceipts.length > 0) {
                    for (var packingReceipt of packingReceipts) {
                        var packingReceiptDatum = {};

                        packingReceiptDatum.date = packingReceipt.date;
                        packingReceiptDatum.orderNo = packingReceipt.productionOrderNo;

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

    getShipmentDocuments(orderNumbers) {

        return this.fpPackingShipmentCollection.aggregate([
            {
                "$match": {
                    "_deleted": false,
                    "details.productionOrderNo": {
                        "$in": orderNumbers
                    },
                    "isVoid": false
                }
            },
            {
                "$project": {
                    "_deleted": 1,
                    "deliveryDate": 1,
                    "details.productionOrderNo": 1,
                    "details.items": 1
                }
            }
        ]).toArray()
            .then((shipmentDocuments) => {
                var shipmentDocumentData = [];

                if (shipmentDocuments.length > 0) {
                    for (var shipmentDocument of shipmentDocuments) {

                        if (shipmentDocument.details && shipmentDocument.details.length > 0) {
                            for (var detail of shipmentDocument.details) {
                                var shipmentDocumentDatum = {};

                                shipmentDocumentDatum.orderNo = detail.productionOrderNo;
                                shipmentDocumentDatum.date = shipmentDocument.deliveryDate;
                                shipmentDocumentDatum.quantity = 0;
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
                                shipmentDocumentData.push(shipmentDocumentDatum);
                            }
                        }
                    }
                }


                return Promise.resolve(shipmentDocumentData);
            });
    }

    //#endregion New Status Order

    //#region Update IsRequested and IsCompleted
    updateIsRequested(data) {
        var objectIds = data.ids.map((id) => {
            return new ObjectId(id);
        })

        return this
            .collection
            .updateMany({ "_id": { "$in": objectIds } },
                {
                    "$set": {
                        "isRequested": data.context.toUpperCase() === "CREATE" ? true : false,
                        "_updatedBy": this.user.username,
                        "_updatedDate": new Date()
                    }
                })
    }

    updateIsCompleted(data) {
        var updatePromises = data.contextAndIds.map((datum) => {
            return this
                .collection
                .updateOne({ "_id": new ObjectId(datum.id) },
                    {
                        "$set": {
                            "isCompleted": datum.context.toUpperCase() == "COMPLETE" ? true : false,
                            "_updatedBy": this.user.username,
                            "_updatedDate": new Date()
                        }
                    })
        })

        return Promise.all(updatePromises);
    }

    updateDistributedQuantity(data) {
        var updatePromises = data.map((datum) => {
            return this
                .collection
                .updateOne({ "_id": new ObjectId(datum.id) },
                    {
                        "$set": {
                            "_updatedBy": this.user.username,
                            "_updatedDate": new Date(),
                            "distributedQuantity": parseFloat(datum.distributedQuantity)
                        },
                    })
        });

        return Promise.all(updatePromises);
    }
    //#endregion Update IsRequested and IsCompleted
}