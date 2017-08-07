'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require("module-toolkit").BaseManager;
var moment = require("moment");
var generateCode = require("../../../src/utils/code-generator");
var Models = require("dl-models");
var Map = Models.map;

var UnitManager = require('../../managers/master/unit-manager');
var UomManager = require('../../managers/master/uom-manager');

var garmentPurchaseRequestManager = require('../../managers/garment-purchasing/purchase-request-manager');

// internal deps 
require("mongodb-toolkit");

module.exports = class GarmentPurchaseRequestEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.collection = this.db.use(Map.garmentPurchasing.collection.GarmentPurchaseRequest);
        this.migrationLog = this.db.collection("migration-log");
        this.unitManager = new UnitManager(db, user);
        this.uomManager = new UomManager(db, user);
        this.categoryManager = this.db.collection("garment-categories");
        this.productManager = this.db.collection("garment-products");
        this.buyerManager = this.db.collection("garment-buyers");
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
            var noFilter = {
                "no": {
                    "$regex": regex
                }
            };

            keywordFilter["$or"] = [noFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    run(table1, table2) {
        var startedDate = new Date()

        this.migrationLog.insert({
            code: "sql-gpr",
            description: "Sql to MongoDB: Garment-Purchase-Request",
            start: startedDate,
        })

        return new Promise((resolve, reject) => {
            var migrate;
            this.extract(table1, table2)
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
                    migrate = this.migrationLog.updateOne({ start: startedDate }, updateLog);
                    resolve(migrate);
                })
            // .catch((err) => {
            //     var finishedDate = new Date();
            //     var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
            //     var updateLog = {
            //         code: "sql-gpr",
            //         description: "Sql to MongoDB: Garment-Purchase-Request",
            //         start: startedDate,
            //         finish: finishedDate,
            //         executionTime: spentTime + " minutes",
            //         status: err
            //     };
            //     this.migrationLog.updateOne({ start: startedDate }, updateLog);
            // });
            // resolve(migrate);
        });
    };

    extract(table1, table2) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();
                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);

                        var sqlQuery = "select POrder.Harga,POrder.Tanggal,POrder.Post,POrder.Clr1,POrder.Clr2,POrder.Clr3,POrder.Clr4,POrder.Clr5,POrder.Clr6,POrder.Clr7,POrder.Clr8,POrder.Clr9,POrder.Clr10,POrder.Ro,POrder.Art,POrder.Buyer,POrder.Shipment,POrder.Nopo,POrder.TgValid,POrder.Delivery,POrder.Konf,POrder.Cat,POrder.Userin,POrder.Tglin,POrder.Usered,POrder.Tgled,POrder.Kodeb,POrder.Ketr,POrder.Qty,POrder.Satb,Budget.Harga,POrder.Kett,POrder.Kett2,POrder.Kett3,POrder.Kett4,POrder.Kett5 from " + table1.trim() + " as Budget inner join " + table2.trim() + " as POrder On Budget.Po = POrder.Nopo where (POrder.Post ='Y' or POrder.Post ='M') and POrder.Harga = 0 and YEAR(POrder.Tanggal) >= 2016";

                        // var sqlQuery = "select POrder.Ro,POrder.Art,POrder.Buyer,POrder.Shipment,POrder.Nopo,POrder.TgValid,POrder.Delivery,POrder.Konf,POrder.Cat,POrder.Userin,POrder.Tglin,POrder.Usered,POrder.Tgled,POrder.Kodeb,POrder.Ketr,POrder.Qty,POrder.Satb,Budget.Harga,POrder.Kett,POrder.Kett2,POrder.Kett3,POrder.Kett4,POrder.Kett5 from Budget1 as Budget inner join POrder1 as POrder On Budget.Po = POrder.Nopo";
                        request.query(sqlQuery, function (err, result) {
                            if (result) {
                                resolve(result);
                            } else {
                                reject(err);
                            }
                        })
                    })
                })
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

            if (!datas.dataTest) {
                var getUnit = this.getDataUnit();
                var getCategory = this.getDataCategory();
                var getProduct = this.getDataProduct();
                var getBuyer = this.getDataBuyer();
                var getUom = this.getDataUom();
            } else {
                var getUnit = datas.dataTest.Unit;
                var getCategory = datas.dataTest.Category;
                var getProduct = datas.dataTest.Product;
                var getBuyer = datas.dataTest.Buyer;
                var getUom = datas.dataTest.Uom;
            }


            Promise.all([getUnit, getCategory, getProduct, getBuyer, getUom]).then((result) => {
                var _unit = result[0].data ? result[0].data : result[0];
                var _category = result[1];
                var _product = result[2];
                var _buyer = result[3];
                var _uom = result[4].data ? result[4].data : result[4];
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
                    } else {
                        unitCode = uniq.Konf.trim();
                    }

                    var _createdDatehours = new Date(uniq.Jamin).getHours() ? new Date(uniq.Jamin).getHours() : "";
                    var _createdDateminutes = new Date(uniq.Jamin).getMinutes() ? new Date(uniq.Jamin).getMinutes() : "";
                    var _createdDatedate = uniq.Tglin.toString();
                    var _createdDate = _createdDatedate + ":" + _createdDatehours + ":" + "" + _createdDateminutes;
                    var _updatedDatehours = new Date(uniq.Jamed).getHours() ? new Date(uniq.Jamed).getHours() : "";
                    var _updatedDateminutes = new Date(uniq.Jamed).getMinutes() ? new Date(uniq.Jamed).getMinutes() : "";
                    var _updatedDatedate = uniq.Tgled.toString();
                    var _updatedDate = _updatedDatedate + ":" + _updatedDatehours + ":" + "" + _updatedDateminutes;

                    var items = [];


                    for (var data of datas) {
                        if (uniq.Ro == data.Ro) {
                            var migrated = true;
                            for (var uom of _uom) {

                                for (var product of _product) {

                                    for (var category of _category) {

                                        if (data.Cat.trim() == category.code.trim() && data.Kodeb.trim() == product.code.trim() && data.Satb.trim() == uom.unit.trim()) {

                                            var remark = (data.Ketr.trim() ? data.Ketr.trim() : "" + " " + data.Kett.trim() ? data.Kett.trim() : "") + " " + (data.Kett2.trim() ? data.Kett2.trim() : "") + " " + (data.Kett3.trim() ? data.Kett3.trim() : "") + " " + (data.Kett4.trim() ? data.Kett4.trim() : "") + " " + (data.Kett5.trim() ? data.Kett5.trim() : "");

                                            var Colors = [];

                                            if (data.Clr1) {
                                                Colors.push(data.Clr1);
                                            } if (data.Clr2) {
                                                Colors.push(data.Clr2);
                                            } if (data.Clr3) {
                                                Colors.push(data.Clr3);
                                            } if (data.Clr4) {
                                                Colors.push(data.Clr4);
                                            } if (data.Clr5) {
                                                Colors.push(data.Clr5);
                                            } if (data.Clr6) {
                                                Colors.push(data.Clr6);
                                            } if (data.Clr7) {
                                                Colors.push(data.Clr7);
                                            } if (data.Clr8) {
                                                Colors.push(data.Clr8);
                                            } if (data.Clr9) {
                                                Colors.push(data.Clr9);
                                            } if (data.Clr10) {
                                                Colors.push(data.Clr10);
                                            }

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
                                                product: {
                                                    _id: product._id,
                                                    code: product.code,
                                                    name: product.name,
                                                    price: product.price,
                                                    currency: product.currency,
                                                    description: product.description,
                                                    uomId: product.uomId,
                                                    uom: product.uom,
                                                    tags: product.tags,
                                                    properties: product.properties,
                                                },

                                                budgetPrice: data.Harga,
                                                quantity: data.Qty,
                                                deliveryOrderNos: [],
                                                remark: remark,

                                                refNo: data.Nopo,


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
                                                colors: Colors,
                                            }
                                            items.push(item);
                                            break;
                                        }
                                    }

                                }
                            }

                            // data not found
                            if (items == 0 || !items || items == []) {
                                var temps = [];

                                if (data.Cat.trim() != category.code.trim()) {
                                    temps.push("!(category.Code) data didnt exist: " + data.Cat.trim());
                                }

                                if (data.Kodeb.trim() != product.code.trim()) {

                                    temps.push("!(product.Code) data didnt exist: " + data.Kodeb.trim());
                                }


                                if (data.Satb.trim() != uom.unit.trim()) {

                                    temps.push("!(uom.Unit) data didnt exist: " + data.Satb.trim());
                                }
                                items.push(temps);
                                migrated = false;
                            }
                            break;
                        }
                    }

                    var map = {};
                    for (var buyer of _buyer) {

                        for (var unit of _unit) {

                            if (unitCode == unit.code.trim() && uniq.Buyer.trim() == buyer.code.trim()) {

                                map = {
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
                                    roNo: uniq.Ro,
                                    artikel: uniq.Art,
                                    shipmentDate: uniq.Shipment,
                                    date: new Date(uniq.TgValid),
                                    expectedDeliveryDate: uniq.expectedDeliveryDate ? uniq.expectedDeliveryDate : "",

                                    unitId: unit._id,
                                    unit: {
                                        _id: unit._id,
                                        code: unit.code,
                                        name: unit.name,
                                        description: unit.description,
                                        divisionId: unit.divisionId,
                                        division: unit.division,


                                    },

                                    buyerId: buyer._id,
                                    buyer: {
                                        "_id": buyer._id,
                                        "code": buyer.code,
                                        "name": buyer.name,
                                        "address": buyer.address,
                                        "city": buyer.city,
                                        "country": buyer.country,
                                        "contact": buyer.contact,
                                        "tempo": buyer.tempo,
                                        "type": buyer.type,
                                        "NPWP": buyer.NPWP,
                                    },

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

                                if (migrated == true) {
                                    map.items = items;
                                    map.migrated = true;
                                }
                                else if (migrated == false) {
                                    map.items = {
                                        notFound: items
                                    };
                                    map.migrated = migrated;
                                }

                                transformData.push(map);
                                break;
                            }
                        }
                    }

                    //data not found
                    if (Object.getOwnPropertyNames(map).length == 0) {

                        if (unitCode != unit.code.trim()) {
                            map.unitId = ("!(unit.Code) data didnt exist: " + unitCode);
                            map.unit = {};
                        }

                        if (uniq.Buyer.trim() != buyer.code.trim()) {
                            map.buyerId = "!(buyer.Code) data didnt exist: " + uniq.Buyer.trim();
                            map.buyer = {};
                        }

                        migrated = false;
                        map.no = code;
                        map.roNo = uniq.Ro;
                        map.items = {
                            notFound: items
                        };
                        map.migrated = migrated;

                        transformData.push(map);
                    }

                }
                resolve(transformData)
            })

        })

    }

    load(dataArr) {
        return new Promise((resolve, reject) => {
            var processed = [];

            for (var map of dataArr) {
                var process = this.collection.updateOne({ "roNo": map.roNo }, { $set: map }, { upsert: true });
                processed.push(process);
            }

            Promise.all(processed).then((result) => {
                resolve(result);
            })

        });
    }


    _createIndexes() {
        var dateIndex = {
            name: `ix_${Map.garmentPurchasing.collection.GarmentPurchaseRequest}__updatedDate`,

            key: {
                _updatedDate: -1
            }
        }

        var codeIndex = {
            name: `ix_${Map.garmentPurchasing.collection.GarmentPurchaseRequest}_no`,
            key: {
                no: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }

}
