'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");
var startedDate = new Date();

// internal deps 
require('mongodb-toolkit');

var SupplierManager = require('../managers/master/supplier-manager');

module.exports = class DimSupplierEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.supplierManager = new SupplierManager(db, user);
        this.migrationLog = this.db.collection("migration-log");

    }
    run() {
        this.migrationLog.insert({
            description: "Dim Supplier from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.getTimeStamp()
            .then((data) => this.extract(data))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then(() => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Dim Supplier from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: "Successful"
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            })
            .catch((err) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Dim Supplier from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: err
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            });
    }

    getTimeStamp() {
        return this.migrationLog.find({
            description: "Dim Supplier from MongoDB to Azure DWH",
            status: "Successful"
        }).sort({
            finishedDate: -1
        }).limit(1).toArray()
    }

    extract(data) {
        var timestamp = new Date(data[0].finish);
        return this.supplierManager.collection.find({
            _deleted: false,
            _createdBy: {
                "$nin": ["dev", "unit-test"],
            },
            _updatedDate: {
                "$gt": timestamp
            }
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {

            return {
                supplierCode: `'${item.code}'`,
                supplierName: `'${item.name.replace(/'/g, '"')}'`
            };
        });
        return Promise.resolve([].concat.apply([], result));
    }

    load(data) {
        return this.sql.getConnection()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {
                    sqlQuery = sqlQuery.concat(`insert into DL_Dim_Supplier(ID_Dim_Supplier, Kode_Supplier, Nama_Supplier) values(${count}, ${item.supplierCode}, ${item.supplierName}); `);

                    count = count + 1;
                }

                request.multiple = true;

                // var fs = require("fs");
                // var path = "C:\\Users\\leslie.aula\\Desktop\\tttt.txt";

                // fs.writeFile(path, sqlQuery, function (error) {
                //     if (error) {
                //         console.log("write error:  " + error.message);
                //     } else {
                //         console.log("Successful Write to " + path);
                //     }
                // });

                var deleteTempTable = (`DELETE FROM DL_Dim_Supplier_Temp; `);
                var storedProcedure = (`exec dl_upsert_dim_supplier; `);

                return request.query(sqlQuery + storedProcedure + deleteTempTable)
                    // return request.query('select count(*) from DimSupplier')
                    // return request.query('select top 1 * from DimSupplier')
                    .then((results) => {
                        console.log(results);
                        return Promise.resolve(results);
                    })
            })
            .catch((err) => {
                console.log(err);
                return Promise.reject(err);
            });
    }
}
