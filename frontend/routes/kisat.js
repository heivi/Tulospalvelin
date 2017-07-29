var express = require('express');
var router = express.Router();
var db = require('../../server/db.js');
var slashes = require('connect-slashes');

/* GET kisa listing. */
router.use(slashes());
router.get('/', function(req, res, next) {
  db.Kisa.findAll().then(function (kisaArray) {
    let kisat = [];
    kisaArray.forEach(function(kisa) {
      let kisaO = {
        nimi: kisa.get('nimi'),
        pvm: kisa.get('pvm'),
        tunnus: kisa.get('tunnus')
      };
      let pvm = new Date(kisaO.pvm);
      kisaO.pvm = pvm.getDate()+"."+(pvm.getMonth()+1)+"."+pvm.getFullYear();
      kisat.push(kisaO);
    });
    kisat.sort(function(a,b) {
      aa = a['pvm'].split('.');
      bb = b['pvm'].split('.');
      if (parseInt(aa[2],10) > parseInt(bb[2],10)) {
        return -1;
      } else if (parseInt(aa[2],10) == parseInt(bb[2],10)) {
        if (parseInt(aa[1],10) > parseInt(bb[1],10)) {
          return -1;
        } else if (parseInt(aa[1],10) == parseInt(bb[1],10)) {
          if (parseInt(aa[0],10) > parseInt(bb[0],10)) {
            return -1;
          } else if (parseInt(aa[0],10) == parseInt(bb[0],10)) {
            return 0;
          } else {
            return 1;
          }
        } else {
          return 1;
        }
      } else {
        return 1;
      }
    });
    res.render('kisat/index', { kisat: kisat, title: "Races" });
  }).catch(function(err) {
    res.status(404).render('error', {message: "Races not found", error: err});
  });
});

router.get('/:kisaTunnus/', function(req, res, next) {
  db.Kisa.findOne({
    where: {
      tunnus: req.params['kisaTunnus']
    }
  }).then(function(kisa) {
    //console.log(kisa);

    if (!kisa.get('viesti')) {

      return db.Sarja.findAll({
        where: {
          kisa: kisa.get('id')
        }
      }).then(function(sarjat) {
        let taulukkoDatat = [];
        let promises = [];
        let maxVAt = 0;
        sarjat.forEach(function (sarja) {
          let sarjaDatat = {};
          sarjaDatat['sarja'] = sarja.get('sarja');
          let sarjanVApisteet = [];
          let sarjapromise = db.VAPiste.findAll({
            where: {
              sarja: sarja.get('id')
            }
          }).then(function(vapisteet) {
            //console.log(vapisteet);
            vapisteet.forEach(function(vapiste) {
              let vapistedata = {};
              vapistedata['nro'] = vapiste.get('jarjestys');
              vapistedata['matka'] = vapiste.get('matka');
              //console.log(vapistedata);
              sarjanVApisteet.push(vapistedata);
            });

            sarjanVApisteet.sort(function(a,b) {
              return a['nro']-b['nro'];
            });

            //console.log(sarjanVApisteet);
            if (sarjanVApisteet.length > maxVAt) {
              maxVAt = sarjanVApisteet.length;
            }
            sarjaDatat['vapisteet'] = sarjanVApisteet;
            taulukkoDatat.push(sarjaDatat);
          });

          promises.push(sarjapromise);
        });

        Promise.all(promises).then(function() {
          //console.log(taulukkoDatat);

          taulukkoDatat.forEach(function(el) {
            while (el['vapisteet'].length < maxVAt) {
              el['vapisteet'].push({});
            }
          });

          res.render('kisat/kisa', { taulukkoDatat: taulukkoDatat, title: kisa.get('nimi')});

        }).catch(function(err) {
          res.status(404).render('error', {message: "Intermediaries not found", error: err});
        });


      }).catch(function(err) {
        res.status(404).render('error', {message: "Class not found", error: err});
      });
    } else {
      // Viesti

      return db.Sarja.findAll({
        where: {
          kisa: kisa.get('id')
        }
      }).then(function(sarjat) {
        let taulukkoDatat = [];
        let promises = [];
        let maxVAt = 0;
        sarjat.forEach(function (sarja) {
          let sarjaDatat = {};
          sarjaDatat['sarja'] = sarja.get('sarja');
          sarjaDatat['osuudet'] = sarja.get('osuudet');
          let sarjanVApisteet = [];
          let sarjapromise = db.VAPiste.findAll({
            where: {
              sarja: sarja.get('id')
            }
          }).then(function(vapisteet) {
            //console.log(vapisteet);
            vapisteet.forEach(function(vapiste) {
              if (typeof (sarjanVApisteet[vapiste.get('osuus')-1]) == 'undefined') {
                sarjanVApisteet[vapiste.get('osuus')-1] = [];
              }
              let vapistedata = {};
              vapistedata['nro'] = vapiste.get('jarjestys');
              vapistedata['matka'] = vapiste.get('matka');
              //console.log(vapistedata);
              sarjanVApisteet[vapiste.get('osuus')-1].push(vapistedata);
            });

            sarjanVApisteet.forEach(function(osuudenVApisteet, osuus) {
              //console.log(osuus);
              //console.log(sarjanVApisteet[osuus]);
              sarjanVApisteet[osuus].sort(function(a,b) {
                return a['nro']-b['nro'];
              });
              if (sarjanVApisteet[osuus].length > maxVAt) {
                maxVAt = sarjanVApisteet[osuus].length;
              }
            });

            //console.log(sarjanVApisteet);

            sarjaDatat['vapisteet'] = sarjanVApisteet;
            taulukkoDatat.push(sarjaDatat);
          });

          promises.push(sarjapromise);
        });

        Promise.all(promises).then(function() {
          //console.log(taulukkoDatat);

          taulukkoDatat.forEach(function(el) {
            el['vapisteet'].forEach(function(val, osuus) {
              while (el['vapisteet'][osuus].length < maxVAt) {
                el['vapisteet'][osuus].push({});
              }
            });
          });

          res.render('kisat/viestikisa', { taulukkoDatat: taulukkoDatat, title: kisa.get('nimi') });

        }).catch(function(err) {
          res.status(404).render('error', {message: "Intermediaries not found", error: err});
        });


      }).catch(function(err) {
        res.status(404).render('error', {message: "Class not found", error: err});
      });


    }
  }).catch(function(err) {
    res.status(404).render('error', {message: "Race not found", error: err});
  });

  //res.send('Kisa: '+req.params['kisaTunnus']);
});

