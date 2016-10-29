const db = require('./db');

db.sequelize.sync().then(function () {
	console.log("DB synced!");
});