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
var MigratedFalse = [];

// internal deps 
require("mongodb-toolkit");

module.exports = class GarmentPurchaseRequestEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.collection = this.db.use(Map.garmentPurchasing.collection.GarmentPurchaseRequest);
        this.migrationLog = this.db.collection("migration-log");
        // this.unitManager = new UnitManager(db, user);
        this.unitManager = this.db.collection("units");
        this.uomManager = this.db.collection("unit-of-measurements");
        // this.uomManager = new UomManager(db, user);
        this.categoryManager = this.db.collection("garment-categories");
        this.productManager = this.db.collection("garment-products");
        this.buyerManager = this.db.collection("garment-buyers");
        // this.migratedFalse = MigratedFalse;
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

    run(table1, table2, date) {
        var startedDate = new Date()

        this.migrationLog.insert({
            code: "sql-gpr",
            description: "Sql to MongoDB: Garment-Purchase-Request",
            start: startedDate,
        })


        return new Promise((resolve, reject) => {
            this.getTimeStamp().then((result) => {
                var dateStamp;

                if (date == 1) {
                    dateStamp = "2017-01%%";
                } else if (date == 2) {
                    dateStamp = "2017-02%%";
                } else if (date == 3) {
                    dateStamp = "2017-03%%";
                } else if (date == 4) {
                    dateStamp = "2017-04%%";
                } else if (date == 5) {
                    dateStamp = "2017-05%%";
                } else if (date == 6) {
                    dateStamp = "2017-06%%";
                } else if (date == 7) {
                    dateStamp = "2017-07%%";
                } else if (date == 8) {
                    dateStamp = "2017-08%%";
                }else if (date == 9) {
                    dateStamp = "2017-09%%";
                }else if (date == 10) {
                    dateStamp = "2017-10%%";
                }else if (date == 11) {
                    dateStamp = "2017-11%%";
                }else if (date == 12) {
                    dateStamp = "2017-12%%";
                } else if (date == "latest") {
                    if (result.length != 0) {
                        var year = result[0].start.getFullYear();
                        var month = result[0].start.getMonth() + 1;
                        var day = result[0].start.getDate();

                        if (month < 10) {
                            month = "0" + month;
                        }
                        if (day < 10) {
                            day = "0" + day;
                        }

                        dateStamp = [year, month, day].join('-');
                    }
                }

                // if (result.length != 0) {
                //     var year = result[0].start.getFullYear();
                //     var month = result[0].start.getMonth() + 1;
                //     var day = result[0].start.getDate();

                //     if (month < 10) {
                //         month = "0" + month;
                //     }
                //     if (day < 10) {
                //         day = "0" + day;
                //     }

                //     dateStamp = [year, month, day].join('-');
                // } else if (result.length == 0) {
                //     dateStamp = "2017-01%%";
                // }


                this.getRowNumber(table1, table2, dateStamp)
                    .then((data) => {

                        var pageSize = 1000;
                        var dataLength = data;
                        var totalPageNumber = Math.ceil(dataLength / pageSize);

                        var date = dateStamp;
                        var processedData = [];

                        for (var i = 1; i <= totalPageNumber; i++) {
                            processedData.push(new Promise((resolve, reject) => {
                                this.extract(table1, table2, i, pageSize, date)
                                    .then((extracted) => {
                                        this.transform(extracted)
                                            .then((transformed) => {
                                                this.load(transformed)
                                                    .then((result) => {
                                                        resolve(result);
                                                    })
                                            })
                                    })
                            }))
                        }

                        Promise.all(processedData).then((processedData) => {
                            var finishedDate = new Date();
                            var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                            var updateLog = {};

                            if (processedData[0].length == 0) {
                                updateLog = {
                                    code: "sql-gpr",
                                    description: "Sql to MongoDB: Garment-Purchase-Request",
                                    start: startedDate,
                                    finish: finishedDate,
                                    executionTime: spentTime + " minutes",
                                    status: "today, data didnt exist",

                                };
                            } else {
                                updateLog = {
                                    code: "sql-gpr",
                                    description: "Sql to MongoDB: Garment-Purchase-Request",
                                    start: startedDate,
                                    finish: finishedDate,
                                    executionTime: spentTime + " minutes",
                                    status: "Successful",

                                };
                            }

                            var migrate = this.migrationLog.updateOne({ start: startedDate }, updateLog);
                            resolve(processedData);

                        });

                    });
            });
        });
    };


    getTimeStamp() {
        return new Promise((resolve, reject) => {
            this.migrationLog.find({
                code: "sql-gpr",
                description: "Sql to MongoDB: Garment-Purchase-Request",
                status: "Successful"
            }).sort({
                finish: -1
            }).limit(1).toArray(function (err, result) {
                resolve(result);
            });
        })
    }


    getRowNumber(table1, table2, tgl) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();
                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);

                        var sqlQuery = "SELECT count(POrder.Ro) as NumberOfRow from " + table1 + " as Budget inner join  " + table2 + " as POrder On Budget.Po = POrder.Nopo where (POrder.Post ='Y' or POrder.Post ='M') and left(convert(varchar,POrder.Tanggal,20),10) >= '" + tgl + "' and POrder.Harga = 0"

                        request.query(sqlQuery, function (err, result) {
                            if (result) {
                                resolve(result[0].NumberOfRow);
                            } else {
                                reject(err);
                            }
                        })
                    })
                })
        })
    }

    extract(table1, table2, page, pageSize, tgl) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();
                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);
                        var sqlQuery;


                        if (table1 == "Budget" && table2 == "POrder") {
                            sqlQuery = "exec garment_purchase_request " + page + "," + pageSize + ",'" + tgl + "' ";
                        } else {
                            sqlQuery = "exec garment_purchase_request1 " + page + "," + pageSize + ",'" + tgl + "' ";
                        }


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

    getDataUnit(unit) {
        return new Promise((resolve, reject) => {
            this.unitManager.find({ "code": { "$in": unit } }).toArray(function (err, data) {
                resolve(data);
            })
        });
    }

    getDataBuyer(buyer) {
        return new Promise((resolve, reject) => {
            this.buyerManager.find({ "code": { "$in": buyer } }).toArray(function (err, result) {
                resolve(result);
            });
        });
    }

    getDataUom(uom) {
        return new Promise((resolve, reject) => {
            this.uomManager.find({ "unit": { "$in": uom } }).toArray(function (err, result) {
                resolve(result);
            });
        });
    }

    getDataProduct(product) {
        return new Promise((resolve, reject) => {
            this.productManager.find({ "code": { "$in": product } }).toArray(function (err, result) {
                resolve(result);
            });
        });
    }

    getDataCategory(category) {
        return new Promise((resolve, reject) => {
            this.categoryManager.find({ "code": { "$in": category } }).toArray(function (err, result) {
                resolve(result);
            });
        });
    }

    transform(datas) {
        return new Promise((resolve, reject) => {
            var nomorRo;

            if (!datas.dataTest) {
                //distinct 
                nomorRo = [];
                var unitArr = [];
                var catArr = [];
                var productArr = [];
                var buyerArr = [];
                var uomArr = [];

                for (var unique of datas) {
                    var unitCode = "";

                    var codeBarang = (unique.Kodeb.trim() == unique.Cat.trim()) ? unique.Kodeb.trim() + "001" : unique.Kodeb.trim();

                    if (unique.Konf.trim() == "K.1") {
                        unitCode = "C2A"
                    } else if (unique.Konf.trim() == "K.2") {
                        unitCode = "C2B"
                    } else if (unique.Konf.trim() == "K.3") {
                        unitCode = "C2C"
                    } else if (unique.Konf.trim() == "K.4") {
                        unitCode = "C1A"
                    } else if (unique.Konf.trim() == "K.5") {
                        unitCode = "C2A"
                    } else {
                        unitCode = unique.Konf.trim();
                    }

                    if (!(nomorRo.find(o => o == unique.Ro.trim()))) {

                        nomorRo.push(unique.Ro.trim());
                    }
                    if (!(unitArr.find(o => o == unitCode))) {
                        unitArr.push(unitCode);
                    }
                    if (!(catArr.find(o => o == unique.Cat.trim()))) {
                        catArr.push(unique.Cat.trim());
                    }
                    if (!(productArr.find(o => o == codeBarang))) {
                        productArr.push(codeBarang);
                    }
                    if (!(buyerArr.find(o => o == unique.Buyer.trim()))) {
                        buyerArr.push(unique.Buyer.trim());
                    }
                    if (!(uomArr.find(o => o == unique.Satb.trim()))) {
                        uomArr.push(unique.Satb.trim());
                    }
                }

                var getUnit = this.getDataUnit(unitArr);
                var getCategory = this.getDataCategory(catArr);
                var getProduct = this.getDataProduct(productArr);
                var getBuyer = this.getDataBuyer(buyerArr);
                var getUom = this.getDataUom(uomArr);

            } else {
                nomorRo = [];
                var getUnit = datas.dataTest.Unit;
                var getCategory = datas.dataTest.Category;
                var getProduct = datas.dataTest.Product;
                var getBuyer = datas.dataTest.Buyer;
                var getUom = datas.dataTest.Uom;

                for (var unique of datas) {
                    if (!(nomorRo.find(o => o == unique.Ro.trim()))) {

                        nomorRo.push(unique.Ro.trim());
                    }
                }
            }


            Promise.all([getUnit, getCategory, getProduct, getBuyer, getUom]).then((result) => {
                var _unit = result[0];
                var _category = result[1];
                var _product = result[2];
                var _buyer = result[3];
                var _uom = result[4];

                var transformData = {
                    datas: [],
                    nomorRo: [],
                };

                var unitNotFound = [];
                var buyerNotFound = [];
                var categoryNotFound = [];
                var productNotFound = [];
                var uomNotFound = [];
                var no = 1;

                for (var Ro of nomorRo) {
                    var code = generateCode();
                    var items = [];
                    var map = {};
                    for (var data of datas) {

                        var _createdDatehours = new Date(data.Jamin).getHours() ? new Date(data.Jamin).getHours() : "";
                        var _createdDateminutes = new Date(data.Jamin).getMinutes() ? new Date(data.Jamin).getMinutes() : "";
                        var _createdDatedate = data.Tglin.toString();
                        var _createdDate = _createdDatedate + ":" + _createdDatehours + ":" + "" + _createdDateminutes;

                        var _updatedDatehours = new Date(data.Jamed).getHours() ? new Date(data.Jamed).getHours() : "";
                        var _updatedDateminutes = new Date(data.Jamed).getMinutes() ? new Date(data.Jamed).getMinutes() : "";
                        var _updatedDatedate = data.Tgled.toString();
                        var _updatedDate = _updatedDatedate + ":" + _updatedDatehours + ":" + "" + _updatedDateminutes;


                        if (Ro == data.Ro) {

                            var unitCode = "";
                            if (data.Konf.trim() == "K.1") {
                                unitCode = "C2A"
                            } else if (data.Konf.trim() == "K.2") {
                                unitCode = "C2B"
                            } else if (data.Konf.trim() == "K.3") {
                                unitCode = "C2C"
                            } else if (data.Konf.trim() == "K.4") {
                                unitCode = "C1A"
                            } else if (data.Konf.trim() == "K.5") {
                                unitCode = "C2A"
                            } else {
                                unitCode = data.Konf.trim();
                            }

                            var _stamp = ObjectId();

                            var codeBarang = (data.Kodeb.trim() == data.Cat.trim()) ? data.Kodeb.trim() + "001" : data.Kodeb.trim();

                            var unit = (_unit.find(o => o.code.trim() == unitCode)) ? (_unit.find(o => o.code.trim() == unitCode)) : (unitNotFound.find(o => o == unitCode)) ? true : unitNotFound.push(unitCode);
                            var buyer = (_buyer.find(o => o.code.trim() == data.Buyer.trim())) ? (_buyer.find(o => o.code.trim() == data.Buyer.trim())) : (buyerNotFound.find(o => o == data.Buyer)) ? true : buyerNotFound.push(data.Buyer);
                            var product = (_product.find(o => o.code.trim() == codeBarang)) ? (_product.find(o => o.code.trim() == codeBarang)) : (productNotFound.find(o => o == codeBarang)) ? true : productNotFound.push(codeBarang);
                            var uom = (_uom.find(o => o.unit.trim() == data.Satb.trim())) ? (_uom.find(o => o.unit.trim() == data.Satb.trim())) : (uomNotFound.find(o => o == data.Satb.trim())) ? true : uomNotFound.push(data.Satb.trim());
                            var category = (_category.find(o => o.code.trim() == data.Cat.trim())) ? (_category.find(o => o.code.trim() == data.Cat.trim())) : (categoryNotFound.find(o => o == data.Cat.trim())) ? true : categoryNotFound.push(data.Cat.trim());

                            //getting items
                            var remark = data.Ketr.trim() ? data.Ketr.trim() : "";

                            var Colors = [];
                            if (data.Clr1.trim() && data.Clr1.trim() != "" && data.Clr1.trim() == null) {
                                Colors.push(data.Clr1.trim());
                            } if (data.Clr2.trim() && data.Clr2.trim() != "" && data.Clr2.trim() == null) {
                                Colors.push(data.Clr2.trim());
                            } if (data.Clr3.trim() && data.Clr3.trim() != "" && data.Clr3.trim() == null) {
                                Colors.push(data.Clr3.trim());
                            } if (data.Clr4.trim() && data.Clr4.trim() != "" && data.Clr4.trim() == null) {
                                Colors.push(data.Clr4.trim());
                            } if (data.Clr5.trim() && data.Clr5.trim() != "" && data.Clr5.trim() == null) {
                                Colors.push(data.Clr5.trim());
                            } if (data.Clr6.trim() && data.Clr6.trim() != "" && data.Clr6.trim() == null) {
                                Colors.push(data.Clr6.trim());
                            } if (data.Clr7.trim() && data.Clr7.trim() != "" && data.Clr7.trim() == null) {
                                Colors.push(data.Clr7.trim());
                            } if (data.Clr8.trim() && data.Clr8.trim() != "" && data.Clr8.trim() == null) {
                                Colors.push(data.Clr8.trim());
                            } if (data.Clr9.trim() && data.Clr9.trim() != "" && data.Clr9.trim() == null) {
                                Colors.push(data.Clr9.trim());
                            } if (data.Clr10.trim() && data.Clr10.trim() != "" && data.Clr10.trim() == null) {
                                Colors.push(data.Clr10.trim());
                            }

                            if (product._id && uom._id && category._id) {
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
                                        code: codeBarang,
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
                                    id_po: (data.ID_PO),
                                    isUsed: false,
                                }
                                items.push(item);

                            } else if (!product._id || !uom._id || !category._id) {
                                // migrated = false;
                                map.migrated = false;
                                map.dataItemNotfound = {
                                    uomUnit: uomNotFound,
                                    categoryCode: categoryNotFound,
                                    productCode: productNotFound,
                                };
                            }

                            //begin transform
                            if (unit._id && buyer._id) {

                                Object.assign(map, {
                                    _stamp: _stamp,
                                    _type: "purchase request",
                                    _version: "1.0.0",
                                    _active: true,
                                    _deleted: false,
                                    _createdBy: data.Userin,
                                    _createdDate: new Date(_createdDate),
                                    _createAgent: "manager",
                                    _updatedBy: data.Usered,
                                    _updatedDate: new Date(_updatedDate),
                                    _updateAgent: "manager",
                                    // no: data.Ro,
                                    no: generateCode() + (no++),
                                    roNo: data.Ro,
                                    artikel: data.Art,
                                    shipmentDate: data.Shipment,
                                    date: new Date(data.TgValid),
                                    expectedDeliveryDate: data.expectedDeliveryDate ? data.expectedDeliveryDate : "",

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

                                })

                            } else {

                                map.migrated = false;
                                map.dataNotfound = {
                                    unitCode: unitNotFound,
                                    buyerCode: buyerNotFound,
                                };
                            }
                        }

                    }

                    map.items = items;
                    transformData.datas.push(map);

                }
                transformData.nomorRo = (nomorRo);
                resolve(transformData);
            });
        })

    }

    findData(roNo) {
        return new Promise((resolve, reject) => {
            this.collection.find({ "roNo": { $in: roNo } }).toArray(function (err, result) {
                resolve(result);
            });
        });
    }

    upsertData(Ro, data) {
        return new Promise((resolve, reject) => {
            this.collection.updateOne({ "roNo": Ro }, { $set: data }, { upsert: true }).then((result) => {
                resolve(result);
            })
        });
    }

    load(dataArr) {
        return new Promise((resolve, reject) => {

            var processed = [];
            var roNoArr = dataArr.nomorRo;
            var dataTemp = [];

            this.findData(roNoArr).then((result) => {
                dataTemp = result;

                for (var data of dataArr.datas) {

                    var temp = dataTemp.find(o => o.roNo == data.roNo);

                    if (temp) {
                        for (var item of temp.items) {
                            var itemTemp = data.items.find(o => o.id_po == item.id_po);
                            if (!itemTemp) {
                                data.items.push(item);
                            }
                        }
                    };

                    if (data.migrated == false) {
                        MigratedFalse.find(o => o == data.roNo) ? true : MigratedFalse.push(data.roNo);
                    }

                    if ((MigratedFalse.find(o => o == data.roNo))) {
                        data.migrated = false;
                    }
                    if (!(MigratedFalse.find(o => o == data.roNo))) {
                        data.migrated = true;
                        data.dataItemNotfound = {};
                        data.dataNotfound = {};
                    }

                    processed.push(this.collection.updateOne({ "roNo": data.roNo }, { $set: data }, { upsert: true }));
                }

                Promise.all(processed).then((processed) => {
                    resolve(processed);
                })

            });

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