router.get('/:kisaTunnus/:sarja/:osuus/:vapiste', function(req, res, next) {
  db.Kisa.findOne({
    where: {
      tunnus: req.params['kisaTunnus']
    }
  }).then(function(kisa) {
    db.Sarja.findOne({
      where: {
        kisa: kisa.get('id'),
        sarja: req.params['sarja']
      }
    }).then(function(sarja) {

      /*if (req.params['vapiste'] == "start") {
        db.Kilpailija.findAll({
          where: {
            sarja: sarja.get('id')
          }
        }).then(function(kilpailijat) {
          let lahtoajat = [];
          kilpailijat.forEach(function(kilpailija) {
            let kilpailijantulos = {};

            kilpailijantulos['nimi'] = kilpailija.get('etunimi')+' '+kilpailija.get('sukunimi');
            kilpailijantulos['nro'] = kilpailija.get('nro');
            kilpailijantulos['lahtoaika'] = kilpailija.get('lahtoaika');

            lahtoajat.push(kilpailijantulos);
          });

          lahtoajat.sort(function (a, b) {
            if (a['nro'] != 0 && b['nro'] != 0) {
              return a['nro']-b['nro'];
            } else if (b['nro'] == 0 && a['nro'] == 0) {
              return 0;
            } else if (a['nro'] == 0) {
              return 1;
            } else if (b['nro'] == 0) {
              return -1;
            } else {
              return 1;
            }
          });

          res.render('kisat/lahtoajat', {lahtoajat: lahtoajat, title: "Start times", sarja: sarja.get('sarja')});
        }).catch(function(err) {
          res.status(404).render('error', {message: "No competitors found", error: err});
        });
      } else */{

        let kilpailijapromise = db.Kilpailija.findAll({
          where: {
            sarja: sarja.get('id')
          }
        });

        let vapistepromise = db.VAPiste.findOne({
          where: {
            sarja: sarja.get('id'),
            jarjestys: parseInt(req.params['vapiste']),
            osuus: parseInt(req.params['osuus'])+1
          }
        });

        Promise.all([kilpailijapromise, vapistepromise]).then(function(ret) {
          let kilpailijat = ret[0];
          let vapiste = ret[1];
          let tulokset = [];
          let vapisteO = {
            jarjestys: vapiste.get('jarjestys'),
            matka: vapiste.get('matka'),
            osuus: vapiste.get('osuus')
          };
          let tulospromises = [];
          kilpailijat.forEach(function(kilpailija) {
            let kilpailijantulos = {};
            let tulospromise = db.Tulos.findOne({
              where: {
                kilpailija: kilpailija.get('id'),
                vapiste: vapiste.get('id')
              }
            }).then(function(tulos) {
              kilpailijantulos['nimi'] = kilpailija.get('etunimi')+' '+kilpailija.get('sukunimi');
              kilpailijantulos['status'] = kilpailija.get('status');
              kilpailijantulos['nro'] = kilpailija.get('nro');
              //kilpailijantulos['lahtoaika'] = kilpailija.get('lahtoaika');
              kilpailijantulos['aika'] = tulos.get('aika');
              kilpailijantulos['aikasec'] = aikaToSec(tulos.get('aika'));
              kilpailijantulos['joukkue'] = kilpailija.get('joukkue');
              kilpailijantulos['jnro'] = kilpailija.get('jnro');
              //kilpailijantulos['sija'] = tulos.get('sija');
              //console.log(kilpailijantulos);
              if (vapiste.get('jarjestys') == 0 || (kilpailijantulos['aika'] != "00:00:00" && kilpailijantulos['aika'] != "00:00:00,0")) {
                tulokset.push(kilpailijantulos);
              }
            }).catch(function(err) {
              //console.log("No result for competitor: "+err);
            });
            tulospromises.push(tulospromise);
          });

          Promise.all(tulospromises).then(function(ret) {

            /*
            kisat.sort(function(a,b) {
              aa = a.split(' ');
              bb = b.split(' ');
              if (parseInt(aa[2],10) > parseInt(bb[2],10)) {
                return -1;
              } else if (parseInt(aa[2],10) == parseInt(bb[2],10)) {
                if (parseInt(aa[1],10) > parseInt(bb[1],10)) {
                  return -1;
                } else if (parseInt(aa[1],10) == parseInt(bb[1],10)) {
                  if (parseInt(aa[0],10) > parseInt(bb[0],10)) {
                    return -1;
                  } else if (parseInt(aa[0],10) == parseInt(bb[0],10)) {
                    return 0;
                  } else {
                    return 1;
                  }
                } else {
                  return 1;
                }
              } else {
                return 1;
              }
            });
            */

            tulokset.sort(function (a, b) {
              let astatus;
              let bstatus;
              if (vapiste.get('jarjestys') == 0) {
                astatus = a['status'].replace('Open', 'OK');
                bstatus = b['status'].replace('Open', 'OK');
              } else {
                astatus = a['status'].replace('Open', 'OK').replace('DNF', 'OK').replace('DQ', 'OK');
                bstatus = b['status'].replace('Open', 'OK').replace('DNF', 'OK').replace('DQ', 'OK');
              }
              let aa = a['aika'].split(':');
              let bb = b['aika'].split(':');
              let ah = parseInt(aa[0],10);
              let bh = parseInt(bb[0],10);
              let amin = parseInt(aa[1],10);
              let bmin = parseInt(bb[1],10);
              let as = parseFloat(aa[2].replace(',', '.'));
              let bs = parseFloat(bb[2].replace(',', '.'));

              if (astatus == "OK" && bstatus == "OK") {
                if (ah < bh) {
                  return -1;
                } else if (ah > bh) {
                  return 1;
                } else {
                  if (amin < bmin) {
                    return -1;
                  } else if (amin > bmin) {
                    return 1;
                  } else {
                    if (as < bs) {
                      return -1;
                    } else if (as > bs) {
                      return 1;
                    } else {
                      return 0;
                    }
                  }
                }
              } else if (astatus == "OK") {
                return -1;
              } else if (bstatus == "OK") {
                return 1;
              } else {
                if (astatus == bstatus) {
                  return 0;
                } else if (astatus == "DQ") {
                  return -1;
                } else if (bstatus == "DQ") {
                  return 1;
                } else if (astatus == "DNF") {
                  return -1;
                } else if (bstatus == "DNF") {
                  return 1;
                } else if (astatus == "Vacant") {
                  return 1;
                } else if (bstatus == "Vacant") {
                  return -1;
                } else {
                  return 0;
                }
              }
            });

            let sija = 1;
            tulokset.forEach(function(el, ind) {
              if (el['status'] == "OK" || el['status'] == "Open") {
                tulokset[ind]['sija'] = sija++;
              } else {
                tulokset[ind]['sija'] = 0;
              }

              tulokset[ind]['aikadiff'] = secToDiff(tulokset[ind]['aikasec']-tulokset[0]['aikasec']);
            });

            //console.log(tulokset);

            res.render('kisat/viestivapiste', {tulokset: tulokset, sarja: sarja.get('sarja'),vapiste: vapisteO, valiaika: req.params['vapiste'] != 0});
          }).catch(function(err) {
            res.status(404).render('error', {message: "Results not found", error: err});
          });



        }).catch(function(err) {
          res.status(404).render('error', {message: "Competitor or intermediary not found", error: err});
        });
      }
    }).catch(function(err) {
      res.status(404).render('error', {message: "Class not found", error: err});
    });
  }).catch(function(err) {
    res.status(404).render('error', {message: "Race not found", error: err});
  });
});

