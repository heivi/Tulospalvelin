/**
* Pirilä XML kuuntelija
* Käyttö: Pirilälle parametri YHTEYSn=TCPx:serverip:serverportti
* Palvelimen tulee olla käynnissä ennen Pirilän käynnistystä?
* Copyright Heikki Virekunnas 2016
**/

const net = require('net');
const parseXml = require('xml2js').parseString;
const db = require('./db');
const server = net.createServer();

const debug = true;

const fs = require('fs');


//var mutex = require('mutex');
//var uuid = require('uuid');

/*const dataMtx = mutex({
	id: uuid.v4(),
	strategy: {
		name: 'redis',
		// optional, defaults to localhost
		connectionString: 'redis://127.0.0.1'
	}
});
*/

var timeout;
var dist = 200;

var splitfile = "";

var kisatunnus = "testi_kisa";
var kisanimi = "testi_kisa";
var kisapvm = "28.10.2016";

//console.log(process.argv.length);

if (process.argv.length >= 5) {
	kisatunnus = process.argv[2];
	kisanimi = process.argv[3];
	kisapvm = process.argv[4];
} else if (process.argv.length >= 3) {
	splitfile = process.argv[2];
	//console.log(splitfile);
}
if (process.argv.length >= 6) {
	splitfile = process.argv[5];
	//console.log(splitfile);
}

const endTag = Buffer.from([60,47,82,101,115,117,108,116,82,101,99,111,114,100,62,10]);
var splitDists = {};

server.on('error', (err) => {
	console.log(`server error:\n${err.stack}`);
	server.close();
});

if (splitfile != "") {
	// parse file to get split distances
	// H21A 0 5,5km
	// H21A 1 2,5 km
	// H21A 2 4,9km

	fs.readFile(splitfile, 'utf8', (err, data) => {
		//console.log(data);
		if (err) throw err;
		let lines = data.split(/\r?\n/);
		lines.forEach(function (el) {
			let arr = el.split(' ');
			if (arr.length > 2) {
				let result = arr.splice(0,2);
				result.push(arr.join(' '));
				if (typeof splitDists[result[0]] == 'undefined') {
					splitDists[result[0]] = {};
				}
				splitDists[result[0]][result[1]] = result[2];
			}
		});
	});

}

server.on('connection', handleConnection);

