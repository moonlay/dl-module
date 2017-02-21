'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");

// internal deps 
require('mongodb-toolkit');

var CategoryManager = require('../managers/master/category-manager');

module.exports = class DimCategoryEtlManager extends BaseManager {
    constructor(db, user, sql) {
        super(db, user);
        this.sql = sql;
        this.categoryManager = new CategoryManager(db, user);
        this.migrationLog = this.db.collection("migration-log");
    }
    run() {
        var startedDate = new Date();
        this.migrationLog.insert({
            description: "Dim Category from MongoDB to Azure DWH",
            start: startedDate,
        })
        return this.getTimestamp()
            .then((timestamp) => this.extract(timestamp))
            .then((data) => this.transform(data))
            .then((data) => this.load(data))
            .then(() => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Dim Category from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: "success"
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            }).catch((err) => {
                var finishedDate = new Date();
                var spentTime = moment(finishedDate).diff(moment(startedDate), "minutes");
                var updateLog = {
                    description: "Dim Category from MongoDB to Azure DWH",
                    start: startedDate,
                    finish: finishedDate,
                    executionTime: spentTime + " minutes",
                    status: err
                };
                this.migrationLog.updateOne({ start: startedDate }, updateLog);
            })
    }

    getTimestamp() {
        return this.migrationLog.find({
            status: "success",
            description: "Dim Category from MongoDB to Azure DWH"
        }).sort({ finish: -1 }).limit(1).toArray();
    }

    extract(timestamp) {
        var timestamps = new Date(timestamp[0].finish);
        return this.categoryManager.collection.find({
            _deleted: false
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {

            return {
                categoryCode: item.code ? `'${item.code}'` : null,
                categoryName: item.name ? `'${item.name}'` : null,
                categoryType: item.name ? `'${item.name.toLowerCase() == 'bahan baku' ? 'BAHAN BAKU' : 'NON BAHAN BAKU'}'` : null
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
                    sqlQuery = sqlQuery.concat(`insert into DL_Dim_Kategori(ID_Dim_Kategori, Kode_Kategori, Nama_Kategori, Jenis_Kategori) values(${count}, ${item.categoryCode}, ${item.categoryName}, ${item.categoryType}); `);

                    count = count + 1;
                }

                request.multiple = true;

                return request.query(sqlQuery)
                    // return request.query('select count(*) from DimKategori')
                    // return request.query('select top 1 * from DimKategori')
                    .then((results) => {
                        console.log(results);
                        return Promise.resolve();
                    })
            })
            .catch((err) => {
                console.log(err);
                return Promise.reject(err);
            });
    }
}
