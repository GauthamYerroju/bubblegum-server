var path = require('path')
var process = require('process')
var express = require('express');
var router = express.Router();
var mime = require('mime-types')
var { iterDir, Media } = require("bubblegum-core")

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

router.get(['/listdir'], function (req, res, next) {
  var promises = []
  for (const i of iterDir(path.resolve(argv.home, req.query.path || ''), recurse=false)) {
    i.thumb = i.path // MOD
    i.mtime = i.mtime / 1000 // TODO: Why am I doing this again?
    i.ctime = i.ctime / 1000
    if (i.dir) {
      promises.push(i)
    } else {
      i.mime = mime.lookup(i.path)
      promises.push(new Promise((resolve, reject) => {
        Media.inspect(i.path)
        .then(info => {
          i.width = info.width
          i.height = info.height
          resolve(i)
        }).catch(err => {
          console.error(err)
          i.error = err
          resolve(i)
        })
      }))
    }
  }
  Promise.all(promises).catch(res.json).then(values => {
    // console.table(values)
    return res.json(values)
  })
});

router.get(['/search'], function (req, res, next) {
  const searchTerm = req.query.q || ''
  for(const letter of searchTerm.split('')) {
    
  }
  const result = searchTerm.split('').map(x => ({
    name: x,
    path: path.resolve(argv.home, x),
    dir: false,
    size: 0,
    mtime: 1564209108.6080341,
    ctime: 1564209108.6080341,
    useSrc: true
  }))
  return res.json(result)
});

module.exports = router;
