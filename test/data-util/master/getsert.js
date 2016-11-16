var helper = require('../../helper');
var user = {
    username: 'dev'
};


module.exports = function(data, Manager, filterCallback) {
    return new Promise((resolve, reject) => {
        helper.getDb()
            .then(db => {
                var manager = new Manager(db, user);
                manager
                    .getSingleByQueryOrDefault(filterCallback(data))
                    .then(doc => {
                        if (doc)
                            resolve(doc);
                        else {
                            manager.create(data)
                                .then(id => {
                                    manager.getSingleById(id)
                                        .then(doc => {
                                            resolve(doc);
                                        })
                                        .catch(e => {
                                            reject(e);
                                        });
                                })
                                .catch(e => {
                                    reject(e);
                                });
                        }
                    })
                    .catch(e => {
                        reject(e);
                    });
            })
            .catch(e => {
                reject(e);
            });
    });
};
