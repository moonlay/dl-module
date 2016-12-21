'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");
var sqlConnect = require('./sqlConnect');

// internal deps 
require('mongodb-toolkit');

var SupplierManager = require('../managers/master/supplier-manager');

module.exports = class DimSupplierEtlManager {
    constructor(db, user) {
        this.supplierManager = new SupplierManager(db, user);
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
        return this.supplierManager.collection.find({
            _deleted: false
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {

            return {
                supplierCode: item.code,
                supplierName: item.name
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
                    sqlQuery = sqlQuery.concat("insert into DimSupplier([ID Dim Supplier], [Kode Supplier] ,[Nama Supplier]) values(" + count + ", '" + item.supplierCode + "', '" + item.supplierName + "'); ");

                    count = count + 1;
                }

                request.multiple = true;

                return request.query(sqlQuery)
                // return request.query('select count(*) from DimSupplier')
                // return request.query('select top 1 * from DimSupplier')
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