function handleConnection(conn) {
	var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
	console.log('new client connection from %s', remoteAddress);

	let dataIn = [];

	conn.on('data', onConnData);
	conn.once('close', onConnClose);
	conn.on('error', onConnError);
	conn.on('end', onConnEnd);

	function onConnData(d) {
		console.log("Data incoming: %s", remoteAddress);
		//console.log('connection data from %s: %j', remoteAddress, d);
		//console.log(d);

		//var datalock = dataMtx.lock('datalock', {maxWait: 1000*60*60}, function(err, lock) {
		//	if (err) {
		//		console.log("Mutex error!: "+err);
		//	} else {
				dataIn.push(d);
		//		dataMtx.unlock(lock);
		//	}
		//});

		clearTimeout(timeout);
		timeout = setTimeout(function() {
			//dataMtx.lock('datalock', function(err, lock) {
			//	if (err) {
				if (false) {
					console.log("Mutex error: "+err);
				} else if (dataIn[dataIn.length-1].slice(dataIn[dataIn.length-1].length-16).equals(endTag)) {
					console.log("Match");
					let data = Buffer.concat(dataIn);
					dataIn = [];
			//		dataMtx.unlock(lock);
					handleData(data);
				} else {
					console.log("No match: ");
					console.log(dataIn[dataIn.length-1].slice(dataIn[dataIn.length-1].length-16));
					console.log(endTag);
			//		dataMtx.unlock(lock);
				}
			//});
		}, dist);
	}

	function onConnEnd() {
		let data = Buffer.concat(dataIn);
		dataIn = [];
		handleData(data);
	}

	function handleData(d) {

		// 195,132 = Ä
		// 195,164 = ä
		// 195,182 = ö
		// 195,150 = Ö
		// 195,60? = ü
		// 195,? = Ü

		//console.log(d.toString());

		var xmlrec = "<root>"+d.toString('utf8')+"</root>";

		// search and replace


		fs.writeFile("input.xml", xmlrec, function(err) {
			if (err) throw err;
		});


		//console.log(d.toString('ascii'));
		console.log("xml length: "+xmlrec.length);

		try {
			parseXml(xmlrec, function(err, result) {
				if (err) {
					console.log("ERROR in parsing: "+err);
					throw new Error(err);
				}

				/*
				fs.writeFile("input.json", JSON.stringify(result), function(err) {
				if (err) throw err;
			});
			*/

			//console.log(JSON.stringify(result));

			// {"root":{"ResultRecord":[{"Participant":[{"Name":[{"Family":["LC$tti"],"Given":["Erkki"]}],"Races":[{"Race":[{"$":{"RaceNo":"1"},"Bib":["701"],"ClassId":["H85"],"StartTime":["14:08:00"],"Result":["00:22:29"],"Rank":["1"],"Status":["OK"],"Intermediaries":[{"Intermediary":[{"$":{"Order":"1"},"Result":["00:00:00"],"Rank":["1"]}]}]}]}]}]},{"Participant":[{"Name":[{"Family":["LC$tti"],"Given":["Erkki"]}],"Races":[{"Race":[{"$":{"RaceNo":"1"},"Bib":["701"],"ClassId":["H85"],"StartTime":["14:08:00"],"Result":["00:22:29"],"Rank":["1"],"Status":["OK"],"Intermediaries":[{"Intermediary":[{"$":{"Order":"2"},"Result":["00:22:04"],"Rank":["1"]}]}]}]}]}]},{"Participant":[{"Name":[{"Family":["LC$tti"],"Given":["Erkki"]}],"Races":[{"Race":[{"$":{"RaceNo":"1"},"Bib":["701"],"ClassId":["H85"],"StartTime":["14:08:00"],"Result":["00:22:29"],"Rank":["1"],"Status":["OK"],"Intermediaries":[{"Intermediary":[{"$":{"Order":"3"},"Result":["00:00:00"],"Rank":["0"]}]}]}]}]}]}]}}

			return db.sequelize.transaction(function (t) {

				return db.Kisa.findOrCreate({
					where: {
						tunnus: kisatunnus
					}
				}).then(function(kisajaluotu) {

					//console.log("Kisa 1");
					//console.log(kisajaluotu);

					let kisa = kisajaluotu[0];
					let luotu = kisajaluotu[1];

					kisa.set('nimi', kisanimi);
					kisa.set('pvm', kisapvm);
					if (!!kisa.changed() && ['nimi', 'pvm'].some(v=> kisa.changed().indexOf(v) >= 0)) {

						return kisa.save().then(function(err) {
							if (err == db.Sequelize.ValidationError) {
								console.log("Error saving kisa: "+err);
								return Promise.rejecet(err);
							}
							console.log("Kisa tallennettu");
							return Promise.resolve(kisa);
						});
					} else {
						console.log("Kisa ei muuttunut");
						return Promise.resolve(kisa);
					}

				});

			}).then(function(kisa) {
				// kisa commited

				let record = ((result || {})['root'] || {})['ResultRecord'];
				if (typeof record == 'undefined') {
					console.log('No ResultRecord!');
					return Promise.reject("No ResultRecord");
				} else {
					//console.log("Löytyy ResultRecord");
				}
				var len = result['root']['ResultRecord'].length;

				if (len == 0) {
					// no results?
					console.log("No results found: "+result);
					return Promise.reject("No results found");
				} else {
					for (let i = 0; i < len; i++) {
						let res = result['root']['ResultRecord'][i];
						for (let a = 0; a < res['Participant'].length; a++) {
							// HK kisa
							if (typeof (res['Participant'][a]['Races']) != 'undefined') {
								for (let b = 0; b < res['Participant'][a]['Races'].length; b++) {
									db.sequelize.transaction(function(t) {
										// TODO: how is errors handled, ValidationError
										return db.Sarja.findOrCreate({
											where: {
												kisa: kisa.get('id'),
												sarja: res['Participant'][a]['Races'][b]['Race'][0]['ClassId'][0]
											}
										}).then(function(sarjajaluotu) {
											//console.log("6");
											let sarja = sarjajaluotu[0];
											let sarjaluotu = sarjajaluotu[1];

											if (sarjaluotu) {
												sarja.set('kisa', kisa.get('id'));

												return sarja.save().then(function(err) {
													if (err == db.Sequelize.ValidationError) {
														console.log("Error saving sarja: "+err);
														return Promise.reject(err);
													}
													//console.log("Sarja päivitetty");
													return Promise.resolve(sarja);
												});
											} else {
												return Promise.resolve(sarja);
											}

										}).catch(function(err) {
											console.log(err);
										});

									}).then(function(sarja) {
										// sarja commited
										// hae kilpailija tai lisää, lisää/päivitä tulos, lisää vapiste...

										db.sequelize.transaction(function(t) {
											return db.Kilpailija.findOrCreate({
												where: {
													nro: res['Participant'][a]['Races'][b]['Race'][0]['Bib'][0],
													kisa: kisa.get('id')/*,
													etunimi: res['Participant'][a]['Name'][0]['Given'][0],
													sukunimi: res['Participant'][a]['Name'][0]['Family'][0]*/
												}
											}).then(function(kilpailijajaluotu) {
												let kilpailija = kilpailijajaluotu[0];
												let luotu = kilpailijajaluotu[1];

												kilpailija.set('sarja', sarja.get('id'));
												kilpailija.set('lahtoaika', res['Participant'][a]['Races'][b]['Race'][0]['StartTime'][0]);
												kilpailija.set('status', res['Participant'][a]['Races'][b]['Race'][0]['Status'][0]);
												kilpailija.set('etunimi', res['Participant'][a]['Name'][0]['Given'][0]);
												kilpailija.set('sukunimi', res['Participant'][a]['Name'][0]['Family'][0]);

												if (!!kilpailija.changed() && ['sarja', 'lahtoaika', 'status', 'etunimi', 'sukunimi'].some(v=> kilpailija.changed().indexOf(v) >= 0)) {

													return kilpailija.save().then(function(err) {
														if (err == db.Sequelize.ValidationError) {
															console.log("Error saving kilpailija: "+err);
															return Promise.reject(err);
														}
														//console.log("Kilpailija päivitetty");
														return Promise.resolve(kilpailija);
													});

												} else {
													return Promise.resolve(kilpailija);
												}
											}).catch(function(err) {
												console.log(err);
											});
										}).then(function(kilpailija) {
											// kilpailija commited

											db.sequelize.transaction(function(t) {

												return db.VAPiste.findOrCreate({
													where: {
														jarjestys: 0,
														sarja: sarja.get('id')
													}
												}).then(function(maalipistejaluotu) {

													let maalipiste = maalipistejaluotu[0];
													let maalipisteluotu = maalipistejaluotu[1];

													// hae pisteiden etäisyydet muusta tiedosta

													var splitDist = ((splitDists || {})[sarja.get('sarja')] || {})[0];
													if (typeof splitDist != 'undefined') {
														//console.log("*****SPLIT SET******");
														maalipiste.set('matka', splitDist.toString());
													} else {
														maalipiste.set('matka', maalipiste.get('jarjestys').toString());
													}

													if (!!maalipiste.changed() && ['matka'].some(v=> maalipiste.changed().indexOf(v) >= 0)) {
														return maalipiste.save().then(function(err) {
															if (err == db.Sequelize.ValidationError) {
																console.log("Error saving maalipiste: "+err);
																return Promise.reject(err);
															}
															//console.log("Maalipiste päivitetty");
															return Promise.resolve(maalipiste);
														});
													} else {
														return Promise.resolve(maalipiste);
													}

												}).catch(function(err) {
													console.log(err);
												});

											}).then(function(maalipiste) {
												// maalipiste commited

												let arrayOfPromises = [];

												// parsi tulos
												let maalitulosp = db.sequelize.transaction(function(t) {
													return db.Tulos.findOrCreate({
														where: {
															kilpailija: kilpailija.get('id'),
															vapiste: maalipiste.get('id')
														}
													}).then(function(maalitulosjaluotu) {
														let maalitulos = maalitulosjaluotu[0];
														let maalitulosluotu = maalitulosjaluotu[1];
														maalitulos.set('aika', res['Participant'][a]['Races'][b]['Race'][0]['Result'][0]);
														maalitulos.set('sija', parseInt(res['Participant'][a]['Races'][b]['Race'][0]['Rank'][0]));

														if (!!maalitulos.changed() && ['aika', 'sija'].some(v=> maalitulos.changed().indexOf(v) >= 0)) {
															//console.log(maalitulos.changed());
															return maalitulos.save().then(function(err) {
																if (err == db.Sequelize.ValidationError) {
																	console.log("Error saving maalitulos: "+err);
																	return Promise.reject(err);
																}
																//console.log("Tulos tallennettu!");
																return Promise.resolve(maalitulos);
															});
														} else {
															return Promise.resolve(maalitulos);
														}
													});
												});

												arrayOfPromises.push(maalitulosp);

												if (res['Participant'][a]['Races'][b]['Race'][0].hasOwnProperty("Intermediaries")) {

													// vapisteet
													for (let c = 0; c < res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'].length; c++) {
														if (res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'][c]['Intermediary'][0]['Result'][0] != "00:00:00") {
															let vapromise = db.sequelize.transaction(function(t) {
																return db.VAPiste.findOrCreate({
																	where: {
																		sarja: sarja.get('id'),
																		jarjestys: parseInt(res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'][c]['Intermediary'][0]['$']['Order'])
																	}
																}).then(function(vapistejaluotu) {
																	//console.log("VAPiste haettu/luotu!");
																	let vapiste = vapistejaluotu[0];
																	let vapisteluotu = vapistejaluotu[1];

																	// TODO: Is this right...?
																	return new Promise(function(resolve, reject) {
																		// hae pisteiden etäisyydet muusta tiedosta
																		var splitDist = ((splitDists || {})[sarja.get('sarja')] || {})[vapiste.get('jarjestys')];
																		if (typeof splitDist != 'undefined') {
																			//console.log("*****SPLIT SET******");
																			vapiste.set('matka', splitDist.toString());
																		} else {
																			vapiste.set('matka', vapiste.get('jarjestys').toString());
																		}

																		if (!!vapiste.changed() && ['matka'].some(v=> vapiste.changed().indexOf(v) >= 0)) {
																			//console.log(vapiste.changed());
																			return vapiste.save().then(function(err) {
																				if (err == db.Sequelize.ValidationError) {
																					console.log("Error saving vapiste: "+err);
																					reject(err);
																				}
																				//console.log("VAPiste päivitetty");
																				resolve(vapiste);

																			}).catch(function(err) {
																				console.log("Error saving vapiste2: "+err);
																			});
																		} else {
																			resolve(vapiste);
																		}

																	}).then(function(vapiste) {
																		return db.Tulos.findOrCreate({
																			where: {
																				kilpailija: kilpailija.get('id'),
																				vapiste: vapiste.get('id')
																			}
																		}).then(function(tulosjaluotu) {
																			let tulos = tulosjaluotu[0];
																			let tulosluotu = tulosjaluotu[1];
																			tulos.set('aika', res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'][c]['Intermediary'][0]['Result'][0]);
																			tulos.set('sija', parseInt(res['Participant'][a]['Races'][b]['Race'][0]['Intermediaries'][c]['Intermediary'][0]['Rank'][0]));
																			//console.log(tulos.changed());
																			if (!!tulos.changed() && ['aika', 'sija'].some(v=> tulos.changed().indexOf(v) >= 0)) {
																				//console.log("VATulos muuttunut!");
																				return tulos.save().then(function(err) {
																					if (err == db.Sequelize.ValidationError) {
																						console.log("Error saving vatulos: "+err);
																						return Promise.reject(err);
																					}
																					//console.log("VATulos päivitetty");
																				}).catch(function(err) {
																					console.log("VATulos epäonnistui!");
																					return Promise.reject(err);
																				});
																			} else {
																				return Promise.resolve(tulos);
																			}

																		}).catch(function(err) {
																			if (err == db.Sequelize.ValidationError) {
																				console.log("Error saving tulos?: "+err);
																			}
																		});
																	}).catch(function(err) {
																		console.log(err);
																	});
																}).catch(function(err) {
																	console.log(err);
																});
															});

															arrayOfPromises.push(vapromise);
														}
													}
												}

												return Promise.all(arrayOfPromises);


											}).catch(function(err) {
												console.log(err);
											});
										}).catch(function(err) {
											console.log(err);
										});
									}).catch(function(err) {
										console.log(err);
									});
								}
							} else if (typeof (res['Participant'][a]['Leg'] != 'undefined')) {
								// Viesti

								for (let b = 0; b < res['Participant'][a]['Leg'].length; b++) {
									db.sequelize.transaction(function(t) {
										// TODO: how is errors handled, ValidationError
										return db.Sarja.findOrCreate({
											where: {
												kisa: kisa.get('id'),
												sarja: res['Participant'][a]['ClassId'][0]
											}
										}).then(function(sarjajaluotu) {
											//console.log("v6");
											let sarja = sarjajaluotu[0];
											let sarjaluotu = sarjajaluotu[1];

											if (sarjaluotu) {
												sarja.set('kisa', kisa.get('id'));

												return sarja.save().then(function(err) {
													if (err == db.Sequelize.ValidationError) {
														console.log("Error saving sarja: "+err);
														return Promise.reject(err);
													}
													//console.log("Sarja päivitetty");
													return Promise.resolve(sarja);
												});
											} else {
												return Promise.resolve(sarja);
											}

										}).catch(function(err) {
											console.log(err);
										});

									}).then(function(sarja) {
										// sarja commited
										// hae kilpailija tai lisää, lisää/päivitä tulos, lisää vapiste...

										db.sequelize.transaction(function(t) {
											return db.Kilpailija.findOrCreate({
												where: {
													nro: res['Participant'][a]['Id'][0] + "0" + res['Participant'][a]['Leg'][b]['$']['LegNo'][0],
													kisa: kisa.get('id')/*,
													etunimi: res['Participant'][a]['Name'][0]['Given'][0],
													sukunimi: res['Participant'][a]['Name'][0]['Family'][0]*/
												}
											}).then(function(kilpailijajaluotu) {
												let kilpailija = kilpailijajaluotu[0];
												let luotu = kilpailijajaluotu[1];

												kilpailija.set('sarja', sarja.get('id'));
												//kilpailija.set('lahtoaika', res['Participant'][a]['Races'][b]['Race'][0]['StartTime'][0]);
												kilpailija.set('status', res['Participant'][a]['Leg'][b]['LegStatus'][0]);
												kilpailija.set('etunimi', res['Participant'][a]['Club'][0] + "-" + res['Participant'][a]['TeamNo'][0] + " - " + res['Participant'][a]['Leg'][b]['Name'][0]['Given'][0]);
												kilpailija.set('sukunimi', res['Participant'][a]['Leg'][b]['Name'][0]['Family'][0]);

												if (!!kilpailija.changed() && ['sarja', 'lahtoaika', 'status', 'etunimi', 'sukunimi'].some(v=> kilpailija.changed().indexOf(v) >= 0)) {

													return kilpailija.save().then(function(err) {
														if (err == db.Sequelize.ValidationError) {
															console.log("Error saving kilpailija: "+err);
															return Promise.reject(err);
														}
														//console.log("Kilpailija päivitetty");
														return Promise.resolve(kilpailija);
													});

												} else {
													return Promise.resolve(kilpailija);
												}
											}).catch(function(err) {
												console.log(err);
											});
										}).then(function(kilpailija) {
											// kilpailija commited

											db.sequelize.transaction(function(t) {

												return db.VAPiste.findOrCreate({
													where: {
														jarjestys: 0,
														sarja: sarja.get('id')
													}
												}).then(function(maalipistejaluotu) {

													let maalipiste = maalipistejaluotu[0];
													let maalipisteluotu = maalipistejaluotu[1];

													// hae pisteiden etäisyydet muusta tiedosta

													var splitDist = ((splitDists || {})[sarja.get('sarja')] || {})[0];
													if (typeof splitDist != 'undefined') {
														//console.log("*****SPLIT SET******");
														maalipiste.set('matka', splitDist.toString());
													} else {
														maalipiste.set('matka', maalipiste.get('jarjestys').toString());
													}

													if (!!maalipiste.changed() && ['matka'].some(v=> maalipiste.changed().indexOf(v) >= 0)) {
														return maalipiste.save().then(function(err) {
															if (err == db.Sequelize.ValidationError) {
																console.log("Error saving maalipiste: "+err);
																return Promise.reject(err);
															}
															//console.log("Maalipiste päivitetty");
															return Promise.resolve(maalipiste);
														});
													} else {
														return Promise.resolve(maalipiste);
													}

												}).catch(function(err) {
													console.log(err);
												});

											}).then(function(maalipiste) {
												// maalipiste commited

												let arrayOfPromises = [];

												if (typeof (res['Participant'][a]['Leg'][b]['LegResult']) != 'undefined') {
													// parsi tulos
													let maalitulosp = db.sequelize.transaction(function(t) {
														return db.Tulos.findOrCreate({
															where: {
																kilpailija: kilpailija.get('id'),
																vapiste: maalipiste.get('id')
															}
														}).then(function(maalitulosjaluotu) {
															let maalitulos = maalitulosjaluotu[0];
															let maalitulosluotu = maalitulosjaluotu[1];
															maalitulos.set('aika', res['Participant'][a]['Leg'][b]['Result'][0]);
															maalitulos.set('sija', parseInt(res['Participant'][a]['Leg'][b]['Rank'][0]));

															if (!!maalitulos.changed() && ['aika', 'sija'].some(v=> maalitulos.changed().indexOf(v) >= 0)) {
																//console.log(maalitulos.changed());
																return maalitulos.save().then(function(err) {
																	if (err == db.Sequelize.ValidationError) {
																		console.log("Error saving maalitulos: "+err);
																		return Promise.reject(err);
																	}
																	//console.log("Tulos tallennettu!");
																	return Promise.resolve(maalitulos);
																});
															} else {
																return Promise.resolve(maalitulos);
															}
														});
													});

													arrayOfPromises.push(maalitulosp);
												}

												if (res['Participant'][a]['Leg'][b].hasOwnProperty("Intermediaries")) {

													// vapisteet
													for (let c = 0; c < res['Participant'][a]['Leg'][b]['Intermediaries'].length; c++) {
														if (res['Participant'][a]['Leg'][b]['Intermediaries'][c]['Intermediary'][0]['Result'][0] != "00:00:00") {
															let vapromise = db.sequelize.transaction(function(t) {
																return db.VAPiste.findOrCreate({
																	where: {
																		sarja: sarja.get('id'),
																		jarjestys: parseInt(res['Participant'][a]['Leg'][b]['Intermediaries'][c]['Intermediary'][0]['$']['Order'])
																	}
																}).then(function(vapistejaluotu) {
																	//console.log("VAPiste haettu/luotu!");
																	let vapiste = vapistejaluotu[0];
																	let vapisteluotu = vapistejaluotu[1];

																	// TODO: Is this right...?
																	return new Promise(function(resolve, reject) {
																		// hae pisteiden etäisyydet muusta tiedosta
																		var splitDist = ((splitDists || {})[sarja.get('sarja')] || {})[vapiste.get('jarjestys')];
																		if (typeof splitDist != 'undefined') {
																			//console.log("*****SPLIT SET******");
																			vapiste.set('matka', splitDist.toString());
																		} else {
																			vapiste.set('matka', vapiste.get('jarjestys').toString());
																		}

																		if (!!vapiste.changed() && ['matka'].some(v=> vapiste.changed().indexOf(v) >= 0)) {
																			//console.log(vapiste.changed());
																			return vapiste.save().then(function(err) {
																				if (err == db.Sequelize.ValidationError) {
																					console.log("Error saving vapiste: "+err);
																					reject(err);
																				}
																				//console.log("VAPiste päivitetty");
																				resolve(vapiste);

																			}).catch(function(err) {
																				console.log("Error saving vapiste2: "+err);
																			});
																		} else {
																			resolve(vapiste);
																		}

																	}).then(function(vapiste) {
																		return db.Tulos.findOrCreate({
																			where: {
																				kilpailija: kilpailija.get('id'),
																				vapiste: vapiste.get('id')
																			}
																		}).then(function(tulosjaluotu) {
																			let tulos = tulosjaluotu[0];
																			let tulosluotu = tulosjaluotu[1];
																			tulos.set('aika', res['Participant'][a]['Leg'][b]['Intermediaries'][c]['Intermediary'][0]['Result'][0]);
																			tulos.set('sija', parseInt(res['Participant'][a]['Leg'][b]['Intermediaries'][c]['Intermediary'][0]['Rank'][0]));
																			//console.log(tulos.changed());
																			if (!!tulos.changed() && ['aika', 'sija'].some(v=> tulos.changed().indexOf(v) >= 0)) {
																				//console.log("VATulos muuttunut!");
																				return tulos.save().then(function(err) {
																					if (err == db.Sequelize.ValidationError) {
																						console.log("Error saving vatulos: "+err);
																						return Promise.reject(err);
																					}
																					//console.log("VATulos päivitetty");
																				}).catch(function(err) {
																					console.log("VATulos epäonnistui!");
																					return Promise.reject(err);
																				});
																			} else {
																				return Promise.resolve(tulos);
																			}

																		}).catch(function(err) {
																			if (err == db.Sequelize.ValidationError) {
																				console.log("Error saving tulos?: "+err);
																			}
																		});
																	}).catch(function(err) {
																		console.log(err);
																	});
																}).catch(function(err) {
																	console.log(err);
																});
															});

															arrayOfPromises.push(vapromise);
														}
													}
												}

												return Promise.all(arrayOfPromises);


											}).catch(function(err) {
												console.log(err);
											});
										}).catch(function(err) {
											console.log(err);
										});
									}).catch(function(err) {
										console.log(err);
									});
								}

							}
						}
					}
				}
			}).catch(function (err) {
				console.log(err);
			});
		});
	} catch (err) {
		console.log(err);
	}

	console.log("Sanoma käsitelty!");

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

server.listen(17901, '0.0.0.0');
