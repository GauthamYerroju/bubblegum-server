var path = require('path')
var process = require('process')
var express = require('express');
var router = express.Router();
var mime = require('mime-types')
var { iterDir, getFileData, searchDb } = require("bubblegum-core")

// TODO: why do I need config/default.json? Figure it out.
// TODO: define settings in bubblegum-core, expose it in bubblegum-server and bubblegum-gallery

// Commandline args (quick and dirty argparser)
var argSpec = {
  1: {
    name: 'home',
    default: process.cwd()
  },
  2: {
    name: 'thumbs'
  }
}
var argv = {}
for(var [i, arg] of process.argv.slice(2).entries()) {
  var spec = argSpec[i + 1]
  if (spec) {
    argv[spec.name] = arg || spec.default
  }
}
if (argv.home && !argv.thumbs) {
  argv.thumbs = argv.home
}
console.table(argv)

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/get-file', function(req, res, next) {
  var p = path.resolve(argv.home, req.query.path)
  return res.sendFile(p)
});

router.get('/get-thumbnail', function(req, res, next) {
  var p = path.resolve(argv.thumbs, req.query.path)
  return res.sendFile(p)
});

router.get('/listdir', function (req, res, next) {
  var promises = []
  for (const i of iterDir(path.resolve(argv.home, req.query.path || ''), recurse=false)) {
    if (i.dir) {
      promises.push(i)
    } else {
      i.mime = mime.lookup(i.path)
      promises.push(new Promise((resolve, reject) => {
        getFileData(i)
        .then(data => resolve(data))
        .catch(err => {
          i.error = err
          resolve(i)
        })
      }))
    }
  }
  Promise.all(promises)
    .then(res.json)
    .catch(res.json)
});

router.get('/search', function (req, res, next) {
  const q = req.query.q || ''
  const orderBy = req.query.sortBy || 'name'
  const desc = !(req.query.sortAsc === 'true')
  const limit = req.query.limit
  const offset = req.query.offset
  searchDb(q, orderBy, desc, limit, offset)
    .then(res.json)
    .catch(res.json)
});

router.get('/scan', function (req, res, next) {
  var promises = []
  for (const i of iterDir(path.resolve(argv.home), recurse=true)) {
    if (i.dir) continue;
    promises.push(new Promise((resolve, reject) => {
      getFileData(i, true)
      .then(data => {
        resolve(data)
      })
      .catch(err => {
        resolve(err)
      })
    }))
  }
  Promise.all(promises).catch(err => res.status(500).json(err)).then(values => {
    return res.json({message: `Indexed ${values.length} item(s).`})
  })
});

module.exports = router;
