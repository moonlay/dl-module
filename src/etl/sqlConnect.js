var sql = require("mssql");

var config = {
    server: "efrata.database.windows.net",
    database: "bateeq DWH",
    user: "Adminbateeq",
    password: "Standar123.",
    options: {
        encrypt: true
    },
    connectionTimeout: 120 * 60 * 1000,
    requestTimeout: 1000000

};

module.exports = {
    getConnect: function () {
        return new Promise((resolve, reject) => {
            sql.connect(config, function (err) {
                resolve(new sql.Request());
            })
        });
    }
}