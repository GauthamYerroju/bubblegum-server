var path = require('path')
var process = require('process')
var express = require('express');
var router = express.Router();
var mime = require('mime-types')
var { iterDir, getFileData, getFileDataBatch, searchDb } = require("bubblegum-core")

// TODO: why do I need config/default.json? Figure it out.
// TODO: define settings in bubblegum-core, expose it in bubblegum-server and bubblegum-gallery

// Commandline args (quick and dirty argparser)
var argSpec = {
  1: {
    name: 'home',
    default: process.cwd()
  },
  2: {
    name: 'thumbs',
    default: path.resolve(process.cwd(), 'thumbnails')
  }
}
var argv = {}
for (var [i, arg] of process.argv.slice(2).entries()) {
  var spec = argSpec[i + 1]
  if (spec) {
    argv[spec.name] = arg || spec.default
  }
}
console.table(argv)

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/get-file', function (req, res, next) {
  var p = path.resolve(argv.home, req.query.path)
  return res.sendFile(p)
});

router.get('/get-thumbnail', function (req, res, next) {
  var p = path.resolve(argv.thumbs, req.query.path)
  return res.sendFile(p)
});

router.get('/listdir', function (req, res, next) {
  const homePath = path.resolve(argv.home, req.query.path || '')
  const items = []
  for (const i of iterDir(homePath, recurse = false)) {
    i.mime = mime.lookup(i.path)
    items.push(i)
  }
  getFileDataBatch(items)
    .then(result => {
      res.json(result)
    })
    .catch(err => {
      console.error(err)
      res.json(err)
    })
});

router.get('/search', function (req, res, next) {
  const q = req.query.q || ''
  const orderBy = req.query.sortBy || 'name'
  const desc = !(req.query.sortAsc === 'true')
  const limit = req.query.limit || 80 // TODO: remove default here after pagination is implemented in ui
  const offset = req.query.offset || 0
  searchDb(q, orderBy, desc, limit, offset)
    .then(result => {
      res.json(result)
    })
    .catch(err => {
      console.error(err)
      res.json(err)
    })
});

router.get('/scan', function (req, res, next) {
  const batchSize = req.query.batchSize || 10 // TODO: move scan batch size to config in UI
  const fillBatch = (iterator) => {
    const batch = []
    for (let i = 0; i < batchSize; i++) {
      let item = iterator.next()
      if (item.done) break;
      batch.push(item.value)
    }
    return batch
  }
  const recursivePromise = (iterator) => {
    const batch = fillBatch(iterator)
    return getFileDataBatch(batch, true)
      .catch(err => {
        console.error(err)
        res.status(500).json(err)
      })
      .then((result) => {
        if (batch.length) {
          return recursivePromise(iterator)
        } else {
          return res.json({ message: `Indexing succesful.` })
        }
      })
  }
  recursivePromise(iterDir(path.resolve(argv.home), recurse = true))
});

module.exports = router;
