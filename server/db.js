const cls = require('continuation-local-storage');
const clsns = cls.createNamespace('pirilatp');

var Sequelize = require('sequelize');

Sequelize.cls = clsns;

const sequelize = new Sequelize('tpdb', 'tpuser', 'tpsala', {
	host: 'localhost',
	isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE,
	dialect: 'postgres',
//	storage: './database.sqlite',
	logging: false,
	pool: false,
	retry: {
		max: 999
	}
});

const Kisa = sequelize.define('kisa', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	tunnus: { type: Sequelize.TEXT, unique: true },
	nimi: { type: Sequelize.TEXT },
	pvm: { type: Sequelize.DATEONLY }
});

const Sarja = sequelize.define('sarja', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	sarja: { type: Sequelize.TEXT, unique: 'kisajasarja' },
	kisa: {
		unique: 'kisajasarja',
		type: Sequelize.INTEGER,
		references: {
			model: Kisa,
			key: 'id'
		}
	}
});

// väliajat ja maali
const VAPiste = sequelize.define('vapiste', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	jarjestys: { type: Sequelize.INTEGER },
	matka: { type: Sequelize.TEXT },
	sarja: {
		type: Sequelize.INTEGER,
		references: {
			model: Sarja,
			key: 'id'
		}
	}
});

const Kilpailija = sequelize.define('kilpailija', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	etunimi: { type: Sequelize.TEXT },
	sukunimi: { type: Sequelize.TEXT },
	sarja: {
		type: Sequelize.INTEGER,
		references: {
			model: Sarja,
			key: 'id'
		}
	},
	nro: { type: Sequelize.INTEGER },
	lahtoaika: { type: Sequelize.TEXT },
	status: { type: Sequelize.TEXT},
	kisa: {
		type: Sequelize.INTEGER,
		referneces: {
			model: Kisa,
			key: 'id'
		}
	}
});

const Tulos = sequelize.define('tulos', {
	id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
	aika: { type: Sequelize.TEXT },
	sija: { type: Sequelize.INTEGER },
	kilpailija: {
		type: Sequelize.INTEGER,
		references: {
			model: Kilpailija,
			key: 'id'
		}
	},
	vapiste: {
		type: Sequelize.INTEGER,
		references: {
			model: VAPiste,
			key: 'id'
		}
	}

});

module.exports = {
	Sequelize,
	sequelize,
	Kisa,
	VAPiste,
	Sarja,
	Kilpailija,
	Tulos,
	clsns
}