router.get('/:kisaTunnus/:sarja/:vapiste', function(req, res, next) {
  db.Kisa.findOne({
    where: {
      tunnus: req.params['kisaTunnus']
    }
  }).then(function(kisa) {
    db.Sarja.findOne({
      where: {
        kisa: kisa.get('id'),
        sarja: req.params['sarja']
      }
    }).then(function(sarja) {

      if (req.params['vapiste'] == "start") {
        db.Kilpailija.findAll({
          where: {
            sarja: sarja.get('id')
          }
        }).then(function(kilpailijat) {
          let lahtoajat = [];
          kilpailijat.forEach(function(kilpailija) {
            let kilpailijantulos = {};

            kilpailijantulos['nimi'] = kilpailija.get('etunimi')+' '+kilpailija.get('sukunimi');
            kilpailijantulos['nro'] = kilpailija.get('nro');
            kilpailijantulos['lahtoaika'] = kilpailija.get('lahtoaika');

            lahtoajat.push(kilpailijantulos);
          });

          lahtoajat.sort(function (a, b) {
            if (a['nro'] != 0 && b['nro'] != 0) {
              return a['nro']-b['nro'];
            } else if (b['nro'] == 0 && a['nro'] == 0) {
              return 0;
            } else if (a['nro'] == 0) {
              return 1;
            } else if (b['nro'] == 0) {
              return -1;
            } else {
              return 1;
            }
          });

          res.render('kisat/lahtoajat', {lahtoajat: lahtoajat, title: "Start times", sarja: sarja.get('sarja')});
        }).catch(function(err) {
          res.status(404).render('error', {message: "No competitors found", error: err});
        });
      } else {

        let kilpailijapromise = db.Kilpailija.findAll({
          where: {
            sarja: sarja.get('id')
          }
        });

        let vapistepromise = db.VAPiste.findOne({
          where: {
            sarja: sarja.get('id'),
            jarjestys: parseInt(req.params['vapiste'])
          }
        });

        Promise.all([kilpailijapromise, vapistepromise]).then(function(ret) {
          let kilpailijat = ret[0];
          let vapiste = ret[1];
          let tulokset = [];
          let vapisteO = {
            jarjestys: vapiste.get('jarjestys'),
            matka: vapiste.get('matka')
          };
          let tulospromises = [];
          kilpailijat.forEach(function(kilpailija) {
            let kilpailijantulos = {};
            let tulospromise = db.Tulos.findOne({
              where: {
                kilpailija: kilpailija.get('id'),
                vapiste: vapiste.get('id')
              }
            }).then(function(tulos) {
              kilpailijantulos['nimi'] = kilpailija.get('etunimi')+' '+kilpailija.get('sukunimi');
              kilpailijantulos['status'] = kilpailija.get('status');
              kilpailijantulos['nro'] = kilpailija.get('nro');
              kilpailijantulos['lahtoaika'] = kilpailija.get('lahtoaika');
              kilpailijantulos['aika'] = tulos.get('aika');
              //kilpailijantulos['sija'] = tulos.get('sija');
              //console.log(kilpailijantulos);
              if (vapiste.get('jarjestys') == 0 || (kilpailijantulos['aika'] != "00:00:00" && kilpailijantulos['aika'] != "00:00:00,0")) {
                tulokset.push(kilpailijantulos);
              }
            }).catch(function(err) {
              //console.log("No result for competitor: "+err);
            });
            tulospromises.push(tulospromise);
          });

          Promise.all(tulospromises).then(function(ret) {

            /*
            kisat.sort(function(a,b) {
              aa = a.split(' ');
              bb = b.split(' ');
              if (parseInt(aa[2],10) > parseInt(bb[2],10)) {
                return -1;
              } else if (parseInt(aa[2],10) == parseInt(bb[2],10)) {
                if (parseInt(aa[1],10) > parseInt(bb[1],10)) {
                  return -1;
                } else if (parseInt(aa[1],10) == parseInt(bb[1],10)) {
                  if (parseInt(aa[0],10) > parseInt(bb[0],10)) {
                    return -1;
                  } else if (parseInt(aa[0],10) == parseInt(bb[0],10)) {
                    return 0;
                  } else {
                    return 1;
                  }
                } else {
                  return 1;
                }
              } else {
                return 1;
              }
            });
            */

            tulokset.sort(function (a, b) {
              let astatus;
              let bstatus;
              if (vapiste.get('jarjestys') == 0) {
                astatus = a['status'].replace('Open', 'OK');
                bstatus = b['status'].replace('Open', 'OK');
              } else {
                astatus = a['status'].replace('Open', 'OK').replace('DNF', 'OK').replace('DQ', 'OK');
                bstatus = b['status'].replace('Open', 'OK').replace('DNF', 'OK').replace('DQ', 'OK');
              }
              let aa = a['aika'].split(':');
              let bb = b['aika'].split(':');
              let ah = parseInt(aa[0],10);
              let bh = parseInt(bb[0],10);
              let amin = parseInt(aa[1],10);
              let bmin = parseInt(bb[1],10);
              let as = parseFloat(aa[2].replace(',', '.'));
              let bs = parseFloat(bb[2].replace(',', '.'));

              if (astatus == "OK" && bstatus == "OK") {
                if (ah < bh) {
                  return -1;
                } else if (ah > bh) {
                  return 1;
                } else {
                  if (amin < bmin) {
                    return -1;
                  } else if (amin > bmin) {
                    return 1;
                  } else {
                    if (as < bs) {
                      return -1;
                    } else if (as > bs) {
                      return 1;
                    } else {
                      return 0;
                    }
                  }
                }
              } else if (astatus == "OK") {
                return -1;
              } else if (bstatus == "OK") {
                return 1;
              } else {
                if (astatus == bstatus) {
                  return 0;
                } else if (astatus == "DQ") {
                  return -1;
                } else if (bstatus == "DQ") {
                  return 1;
                } else if (astatus == "DNF") {
                  return -1;
                } else if (bstatus == "DNF") {
                  return 1;
                } else if (astatus == "Vacant") {
                  return 1;
                } else if (bstatus == "Vacant") {
                  return -1;
                } else {
                  return 0;
                }
              }
            });

            let sija = 1;
            tulokset.forEach(function(el, ind) {
              if (el['status'] == "OK") {
                tulokset[ind]['sija'] = sija++;
              } else {
                tulokset[ind]['sija'] = 0;
              }
            });

            //console.log(tulokset);

            res.render('kisat/vapiste', {tulokset: tulokset, sarja: sarja.get('sarja'),vapiste: vapisteO, valiaika: req.params['vapiste'] != 0});
          }).catch(function(err) {
            res.status(404).render('error', {message: "Results not found", error: err});
          });



        }).catch(function(err) {
          res.status(404).render('error', {message: "Competitor or intermediary not found", error: err});
        });
      }
    }).catch(function(err) {
      res.status(404).render('error', {message: "Class not found", error: err});
    });
  }).catch(function(err) {
    res.status(404).render('error', {message: "Race not found", error: err});
  });
});

module.exports = router;

function aikaToSec(aikastr) {
  let a = aikastr.split(':');
  let secs = (parseInt(a[0],10) * 60 * 60 + parseInt(a[1],10) * 60 + parseFloat(a[2].replace(",",".")));
  return secs
}

function secToDiff(secs) {
  let ret = "";
  if (secs > 0) {
    ret += "+";
    if (secs > 60*60) {
      ret += Math.floor(secs/60/60)+":";
    }
    if (secs > 60) {
      let mins = Math.floor((secs - Math.floor(secs/60/60)*60*60)/60);
      if (mins < 10) {
        mins = "0"+mins;
      }
      ret += mins+":";
    }
    secs -= (Math.floor(secs/60/60)*60*60);
    let rest = Math.floor(secs - Math.floor(secs/60)*60);
    if (rest < 10 && ret.length > 1) {
      rest = "0"+rest;
    }
    ret += rest;
  }
  return ret;
}
