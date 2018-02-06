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

            var roFilter = {
                "roNo": {
                    "$regex": regex
                }
            };

            var buyerNameFilter = {
                "buyer.name": {
                    "$regex": regex
                }
            };

            keywordFilter["$or"] = [noFilter, roFilter,buyerNameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    run(tanggal, t1, t2, page, size,buyerFilter, tahun) {
        var startedDate = new Date();
        var code;
        var buyerFilter=buyerFilter;
        if(!buyerFilter){
            code = (t1 == "Budget" ? "sql-gpr" : "sql-gpr(Budget1,POrder1)")
            this.migrationLog.insert({
                code: code,
                description: "Sql to MongoDB: Garment-Purchase-Request "+code,
                start: startedDate,
            })
        }else{
            code = (t1 == "Budget" ? "sql-gpr" : "sql-gpr(Budget1,POrder1)")
            this.migrationLog.insert({
                code: code+" "+buyerFilter,
                description: "Sql to MongoDB: Garment-Purchase-Request "+code,
                start: startedDate,
            })
        }


        this.tgl = tanggal;
        this.year = tahun;

        return new Promise((resolve, reject) => {
            var table1 = t1;
            var table2 = t2;

            this.getTimeStamp(t1).then((result) => {
                var dateStamp;
                if (this.tgl.trim() == "latest" && !buyerFilter) {
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
                    } else if (result.length == 0) {
                        dateStamp = "2017-01-01"
                    }
                } else {

                    var monthOpt = ["latest",
                        "january", "february", "march",
                        "april", "may", "june",
                        "july", "august", "september",
                        "october", "november", "december"];
                    var tempYear = this.year;

                    if(buyerFilter && this.tgl.trim() == "latest"){
                        this.tgl=monthOpt[new Date().getMonth()+1]                       
                    }

                    if (this.tgl == monthOpt[1].trim()) {
                        dateStamp = tempYear + "-01%%";
                    } else if (this.tgl == monthOpt[2].trim()) {
                        dateStamp = tempYear + "-02%%";
                    } else if (this.tgl == monthOpt[3].trim()) {
                        dateStamp = tempYear + "-03%%";
                    } else if (this.tgl == monthOpt[4].trim()) {
                        dateStamp = tempYear + "-04%%";
                    } else if (this.tgl == monthOpt[5].trim()) {
                        dateStamp = tempYear + "-05%%";
                    } else if (this.tgl == monthOpt[6].trim()) {
                        dateStamp = tempYear + "-06%%";
                    } else if (this.tgl == monthOpt[7].trim()) {
                        dateStamp = tempYear + "-07%%";
                    } else if (this.tgl == monthOpt[8].trim()) {
                        dateStamp = tempYear + "-08%%";
                    } else if (this.tgl == monthOpt[9].trim()) {
                        dateStamp = tempYear + "-09%%";
                    } else if (this.tgl == monthOpt[10].trim()) {
                        dateStamp = tempYear + "-10%%";
                    } else if (this.tgl == monthOpt[11].trim()) {
                        dateStamp = tempYear + "-11%%";
                    } else if (this.tgl == monthOpt[12].trim()) {
                        dateStamp = tempYear + "-12%%";
                    }
                }

                this.tgl = dateStamp;

                var flag = table1;
                var processedData = new Promise((res, rej) => {
                    this.extract(table1, table2, page, size, dateStamp,buyerFilter)
                        .then((extracted) => {
                            this.transform(extracted, table1)
                                .then((transformed) => {
                                    var transformed = transformed;
                                    this.beforeLoad(transformed)
                                        .then((existingData) => {
                                            this.load(transformed, existingData)
                                                .then((result) => {
                                                    res(result);
                                                })
                                        })

                                })
                        })
                });

                processedData.then((result) => {
                    var finishedDate = new Date();
                    var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                    var updateLog = {};
                    var code = (t1 == "Budget" ? "sql-gpr" : "sql-gpr(Budget1,POrder1)")
                    if (result.processed == 0) {
                        updateLog = {
                            code: code,
                            description: "Sql to MongoDB: Garment-Purchase-Request "+code,
                            start: startedDate,
                            finish: finishedDate,
                            executionTime: spentTime + " minutes",
                            status: "today, data didnt exist",

                        };
                    } else {
                        updateLog = {
                            code: code,
                            description: "Sql to MongoDB: Garment-Purchase-Request "+code,
                            start: startedDate,
                            finish: finishedDate,
                            executionTime: spentTime + " minutes",
                            status: "Successful",

                        };
                    }

                    var migrate = this.migrationLog.updateOne({ start: startedDate }, updateLog);
                    resolve(result);
                });
            });

        });
    };


    getTimeStamp(opt) {
        var code = (opt == "Budget" ? "sql-gpr" : "sql-gpr(Budget1,POrder1)");
        return new Promise((resolve, reject) => {
            this.migrationLog.find({
                code: code,
                description: "Sql to MongoDB: Garment-Purchase-Request "+code,
                status: "Successful"
            }).sort({
                finish: -1
            }).limit(1).toArray(function (err, result) {
                resolve(result);
            });
        })
    }



    getRowNumber(table1, table2, tgl,buyerFilter) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();
                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);
                        var sqlQuery;
                        if(!buyerFilter){
                            if (table1 == "Budget") {
                                if (tgl.includes("%%")) {
                                    sqlQuery = "SELECT count(distinct POrder.Ro) as NumberOfRow from " + table2 + " as POrder inner join  " + table1 + " as Budget On Budget.Po = POrder.Nopo where (POrder.Post ='Y' or POrder.Post ='M') and left(convert(varchar,POrder.TgValid,20),10) like '" + tgl + "' and POrder.Harga = 0 and porder.CodeSpl=''"
                                } else {
                                    sqlQuery = "SELECT count(distinct POrder.Ro) as NumberOfRow from " + table2 + " as POrder inner join  " + table1 + " as Budget On Budget.Po = POrder.Nopo where (POrder.Post ='Y' or POrder.Post ='M') and left(convert(varchar,POrder.TgValid,20),10) >= '" + tgl + "' and POrder.Harga = 0 and porder.CodeSpl=''"
                                }
                            }else{
                                sqlQuery = "SELECT count(distinct POrder.Ro) as NumberOfRow from POrder1 as POrder inner join Budget1 as Budget On Budget.Po = POrder.Nopo where left(convert(varchar,POrder.tglin,20),10) >= '" + tgl + "' and POrder.Harga = 0 and porder.CodeSpl=''"
                            }
                        }else{
                            if (table1 == "Budget" && buyerFilter) {
                                sqlQuery = "SELECT count(distinct POrder.Ro) as NumberOfRow from " + table2 + " as POrder inner join  " + table1 + " as Budget On Budget.Po = POrder.Nopo where (POrder.Post ='Y' or POrder.Post ='M') and left(convert(varchar,POrder.TgValid,20),10) >= '" + tgl + "' and POrder.Harga = 0 and porder.CodeSpl='' and porder.buyer='"+buyerFilter+"'"                               
                            }else if(table1 == "Budget1" && buyerFilter){
                                sqlQuery = "SELECT count(distinct POrder.Ro) as NumberOfRow from " + table2 + " as POrder inner join  " + table1 + " as Budget On Budget.Po = POrder.Nopo where left(convert(varchar,POrder.TgValid,20),10) >= '" + tgl + "' and POrder.Harga = 0 and porder.CodeSpl='' and porder.buyer='"+buyerFilter+"'"                               
                            }
                        }


                        request.query(sqlQuery, function (err, result) {
                            if (result) {
                                console.log(result[0].NumberOfRow);
                                resolve(result[0].NumberOfRow);
                            } else {
                                reject(err);
                            }
                        })
                    })
                })
        })
    }

    extract(table1, table2, page, pageSize, tgl,buyerFilter) {
        return new Promise((resolve, reject) => {
            this.sql.startConnection()
                .then(() => {

                    var transaction = this.sql.transaction();
                    transaction.begin((err) => {

                        var request = this.sql.transactionRequest(transaction);
                        var sqlQuery;
                        if (!buyerFilter ){
                            if (tgl.includes("%%")) {
                                if (table1 == "Budget" && table2 == "POrder") {
                                    sqlQuery = "exec garment_purchase_request_period " + page + "," + pageSize + ",'" + tgl + "' ";
                                }
                                else {
                                    sqlQuery = "exec garment_purchase_request2 " + page + "," + pageSize + ",'" + tgl + "' ";
                                }
                            } else {
                                if (table1 == "Budget" && table2 == "POrder") {
                                    sqlQuery = "exec garment_purchase_request " + page + "," + pageSize + ",'" + tgl + "' ";
                                } else {
                                    sqlQuery = "exec garment_purchase_request2 " + page + "," + pageSize + ",'" + tgl + "' ";
                                }
                            }
                        }else{
                            if (table1 == "Budget" && table2 == "POrder"){
                                sqlQuery = "exec extract_garment_purchase_request " + page + "," + pageSize + ",'" + tgl + "','" + buyerFilter + "' ";
                            }else{
                                sqlQuery = "exec extract_garment_purchase_request2 " + page + "," + pageSize + ",'" + tgl + "','" + buyerFilter + "' ";
                            }
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

    extractRo(ro, table1) {
        return new Promise((resolve, reject) => {

            if (Array.isArray(table1)) {
                resolve(table1);
            } else

                this.sql.startConnection()
                    .then(() => {
                        var transaction = this.sql.transaction();
                        transaction.begin((err) => {

                            var request = this.sql.transactionRequest(transaction);
                            var sqlQuery;
                            if (table1 == "Budget") {
                                sqlQuery = "SELECT ROW_NUMBER() OVER ( ORDER BY POrder.Ro ASC ) AS RowNum,POrder.ID_PO,POrder.Harga as hrg,POrder.Tanggal,POrder.jamin,POrder.jamed,POrder.Post,POrder.Urut,POrder.Clr1,POrder.Clr2,POrder.Clr3,POrder.Clr4,POrder.Clr5,POrder.Clr6,POrder.Clr7,POrder.Clr8,POrder.Clr9,POrder.Clr10,POrder.Ro,POrder.Art,POrder.Buyer,POrder.Shipment,POrder.Nopo,POrder.TgValid,POrder.Delivery,POrder.Konf,POrder.Cat,POrder.Userin,POrder.Tglin,POrder.Usered,POrder.Tgled,POrder.Kodeb,POrder.Ketr,POrder.Qty,POrder.Satb,POrder.Kett,POrder.Kett2,POrder.Kett3,POrder.Kett4,POrder.Kett5,Budget.Harga from POrder as POrder inner join Budget as Budget On Budget.Po = POrder.Nopo where (POrder.Post ='Y' or POrder.Post ='M') and left(convert(varchar,POrder.tgvalid,20),10) >= '2017-01-01' and POrder.Harga = 0 and porder.CodeSpl='' and porder.ro='" + ro + "'";
                            } else {
                                sqlQuery = "SELECT ROW_NUMBER() OVER ( ORDER BY POrder.Ro ASC ) AS RowNum,POrder.ID,POrder.Harga as hrg,POrder.Tanggal,POrder.jamin,POrder.jamed,POrder.Post,POrder.Urut,POrder.Clr1,POrder.Clr2,POrder.Clr3,POrder.Clr4,POrder.Clr5,POrder.Clr6,POrder.Clr7,POrder.Clr8,POrder.Clr9,POrder.Clr10,POrder.Ro,POrder.Art,POrder.Buyer,POrder.Shipment,POrder.Nopo,POrder.TgValid,POrder.Delivery,POrder.Konf,POrder.Cat,POrder.Userin,POrder.Tglin,POrder.Usered,POrder.Tgled,POrder.Kodeb,POrder.Ketr,POrder.Qty,POrder.Satb,POrder.Kett,POrder.Kett2,POrder.Kett3,POrder.Kett4,POrder.Kett5,Budget.Harga from POrder1 as POrder inner join Budget1 as Budget On Budget.Po = POrder.Nopo where left(convert(varchar,POrder.tglin,20),10) >= '2017-01-01' and POrder.Harga = 0 and porder.CodeSpl='' and porder.ro='" + ro + "'";
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

    beforeTransform(Ro, table1) {
        var Ro = Ro;
        var table1 = table1;

        return new Promise((resolve, reject) => {
            var transformData = [];
            var no = 1;
            var extractData = (Array.isArray(table1)) ? Promise.resolve(table1) : this.extractRo(Ro, table1);

            extractData.then((extract) => {

                var extract = extract;
                var items = [];
                var map = {};
                var createdDateTemp = [];
                var updatedDateTemp = [];

                var _createdDate;
                var _updatedDate;

                var unitNotFound = [];
                var buyerNotFound = [];
                var categoryNotFound = [];
                var productNotFound = [];
                var uomNotFound = [];

                var unitArr = [];
                var catArr = [];
                var productArr = [];
                var buyerArr = [];
                var uomArr = [];

                if (!Array.isArray(table1)) {
                    for (var unique of extract) {
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
                            unitCode = "C1B"
                        } else {
                            unitCode = unique.Konf.trim();
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
                    var getUnit = extract.dataTest.Unit;
                    var getCategory = extract.dataTest.Category;
                    var getProduct = extract.dataTest.Product;
                    var getBuyer = extract.dataTest.Buyer;
                    var getUom = extract.dataTest.Uom;
                }



                Promise.all([getUnit, getCategory, getProduct, getBuyer, getUom]).then((result) => {
                    var _unit = result[0];
                    var _category = result[1];
                    var _product = result[2];
                    var _buyer = result[3];
                    var _uom = result[4];

                    var obj = new ObjectId();
                    var code = generateCode(extract[0].ID_PO ? extract[0].ID_PO + obj.toString() : extract[0].ID + obj.toString());

                    for (var data of extract) {
                        // var code = generateCode(data.ID_PO + data.RowNum ? data.ID_PO + data.RowNum : data.ID + data.RowNum);
                        var createdYear = data.Tglin.getFullYear();
                        var createdMonth = data.Tglin.getMonth() + 1;
                        var createdDay = data.Tglin.getDate();

                        if (createdMonth < 10) {
                            createdMonth = "0" + createdMonth;
                        }
                        if (createdDay < 10) {
                            createdDay = "0" + createdDay;
                        }
                        _createdDate = [createdYear, createdMonth, createdDay].join('-');

                        var updatedYear = data.Tglin.getFullYear();
                        var updatedMonth = data.Tglin.getMonth() + 1;
                        var updatedDay = data.Tglin.getDate();

                        if (updatedMonth < 10) {
                            updatedMonth = "0" + updatedMonth;
                        }
                        if (updatedDay < 10) {
                            updatedDay = "0" + updatedDay;
                        }
                        _updatedDate = [updatedYear, updatedMonth, updatedDay].join('-');

                        createdDateTemp.push(data.jamin.trim());
                        updatedDateTemp.push(data.jamed.trim());

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
                            unitCode = "C1B"
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
                        var remarkTemp = [];
                        if (data.Ketr.trim() != "") {
                            remarkTemp.push(data.Ketr.trim());
                        }
                        if (data.Kett.trim() != "") {
                            remarkTemp.push(data.Kett.trim());
                        }
                        if (data.Kett2.trim() != "") {
                            remarkTemp.push(data.Kett2.trim());
                        }
                        if (data.Kett3.trim() != "") {
                            remarkTemp.push(data.Kett3.trim());
                        }
                        if (data.Kett4.trim() != "") {
                            remarkTemp.push(data.Kett4.trim());
                        }
                        if (data.Kett5.trim() != "") {
                            remarkTemp.push(data.Kett5.trim());
                        }
                        // var remark = data.Ketr.trim() ? data.Ketr.trim() : "";
                        var remark = remarkTemp.toString();

                        var Colors = [];
                        if (data.Clr1 != null || data.Clr2 != null || data.Clr3 != null || data.Clr4 != null || data.Clr5 != null || data.Clr6 != null || data.Clr7 != null || data.Clr8 != null || data.Clr9 != null || data.Clr10 != null) {
                            if (data.Clr1.trim() != "") {
                                Colors.push(data.Clr1.trim());
                            } if (data.Clr2.trim() != "") {
                                Colors.push(data.Clr2.trim());
                            } if (data.Clr3.trim() != "") {
                                Colors.push(data.Clr3.trim());
                            } if (data.Clr4.trim() != "") {
                                Colors.push(data.Clr4.trim());
                            } if (data.Clr5.trim() != "") {
                                Colors.push(data.Clr5.trim());
                            } if (data.Clr6.trim() != "") {
                                Colors.push(data.Clr6.trim());
                            } if (data.Clr7.trim() != "") {
                                Colors.push(data.Clr7.trim());
                            } if (data.Clr8.trim() != "") {
                                Colors.push(data.Clr8.trim());
                            } if (data.Clr9.trim() != "") {
                                Colors.push(data.Clr9.trim());
                            } if (data.Clr10.trim() != "") {
                                Colors.push(data.Clr10.trim());
                            }

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
                                urut: data.Urut,

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
                                    uomId: category.uomId,
                                    uom: {
                                        _id: category.uomId,
                                        unit: category.uom.unit,
                                    }

                                },
                                colors: Colors,
                                id_po: (data.ID_PO ? data.ID_PO : data.ID),
                                isUsed: false,
                                purchaseOrderId: {},
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
                                // _createdDate: new Date(_createdDate),
                                _createAgent: "manager",
                                _updatedBy: data.Usered,
                                // _updatedDate: new Date(_updatedDate),
                                _updateAgent: "manager",
                                // no: data.Ro,
                                // no: code,
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

                        } else if (!unit._id || !buyer._id) {

                            map.roNo = data.Ro;
                            map.migrated = false;
                            map.dataNotfound = {
                                unitCode: unitNotFound,
                                buyerCode: buyerNotFound,
                            };
                        }

                    }

                    map.no = code;
                    map._createdDate = new Date(_createdDate + ":" + createdDateTemp.sort()[0]);
                    map._updatedDate = new Date(_updatedDate + ":" + updatedDateTemp.sort()[0]);
                    map.items = items;

                    transformData.push(map);
                    resolve(transformData);

                });

            })
        });
    }


    transform(data, table1) {
        var table1 = table1;
        var data = data;
        return new Promise((resolve, reject) => {
            var process = [];
            var promise = [];

            if (Array.isArray(table1)) {
                data = [table1[0]];
                table1 = table1;
            }

            for (var i of data) {
                process.push(this.beforeTransform(i.Ro, table1));
            }

            Promise.all(process).then((test) => {
                resolve(test);
            })

        })


    }

    findData(roNo) {
        return new Promise((resolve, reject) => {
            this.collection.find({ "roNo": { $in: roNo } }).toArray(function (err, result) {
                resolve(result);
            });
        });
    }

    // delete(ro) {
    //     return new Promise((resolve, reject) => {
    //         this.collection.deleteMany({ roNo: { $in: ro } }).then((result) => {
    //             resolve(result);
    //         })
    //     });
    // }

    // insert(data) {
    //     return new Promise((resolve, reject) => {
    //         this.collection.insertMany(data).then((result) => {
    //             resolve(result);
    //         })
    //     });
    // }

    beforeLoad(dataTransform) {
        var dataArr = [];
        dataArr = dataTransform;

        return new Promise((resolve, reject) => {


            // var deleteProcess = [];
            var existingData=[]
            var tempProcess = [];
            var roNoArr = [];
            var dataTemp = [];
            var dataRo = [];

            for (var i of dataArr) {
                roNoArr.push(i[0].roNo);
                dataRo.push(i[0])
            }


            this.findData(roNoArr).then((result) => {
                dataTemp = result;

                if (dataTemp.length !=0) {
                    // for (var data of dataTemp) {
                        existingData = dataTemp;
                    //     var _id = data._id;
                    //     var i = {
                    //         _id: data._id,
                    //         roNo: data.roNo,
                    //         no:data.no,
                    //     }
                    //     tempProcess.push((i));

                        // deleteProcess.push((data.roNo))

                    // }

                    // this.delete(deleteProcess).then((deleted) => {
                    //     console.log(deleted.deletedCount)
                        resolve(existingData);
                    // })

                } else {
                    resolve([])
                }

            });

        });
    }

    load(dataTransform, existingData) {
        var dataArr = [];
        dataArr = dataTransform;

        return new Promise((resolve, reject) => {

            if(dataArr.length !=0){
                var falseData = 0;
                var failed = [];
                var processed = [];
                var deleteProcess = [];
                var tempProcess = [];
                var roNoArr = [];    
                var dataRo = [];
    
                for (var i of dataArr) {
                    roNoArr.push(i[0].roNo);
                    dataRo.push(i[0])
                }
    
                for (var data of dataRo) {
                    if (existingData.length != 0) {
                        var temp = existingData.find(o => o.roNo == data.roNo);
                        if (temp) {
                            // data._id = temp._id;
                            // data.no=temp.no;
                            var newItems=[];
                            newItems=temp.items;
                            for(var i of data.items){
                                var existingItemsTemp= temp.items.find(o=>o.refNo == i.refNo );
                                if(!existingItemsTemp){
                                    // console.log(i.itemCode);
                                    newItems.push(i)
                                }
                            }
                            data.no=temp.no;
                            data.items = newItems;
                        }
                    }
    
                    if (data.migrated == false) {
                        falseData += 1
                    } else if (!data.migrated) {
                        data.migrated = true;
                    }
                    else {
                        data.migrated = true;
                    }
    
                    processed.push(this.collection.updateOne({ "roNo": data.roNo }, { $set: data }, { upsert: true }));
                    
                    // processed.push((data));
                }
    
                // this.insert(processed).then((resultProcess) => {
                //     var dataProcessed = {};
                //     dataProcessed.processed = resultProcess.ops;
                //     dataProcessed.MigratedFalse = falseData;
                //     resolve(dataProcessed);
                // })

                Promise.all(processed).then((resultProcess)=>{
                    var dataProcessed = {};
                        dataProcessed.processed = resultProcess;
                        dataProcessed.MigratedFalse = falseData;
                        resolve(dataProcessed);

                })
            }else{
                var dataProcessed = {};
                dataProcessed.processed = [];
                resolve(dataProcessed);
            }


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
