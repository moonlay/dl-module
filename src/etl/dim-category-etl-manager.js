'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");
var sqlConnect = require('./sqlConnect');

// internal deps 
require('mongodb-toolkit');

var CategoryManager = require('../managers/master/category-manager');

module.exports = class DimCategoryEtlManager {
    constructor(db, user) {
        this.categoryManager = new CategoryManager(db, user);
    }
    run() {
        return this.extract()
            .then((data) => {
                return this.transform(data)
            })
            .then((data) => {
                return this.load(data)
            });
    }

    extract() {
        var timestamp = new Date(1970, 1, 1);
        return this.categoryManager.collection.find({
            _deleted: false
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {

            return {
                categoryCode: item.code,
                categoryName: item.name,
                categoryType: item.name.toLowerCase() == 'bahan baku' ? 'BAHAN BAKU' : 'NON BAHAN BAKU'
            };
        });
        return Promise.resolve([].concat.apply([], result));
    }

    load(data) {
        return sqlConnect.getConnect()
            .then((request) => {

                var sqlQuery = '';

                var count = 1;
                for (var item of data) {
                    sqlQuery = sqlQuery.concat("insert into DL_Dim_Kategori(ID_Dim_Kategori, Kode_Kategori, Nama_Kategori, Jenis_Kategori) values(" + count + ", '" + item.categoryCode + "', '" + item.categoryName + "', '" + item.categoryType + "'); ");

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
