'use strict'

// external deps 
var ObjectId = require("mongodb").ObjectId;
var BaseManager = require('module-toolkit').BaseManager;
var moment = require("moment");
var sqlConnect = require('./sqlConnect');

// internal deps 
require('mongodb-toolkit');

var DivisionManager = require('../managers/master/division-manager');

module.exports = class DimDivisionEtlManager {
    constructor(db, user) {
        this.divisionManager = new DivisionManager(db, user);
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
        return this.divisionManager.collection.find({
            _deleted: false
        }).toArray();
    }

    transform(data) {
        var result = data.map((item) => {

            return {
                divisionCode: item.code,
                divisionName: item.name
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
                    sqlQuery = sqlQuery.concat("insert into dimdivisi(id_dim_divisi, kode_divisi, nama_divisi) values(" + count + ", '" + item.divisionCode + "', '" + item.divisionName + "'); ");

                    count = count + 1;
                }

                request.multiple = true;

                return request.query(sqlQuery)
                // return request.query('select count(*) from dimdivisi')
                // return request.query('select top 1 * from dimdivisi')
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
