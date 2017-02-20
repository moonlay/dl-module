"use strict"

var ObjectId = require("mongodb").ObjectId;
require("mongodb-toolkit");
var DLModels = require("dl-models");
var map = DLModels.map;
var Buyer = DLModels.master.Buyer;
var BaseManager = require("module-toolkit").BaseManager;
var i18n = require("dl-i18n");

module.exports = class BuyerManager extends BaseManager {
    constructor(db, user) {
        super(db, user);
        this.collection = this.db.use(map.master.collection.Buyer);
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

    _validate(buyer) {
        var errors = {};
        var valid = buyer;
        // 1. begin: Declare promises.
        var getBuyerPromise = this.collection.singleOrDefault({
            _id: {
                "$ne": new ObjectId(valid._id)
            },
            code: valid.code
        });
        // 2. begin: Validation.
        return Promise.all([getBuyerPromise])
            .then(results => {
                var _module = results[0];

                if (!valid.code || valid.code == "")
                    errors["code"] = i18n.__("Buyer.code.isRequired:%s is required", i18n.__("Buyer.code._:Code")); // "Kode harus diisi";
                else if (_module) {
                    errors["code"] = i18n.__("Buyer.code.isExists:%s is already exists", i18n.__("Buyer.code._:Code")); //"Kode sudah ada";
                }
                if (!valid.name || valid.name == '')
                    errors["name"] = i18n.__("Buyer.name.isRequired:%s is required", i18n.__("Buyer.name._:Name")); //"Nama Harus diisi";

                if (valid.tempo < 0)
                    errors["tempo"] = i18n.__("Buyer.tempo.isNumeric:%s must be 0 or more", i18n.__("Buyer.tempo._:Tempo")); //"Tempo harus lebih atau sama dengan 0";


                if (!valid.country || valid.country == "")
                    errors["country"] = i18n.__("Buyer.country.isRequired:%s is required", i18n.__("Buyer.country._:Country")); // "Silakan pilih salah satu negara";

                // 2c. begin: check if data has any error, reject if it has.
                if (Object.getOwnPropertyNames(errors).length > 0) {
                    var ValidationError = require("module-toolkit").ValidationError;
                    return Promise.reject(new ValidationError("data does not pass validation", errors));
                }
                if (!valid.tempo || valid.tempo == '')
                    valid.tempo = 0;

                valid = new Buyer(valid);
                valid.stamp(this.user.username, "manager");
                return Promise.resolve(valid);
            });
    }

    getBuyer() {
        return new Promise((resolve, reject) => {
            var query = {
                _deleted: false
            };

            this.collection
                .where(query)
                .execute()
                .then(buyers => {
                    resolve(buyers);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }

    insert(dataFile) {
        return new Promise((resolve, reject) => {
            var buyer;
            var countries = ["AFGHANISTAN", "ALBANIA", "ALGERIA", "ANDORRA", "ANGOLA", "ANGUILLA", "ANTIGUA AND BARBUDA", "ARGENTINA", "ARMENIA", "ARUBA", "AUSTRALIA", "AUSTRIA", "AZERBAIJAN", "BAHAMAS", "BAHRAIN", "BANGLADESH", "BARBADOS", "BELARUS", "BELGIUM", "BELIZE", "BENIN", "BERMUDA", "BHUTAN", "BOLIVIA", "BOSNIA AND HERZEGOVINA", "BOTSWANA", "BRAZIL", "BRITISH VIRGIN ISLANDS", "BRUNEI", "BULGARIA", "BURKINA FASO", "BURUNDI", "CAMBODIA", "CAMEROON", "CAPE VERDE", "CAYMAN ISLANDS", "CHAD", "CHILE", "CHINA", "COLOMBIA", "CONGO", "COOK ISLANDS", "COSTA RICA", "COTE D IVOIRE", "CROATIA", "CRUISE SHIP", "CUBA", "CYPRUS", "CZECH REPUBLIC", "DENMARK", "DJIBOUTI", "DOMINICA", "DOMINICAN REPUBLIC", "ECUADOR", "EGYPT", "EL SALVADOR", "EQUATORIAL GUINEA", "ESTONIA", "ETHIOPIA", "FALKLAND ISLANDS", "FAROE ISLANDS", "FIJI", "FINLAND", "FRANCE", "FRENCH POLYNESIA", "FRENCH WEST INDIES", "GABON", "GAMBIA", "GEORGIA", "GERMANY", "GHANA", "GIBRALTAR", "GREECE", "GREENLAND", "GRENADA", "GUAM", "GUATEMALA", "GUERNSEY", "GUINEA", "GUINEA BISSAU", "GUYANA", "HAITI", "HONDURAS", "HONG KONG", "HUNGARY", "ICELAND", "INDIA", "INDONESIA", "IRAN", "IRAQ", "IRELAND", "ISLE OF MAN", "ISRAEL", "ITALY", "JAMAICA", "JAPAN", "JERSEY", "JORDAN", "KAZAKHSTAN", "KENYA", "KUWAIT", "KYRGYZ REPUBLIC", "LAOS", "LATVIA", "LEBANON", "LESOTHO", "LIBERIA", "LIBYA", "LIECHTENSTEIN", "LITHUANIA", "LUXEMBOURG", "MACAU", "MACEDONIA", "MADAGASCAR", "MALAWI", "MALAYSIA", "MALDIVES", "MALI", "MALTA", "MAURITANIA", "MAURITIUS", "MEXICO", "MOLDOVA", "MONACO", "MONGOLIA", "MONTENEGRO", "MONTSERRAT", "MOROCCO", "MOZAMBIQUE", "NAMIBIA", "NEPAL", "NETHERLANDS", "NETHERLANDS ANTILLES", "NEW CALEDONIA", "NEW ZEALAND", "NICARAGUA", "NIGER", "NIGERIA", "NORWAY", "OMAN", "PAKISTAN", "PALESTINE", "PANAMA", "PAPUA NEW GUINEA", "PARAGUAY", "PERU", "PHILIPPINES", "POLAND", "PORTUGAL", "PUERTO RICO", "QATAR", "REUNION", "ROMANIA", "RUSSIA", "RWANDA", "SAINT PIERRE AND MIQUELON", "SAMOA", "SAN MARINO", "SATELLITE", "SAUDI ARABIA", "SENEGAL", "SERBIA", "SEYCHELLES", "SIERRA LEONE", "SINGAPORE", "SLOVAKIA", "SLOVENIA", "SOUTH AFRICA", "SOUTH KOREA", "SPAIN", "SRI LANKA", "ST KITTS AND NEVIS", "ST LUCIA", "ST VINCENT", "ST. LUCIA", "SUDAN", "SURINAME", "SWAZILAND", "SWEDEN", "SWITZERLAND", "SYRIA", "TAIWAN", "TAJIKISTAN", "TANZANIA", "THAILAND", "TIMOR L'ESTE", "TOGO", "TONGA", "TRINIDAD AND TOBAGO", "TUNISIA", "TURKEY", "TURKMENISTAN", "TURKS AND CAICOS", "UGANDA", "UKRAINE", "UNITED ARAB EMIRATES", "UNITED KINGDOM", "URUGUAY", "UZBEKISTAN", "VENEZUELA", "VIETNAM", "VIRGIN ISLANDS (US)", "YEMEN", "ZAMBIA", "ZIMBABWE"];
            this.getBuyer()
                .then(results => {
                    buyer = results.data;
                    var data = [];
                    if (dataFile != "") {
                        for (var i = 1; i < dataFile.length; i++) {
                            data.push({
                                "code": dataFile[i][0],
                                "name": dataFile[i][1],
                                "address": dataFile[i][2],
                                "city": dataFile[i][3],
                                "country": dataFile[i][4],
                                "NPWP": dataFile[i][5],
                                "type": dataFile[i][6],
                                "contact": dataFile[i][7],
                                "tempo": dataFile[i][8]
                            });
                        }
                    }
                    var dataError = [], errorMessage;
                    for (var i = 0; i < data.length; i++) {
                        errorMessage = "";
                        if (data[i]["code"] === "" || data[i]["code"] === undefined) {
                            errorMessage = errorMessage + "Kode tidak boleh kosong, ";
                        }
                        if (data[i]["name"] === "" || data[i]["name"] === undefined) {
                            errorMessage = errorMessage + "Nama tidak boleh kosong, ";
                        }
                        if (data[i]["type"] === "" || data[i]["type"] === undefined) {
                            errorMessage = errorMessage + "Jenis Buyer tidak boleh kosong, ";
                        } else {
                            if (data[i]["type"] !== "Lokal") {
                                if (data[i]["type"] !== "Ekspor") {
                                    if (data[i]["type"] !== "Internal") {
                                        errorMessage = errorMessage + "Jenis Buyer harus salah satu dari  Lokal, Ekspor, Internal ";
                                    }
                                }
                            }
                        }
                        if (data[i]["country"] === "" || data[i]["country"] === undefined) {
                            errorMessage = errorMessage + "Negara tidak boleh kosong, ";
                        } else {
                            if (countries.indexOf(data[i]["country"]) == -1) {
                                errorMessage = errorMessage + "Negara tidak terdaftar di list Negara,";
                            }
                        }
                        for (var j = 0; j < buyer.length; j++) {
                            if (buyer[j]["code"] === data[i]["code"]) {
                                errorMessage = errorMessage + "Kode tidak boleh duplikat";
                            }
                        }

                        if (errorMessage !== "") {
                            dataError.push({
                                "code": data[i]["code"],
                                "name": data[i]["name"],
                                "address": data[i]["address"],
                                "city": data[i]["city"],
                                "country": data[i]["country"],
                                "NPWP": data[i]["NPWP"],
                                "type": data[i]["type"],
                                "contact": data[i]["contact"],
                                "tempo": data[i]["tempo"],
                                "Error": errorMessage
                            });
                        }
                    }
                    if (dataError.length === 0) {
                        var newBuyer = [];
                        for (var i = 0; i < data.length; i++) {
                            var valid = new Buyer(data[i]);
                            valid.stamp(this.user.username, 'manager');
                            this.collection.insert(valid)
                                .then(id => {
                                    this.getSingleById(id)
                                        .then(resultItem => {
                                            newBuyer.push(resultItem)
                                            resolve(newBuyer);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        }

                    } else {
                        resolve(dataError);
                    }
                })
        })
    }

    _createIndexes() {
        var dateIndex = {
            name: `ix_${map.master.collection.Buyer}__updatedDate`,
            key: {
                _updatedDate: -1
            }
        };

        var codeIndex = {
            name: `ix_${map.master.collection.Buyer}_code`,
            key: {
                code: 1
            },
            unique: true
        };

        return this.collection.createIndexes([dateIndex, codeIndex]);
    }
}
