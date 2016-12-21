var sql = require("mssql");

var config = {
    server: "danliris-uat.database.windows.net",
    database: "danliris-dwh-uat",
    user: "danliris-admin",
    password: "Standar123",
    port: "1433",
    options: {
        encrypt: true
    }

};

module.exports= {
    getConnect: function() {
        return new Promise((resolve, reject) => {
            sql.connect(config, function (err) {
                resolve( new sql.Request());
            })
        });
    } 
}