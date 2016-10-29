const db = require('./db');

db.sequelize.sync({force: true}).then(function () {
	console.log("DB synced!");
});