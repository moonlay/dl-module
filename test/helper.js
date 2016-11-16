function _getDb() {
    return new Promise((resolve, reject) => {
        var factory = require('mongo-factory');
        factory.getConnection(process.env.DB_CONNECTIONSTRING)
            .then(dbInstance => {
                resolve(dbInstance);
            }).catch(e => {
                reject(e);
            });
    });
}
module.exports = {
    getDb: _getDb,

    getManager: function(ManagerType) {
        return new Promise((resolve, reject) => {
            _getDb()
                .then(db => {
                    resolve(new ManagerType(db, {
                        username: 'dev'
                    }));
                })
                .catch(e => {
                    reject(e);
                })
        });
    }
}
