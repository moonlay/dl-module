module.exports = {
    getDb: function() {
        return new Promise((resolve, reject) => {
            var factory = require('mongo-factory');
            factory.getConnection(process.env.DB_CONNECTIONSTRING)
                .then(dbInstance => {
                    resolve(dbInstance);
                })
                .catch(e => {
                    reject(e);
                });
        });
    }
}