/**
 * Pirilä XML kuuntelija
 * Käyttö: Pirilälle parametri YHTEYSn=TCPx:serverip:serverportti
 * Copyright Heikki Virekunnas 2016
 **/
 
const net = require('net');
const parseXml = require('xml2js').parseString;
const db = require('./db');
const server = net.createServer();

const mutex = require('mutex');
const uuid = require('uuid');

const kisatunnus = "testi_kisa";
const kisanimi = "testi_kisa";
const kisapvm = "28.10.2016";

var dbmutex = mutex({
	id: uuid.v4(),
	strategy: {
		name: 'redis'
  	}
});

server.on('error', (err) => {
	console.log(`server error:\n${err.stack}`);
	server.close();
});

server.on('connection', handleConnection);

function handleConnection(conn) {	
	var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
	console.log('new client connection from %s', remoteAddress);
	
	conn.on('data', onConnData);
	conn.once('close', onConnClose);
	conn.on('error', onConnError);
	

	function onConnData(d) {
		console.log('connection data from %s: %j', remoteAddress, d);
		console.log(d);
		
		// 195,132 = Ä
		// 195,164 = ä
		// 195,182 = ö
		// 195,150 = Ö
		
		var xmlrec = "<root>"+d.toString('ascii')+"</root>";
		
		console.log(d.toString('ascii'));
		
		try {
			parseXml(xmlrec, function(err, result) {
				console.log(JSON.stringify(result));
				
				// {"root":{"ResultRecord":[{"Participant":[{"Name":[{"Family":["LC$tti"],"Given":["Erkki"]}],"Races":[{"Race":[{"$":{"RaceNo":"1"},"Bib":["701"],"ClassId":["H85"],"StartTime":["14:08:00"],"Result":["00:22:29"],"Rank":["1"],"Status":["OK"],"Intermediaries":[{"Intermediary":[{"$":{"Order":"1"},"Result":["00:00:00"],"Rank":["1"]}]}]}]}]}]},{"Participant":[{"Name":[{"Family":["LC$tti"],"Given":["Erkki"]}],"Races":[{"Race":[{"$":{"RaceNo":"1"},"Bib":["701"],"ClassId":["H85"],"StartTime":["14:08:00"],"Result":["00:22:29"],"Rank":["1"],"Status":["OK"],"Intermediaries":[{"Intermediary":[{"$":{"Order":"2"},"Result":["00:22:04"],"Rank":["1"]}]}]}]}]}]},{"Participant":[{"Name":[{"Family":["LC$tti"],"Given":["Erkki"]}],"Races":[{"Race":[{"$":{"RaceNo":"1"},"Bib":["701"],"ClassId":["H85"],"StartTime":["14:08:00"],"Result":["00:22:29"],"Rank":["1"],"Status":["OK"],"Intermediaries":[{"Intermediary":[{"$":{"Order":"3"},"Result":["00:00:00"],"Rank":["0"]}]}]}]}]}]}]}}
				
				dbmutex.lock('xmlimport', function(mutexerror, lock) {
					console.log("Mutex error: "+mutexerror);
			
					db.Kisa.findOrCreate({
						where: {
							tunnus: kisatunnus
						}
					}).then(function(kisa, luotu) {
						// TODO: transactions
						kisa.setDataValue('nimi', kisanimi);
						kisa.setDataValue('pvm', kisapvm);
						kisa.save().then(function(err) {
							if (err == db.Sequelize.ValidationError) {
								console.log("Error saving kisa: "+err);
							}
						});
				
						var len = result['root']['ResultRecord'].length;
				
						if (len == 0) {
							// no results?
							console.log("No results found: "+result);
						} else {
				
							for (let i = 0; i < len; i++) {
								var res = result['root']['ResultRecord'][i];
								for (let a = 0; a < res['Participant'].length; a++) {
									for (let b = 0; b < res['Participant'][a]['Races'].length; b++) {
										db.Sarja.findOrCreate({
											where: {
												sarja: res['Participant'][a]['Races'][b]['Race'][0]['ClassId'][0]
											}
										}).then(function(sarja, sarjaluotu) {
											if (sarjaluotu) {
												sarja.setDataValue('kisa', kisa.getDataValue('id'));
												sarja.save().then(function(err) {
													if (err == db.Sequelize.ValidationError) {
														console.log("Error saving sarja: "+err);
													}
												});
											}
											// hae kilpailija tai lisää, lisää/päivitä tulos, lisää vapiste...
											console.log(kisa);
											console.log(res);
											db.Kilpailija.findOrCreate({
												where: {
													nro: res['Participant'][a]['Races'][b]['Race'][0]['Bib'][0],
													kisa: kisa.getDataValue('id'),
													etunimi: res['Participant'][a]['Name'][0]['Given'][0],
													sukunimi: res['Participant'][a]['Name'][0]['Family'][0]
												}
											}).then(function(kilpailija, kilpailijaluotu) {
												kilpailija.setDataValue('sarja', sarja.getDataValue('id'));
												kilpailija.setDataValue('lahtoaika', res['Participant'][a]['Races'][b]['Race'][0]['StartTime'][0]);
												kilpailija.setDataValue('status', res['Participant'][a]['Races'][b]['Race'][0]['Status'][0]);
												kilpailija.save().then(function(err) {
													if (err == db.Sequelize.ValidationError) {
														console.log("Error saving kilpailija: "+err);
													}
												});
										
												db.VAPiste.findOrCreate({
													where: {
														jarjestys: 0,
														sarja: sarja.getDataValue('id')
													}
												}).then(function(maalipiste, maalipisteluotu) {
													if (maalipisteluotu) {
														// TODO: hae pisteiden etäisyydet muusta tiedosta
														maalipiste.setDataValue('matka', maalipiste.getDataValue('jarjestys'));
														maalipiste.save().then(function(err) {
															if (err == db.Sequelize.ValidationError) {
																console.log("Error saving maalipiste: "+err);
															}
														});
													}
											
													// parsi tulos
													db.Tulos.findOrCreate({
														where: {
															kilpailija: kilpailija.getDataValue('id'),
															vapiste: maalipiste.getDataValue('id')
														}
													}).then(function(maalitulos, maalitulosluotu) {
														maalitulos.setDataValue('aika', res['Participant'][a]['Races'][b]['Race'][0]['Result'][0]);
														maalitulos.setDataValue('sija', res['Participant'][a]['Races'][b]['Race'][0]['Rank'][0]);
														maalitulos.save().then(function(err) {
															if (err == db.Sequelize.ValidationError) {
																console.log("Error saving maalitulos: "+err);
															}
														});
													});
											
												});
										
												if (typeof res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'] != undefined) {
										
													// vapisteet
													for (var c = 0; c < res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'].length; c++) {
														db.VAPiste.findOrCreate({
															where: {
																sarja: sarja.getDataValue('id'),
																jarjestys: res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'][c]['Intermediary'][0]['$']['Order']
															}
														}).then(function(vapiste, vapisteluotu) {
															if (vapisteluotu) {
																// TODO: hae pisteiden etäisyydet muusta tiedosta
																vapiste.setDataValue('matka', vapiste.getDataValue('jarjestys'));
																vapiste.save().then(function(err) {
																	if (err == db.Sequelize.ValidationError) {
																		console.log("Error saving vapiste: "+err);
																	}
																});
															}
												
															db.Tulos.findOrCreate({
																where: {
																	kilpailija: kilpailija.getDataValue('id'),
																	vapiste: vapiste.getDataValue('id')
																}
															}).then(function(tulos, tulosluotu) {
																tulos.setDataValue('aika', res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'][c]['Intermediary'][0]['Result'][0]);
																tulos.setDataValue('sija', res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'][c]['Intermediary'][0]['Rank'][0]);
													
																tulos.save().then(function(err) {
																	if (err == db.Sequelize.ValidationError) {
																		console.log("Error saving tulos: "+err);
																	}
																});
															});								
														});
													}
												}
											});
										});
									}
								}
							}
						}
					});
					dbmutex.unlock(lock, function(err){
						console.log("Mutex error: "+err);
					});
				});
			});
		} catch (err) {
			console.log(err);
		}

		//conn.write(d);
	}

	function onConnClose() {
		console.log('connection from %s closed', remoteAddress);
	}

	function onConnError(err) {
		console.log('Connection %s error: %s', remoteAddress, err.message);
	}
}

server.on('listening', () => {
	var address = server.address();
	console.log(`server listening ${address.address}:${address.port}`);
});

server.listen(17901, '127.0.0.1');
