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

        res.render('kisat/kisa', { taulukkoDatat: taulukkoDatat, title: kisa.get('nimi') });

      }).catch(function(err) {
        res.status(404).render('error', {message: "Intermediaries not found", error: err});
      });


    }).catch(function(err) {
      res.status(404).render('error', {message: "Class not found", error: err});
    });
  }).catch(function(err) {
    res.status(404).render('error', {message: "Race not found", error: err});
  });

  //res.send('Kisa: '+req.params['kisaTunnus']);
});

router.get('/:kisaTunnus/:sarja/:vapiste', function(req, res, next) {
  db.Kisa.findOne({
    where: {
      tunnus: req.params['kisaTunnus']
    }
  }).then(function(kisa) {
    db.Sarja.findOne({
      where: {
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
              kilpailijantulos['sija'] = tulos.get('sija');
              //console.log(kilpailijantulos);
              if (vapiste.get('jarjestys') == 0 || kilpailijantulos['aika'] != "00:00:00") {
                tulokset.push(kilpailijantulos);
              }
            }).catch(function(err) {
              console.log("No result for competitor: "+err);
            });
            tulospromises.push(tulospromise);
          });

          Promise.all(tulospromises).then(function(ret) {
            tulokset.sort(function (a, b) {
              //console.log(a['sija']+'?'+b['sija']);
              if (a['sija'] != 0 && b['sija'] != 0) {
                //console.log(a['sija']-b['sija']);
                return a['sija']-b['sija'];
              } else if (b['sija'] == 0 && a['sija'] == 0) {
                //console.log(0);
                return 0;
              } else if (a['sija'] == 0) {
                return 1;
              } else if (b['sija'] == 0) {
                return -1;
              } else {
                //console.log(1);
                return 1;
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
