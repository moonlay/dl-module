"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var generateCode = require("../../utils/code-generator");
var map = DLModels.map;
var Contact = DLModels.master.Contact;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");
var CompanyManager = require('./company-manager');

module.exports = class ContactManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Contact);
        this.companyManager = new CompanyManager(db, user);
    }

    _beforeInsert(data) {
        data.code = generateCode();
    
        return Promise.resolve(data);
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
            var codeFilter = {
                "code": {
                    "$regex": regex
                }
            };
            var nameFilter = {
                "name": {
                    "$regex": regex
                }
            };
            keywordFilter["$or"] = [codeFilter, nameFilter];
        }
        query["$and"] = [_default, keywordFilter, pagingFilter];
        return query;
    }

    _validate(contact) {
        var errors = {};
        var valid = contact;
        // 1. begin: Declare promises.
        var getContactPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code
        });

        var getCompany = valid.company && ObjectId.isValid(valid.company._id) ? this.companyManager.getSingleByIdOrDefault(valid.company._id) : Promise.resolve(null);

        // 2. begin: Validation.
        return Promise.all([getContactPromise, getCompany])
            .then(results => {
                var _duplicateContact = results[0];
                var _company = results[1];

                if (_duplicateContact) {
                    errors["code"] = i18n.__("Contact.code.isExists:%s is already exists", i18n.__("Contact.code._:Code")); //"Kode sudah ada";
                }

                if (!valid.firstName || valid.firstName == '')
                    errors["firstName"] = i18n.__("Contact.firstName.isRequired:%s is required", i18n.__("Contact.firstName._:First name")); //"Nama Depan harus diisi";
                
                if (!_company)
                    errors["company"] = i18n.__("Contact.company.notFound:%s not found", i18n.__("Contact.company._:Company")); //"Perusahaan tidak ditemukan";

                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }

                valid.companyId = new ObjectId(valid.company._id);
                
                if (!valid.stamp) {
                    valid = new Contact(valid);
                }
               
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Contact}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Contact}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
