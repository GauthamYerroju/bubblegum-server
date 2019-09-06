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
    name: 'thumbs',
    default: process.cwd()
  }
}
var argv = {}
for(var [i, arg] of process.argv.slice(2).entries()) {
  var spec = argSpec[i + 1]
  if (spec) {
    argv[spec.name] = arg || spec.default
  }
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

router.get(['/listdir', '/search'], function (req, res, next) {
  // TODO: Different router method for search
  var pre = (req.url.indexOf('/search') >= 0) ? argv.home : argv.home
  var p = path.resolve(pre, req.query.path || '')
  var promises = []
  for (const i of iterDir(p, recurse=false)) {
    i.isDir = i.dir
    i.useSrc = true
    i.mtime = i.mtime / 1000
    i.ctime = i.ctime / 1000
    if (i.dir) {
      promises.push(i)
    } else {
      i.ext = path.extname(i.path)
      i.mime = mime.lookup(i.path)
      promises.push(new Promise((resolve, reject) => {
        Media.inspect(i.path)
        .then(info => {
          console.log(info)
          i.meta = info
          i.width = info.width
          i.height = info.height
          // i.isPortrait = i.height > i.width
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

module.exports = router;
