'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");
var generateCode = require("../../../src/utils/code-generator");

var UnitManager = require('../../managers/master/unit-manager');
var UomManager = require('../../managers/master/uom-manager');

// internal deps 
require("mongodb-toolkit");

module.exports = class GarmentPurchaseRequestEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.GarmentPurchaseRequest = this.db.collection("garment-purchase-request");
        this.migrationLog = this.db.collection("migration-log");
        this.unitManager = new UnitManager(db, user);
        this.uomManager = new UomManager(db, user);
        this.categoryManager = this.db.collection("garment-categories");
        this.productManager = this.db.collection("garment-products");
        this.buyerManager = this.db.collection("garment-buyers");
    }

    run() {

        var startedDate = new Date()

        this.migrationLog.insert({
            code: "sql-gpr",
            description: "Sql to MongoDB: Garment-Purchase-Request",
            start: startedDate,
        })

        return new Promise((resolve, reject) => {
            this.extract()
                .then((data) => this.transform(data))
                .then((data) => this.load(data))
                .then((results) => {
                    var finishedDate = new Date();
                    var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                    var updateLog = {
                        code: "sql-gpr",
                        description: "Sql to MongoDB: Garment-Purchase-Request",
                        start: startedDate,
                        finish: finishedDate,
                        executionTime: spentTime + " minutes",
                        status: "Successful"
                    };
                    this.migrationLog.updateOne({ start: startedDate }, updateLog);
                    resolve(results);
                })
                .catch((err) => {
                    var finishedDate = new Date();
                    var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                    var updateLog = {
                        code: "sql-gpr",
                        description: "Sql to MongoDB: Garment-Purchase-Request",
                        start: startedDate,
                        finish: finishedDate,
                        executionTime: spentTime + " minutes",
                        status: err
                    };
                    this.migrationLog.updateOne({ start: startedDate }, updateLog);
                });
        });
    };

    extract() {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();
                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);

                        var sqlQuery = "select POrder.Ro,POrder.Art,POrder.Buyer,POrder.Shipment,POrder.Nopo,POrder.TgValid,POrder.Delivery,POrder.Konf,POrder.Cat,POrder.Userin,POrder.Tglin,POrder.Usered,POrder.Tgled,POrder.Kodeb,POrder.Ketr,POrder.Qty,POrder.Satb,POrder.Harga,POrder.Kett,POrder.Kett2,POrder.Kett3,POrder.Kett4,POrder.Kett5 from Budget1 as Budget inner join POrder1 as POrder On Budget.Po = POrder.Nopo";

                        request.query(sqlQuery, function (err, result) {
                            resolve(result);
                        });

                    })
                })
                .catch((err) => {
                    reject(err);
                })
        }).catch((err) => {
            reject(err);
        })
    }

    getDataUnit() {
        return new Promise((resolve, reject) => {
            this.unitManager.getUnit().then((result) => {
                resolve(result);
            });
        });
    }

    getDataBuyer() {
        return new Promise((resolve, reject) => {
            this.buyerManager.find({}).toArray(function (err, result) {
                resolve(result);
            });
        });
    }

    getDataUom() {
        return new Promise((resolve, reject) => {
            this.uomManager.getUOM().then((result) => {
                resolve(result);
            });
        });
    }

    getDataProduct() {
        return new Promise((resolve, reject) => {
            this.productManager.find({}).toArray(function (err, result) {
                resolve(result);
            });
        });
    }

    getDataCategory() {
        return new Promise((resolve, reject) => {
            this.categoryManager.find({}).toArray(function (err, result) {
                resolve(result);
            });
        });
    }


    transform(datas) {
        return new Promise((resolve, reject) => {
            var getUnit = this.getDataUnit();
            var getCategory = this.getDataCategory();
            var getProduct = this.getDataProduct();
            var getBuyer = this.getDataBuyer();
            var getUom = this.getDataUom();

            Promise.all([getUnit, getCategory, getProduct, getBuyer, getUom]).then((result) => {
                var _unit = result[0].data;
                var _category = result[1];
                var _product = result[2];
                var _buyer = result[3];
                var _uom = result[4].data;

                var transformData = [];

                //distinct extracted data
                var distinctData = [];
                for (var unique of datas) {
                    var uniq = true;
                    distinctData.filter((obj) => {
                        if (unique.Ro == obj.Ro) {
                            uniq = false;
                        }
                    });
                    if (uniq == true) {
                        distinctData.push(unique);
                    }
                }


                //begin transform
                for (var uniq of distinctData) {

                    var _stamp = ObjectId();
                    var code = generateCode();
                    var unitCode = "";

                    if (uniq.Konf.trim() == "K.1") {
                        unitCode = "C2A"
                    } else if (uniq.Konf.trim() == "K.2") {
                        unitCode = "C2B"
                    } else if (uniq.Konf.trim() == "K.3") {
                        unitCode = "C2C"
                    } else if (uniq.Konf.trim() == "K.4") {
                        unitCode = "C1A"
                    } else if (uniq.Konf.trim() == "K.5") {
                        unitCode = "C2A"
                    }

                    var _createdDatehours = new Date(uniq.Jamin).getHours() ? new Date(uniq.Jamin).getHours() : "";
                    var _createdDateminutes = new Date(uniq.Jamin).getMinutes() ? new Date(uniq.Jamin).getMinutes() : "";
                    var _createdDatedate = uniq.Tglin.toString();
                    var _createdDate = _createdDatedate + ":" + _createdDatehours + ":" + "" + _createdDateminutes;
                    var _updatedDatehours = new Date(uniq.Jamed).getHours() ? new Date(uniq.Jamed).getHours() : "";
                    var _updatedDateminutes = new Date(uniq.Jamed).getMinutes() ? new Date(uniq.Jamed).getMinutes() : "";
                    var _updatedDatedate = uniq.Tgled.toString();
                    var _updatedDate = _updatedDatedate + ":" + _updatedDatehours + ":" + "" + _updatedDateminutes;

                    //begin embed _unit
                    for (var buyer of _buyer) {

                        for (var unit of _unit) {

                            if (unitCode == unit.code.trim() && uniq.Buyer.trim() == buyer.code.trim()) {

                                var items = [];
                                for (var data of datas) {
                                    if (uniq.Ro == data.Ro) {

                                        //begin embed _category,_product,_uom
                                        for (var uom of _uom) {

                                            for (var product of _product) {

                                                for (var category of _category) {

                                                    if (data.Cat.trim() == category.code.trim() && data.Kodeb.trim() == product.code.trim() && data.Satb.trim() == uom.unit.trim()) {

                                                        var remark = (data.Kett.trim() ? data.Kett.trim() : "") + " " + (data.Kett2.trim() ? data.Kett2.trim() : "") + " " + (data.Kett3.trim() ? data.Kett3.trim() : "") + " " + (data.Kett4.trim() ? data.Kett4.trim() : "") + " " + (data.Kett5.trim() ? data.Kett5.trim() : "");

                                                        var item = {
                                                            _stamp: "",
                                                            _type: "purchase-request-item",
                                                            _version: "",
                                                            _active: true,
                                                            _deleted: false,
                                                            _createdBy: "",
                                                            _createdDate: "",
                                                            createdAgent: "",
                                                            updatedBy: "",
                                                            _updatedDate: "",
                                                            updatedAgent: "",

                                                            productId: product._id,
                                                            product: product,

                                                            budgetPrice: data.Harga,
                                                            deliveryOrderNos: [],
                                                            remark: remark,

                                                            uomId: uom._id,
                                                            uom: {
                                                                _id: uom._id,
                                                                unit: uom.unit,
                                                            },

                                                            categoryId: category._id,
                                                            category: {
                                                                _id: category._id,
                                                                code: category.code.trim(),
                                                                name: category.name.trim(),
                                                            },
                                                        }

                                                        item.product.name = product.name.trim() + " " + data.Ketr.trim(),

                                                            items.push(item);

                                                    }
                                                }

                                            }
                                        }

                                        var map = {
                                            _stamp: _stamp,
                                            _type: "purchase request",
                                            _version: "1.0.0",
                                            _active: true,
                                            _deleted: false,
                                            _createdBy: uniq.Userin,
                                            _createdDate: new Date(_createdDate),
                                            _createAgent: "manager",
                                            _updatedBy: uniq.Usered,
                                            _updatedDate: new Date(_updatedDate),
                                            _updateAgent: "manager",
                                            no: code,
                                            refNo: uniq.Nopo,
                                            nomorRO: uniq.Ro,
                                            artikel: uniq.Art,
                                            shipmentDate: uniq.Shipment,
                                            date: new Date(uniq.TgValid),
                                            expectedDeliveryDate: "",

                                            unitId: unit._id,
                                            unit: unit,

                                            buyerId: buyer._id,
                                            buyer: buyer,

                                            isPosted: true,
                                            isUsed: false,
                                            remark: "",
                                            status: {
                                                name: "POSTED",
                                                value: 2,
                                                label: "Belum diterima Pembelian",
                                            },
                                            purchaseOrderIds: [],

                                        }

                                        map.items = items;
                                        transformData.push(map);
                                    }
                                }
                            }
                        }
                    }



                }
                resolve(transformData);

            }).catch((err) => {
                reject(err);
            });

        })
    }

    load(dataArr) {
        return new Promise((resolve, reject) => {
            var processed = [];
            for (var map of dataArr) {
                var incidentId = this.GarmentPurchaseRequest.updateOne({ "nomorRO": map.nomorRO }, { $set: map }, { upsert: true });
                processed.push(incidentId);
            }

            Promise.all(processed).then((result) => {
                resolve(result);
            }).catch((err) => {
                reject(err);
            });


        });
    }

}
