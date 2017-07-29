const db = require('./db');

/*db.sequelize.sync({force: true}).then(function () {
	console.log("DB synced!");
});
*/
db.sequelize.sync({alter: true}).then(function () {
	console.log("DB alteredd!");
});
