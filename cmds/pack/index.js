var path = require('path')

var _ = require('lodash')
var fs = require('fs-promise')
var async = require('async')
// var glob = require('glob')
var archiver = require('archiver')

var utils = require('../../utils')
var stat = utils.stat
var readDir = utils.readDir
var RpmError = utils.RpmError
var Logger = utils.Logger
var validateDirectory = utils.validateDirectory

module.exports = pack

function pack(options) {
  var cwd = _.get(options, 'cwd')
  var debug = !!(_.get(options, 'debug'))
  var logger = new Logger(debug)
  var tmpDir = utils.tmpDir
  var rokuModulesPath

  return validateDirectory(cwd).then(function(_cwd) {
    // set paths
    cwd = _cwd
    tmpDir = path.join(cwd, tmpDir)

    return fs.copy(cwd, tmpDir, {
      filter: function(source) {
        logger.log(source)
        return true
      }
    })
  }).then(function() {
    rokuModulesPath = path.join(tmpDir, 'roku_modules')

    return readDir(rokuModulesPath).catch(function(err) {
      throw new RpmError({
        message: 'Could not read directory: ' + rokuModulesPath,
        innerError: err,
        type: 'UnreadableRokuModules'
      })
    })
  }).then(function(moduleNames) {
    // collect up the module paths and process them in series returning the results
    var modulePathProcessors = []

    _.forEach(moduleNames, function(moduleName) {
      modulePathProcessors.push(function(callback) {
        processModulePath(tmpDir, rokuModulesPath, moduleName, callback)
      })
    })

    return new Promise(function(resolve, reject) {
      async.series(modulePathProcessors, function(err, results) {
        if (err) {
          return reject(err)
        }
        return resolve(results)
      })
    })
  }).then(function() {
    return new Promise(function(resolve, reject) {
      var output = fs.createWriteStream(path.join(cwd, 'rpm_archive.zip'))
      var archive = archiver('zip', {
        store: true // Sets the compression method to STORE.
      })

      output.on('close', function() {
        logger.log(archive.pointer() + ' total bytes')
        logger.log('archiver has been finalized and the output file descriptor has closed.')
        resolve()
      })

      archive.on('error', function(err) {
        reject(err)
      })

      archive.pipe(output)

      archive.glob('**/*', {
        cwd: tmpDir,
        debug: debug,
        ignore: [
          utils.tmpDir,
          'rpm_archive.zip'
        ]
      })

    })
  }).catch(function(err) {
    if (err && err.type == 'UnreadableRokuModules') {
      // noop when roku_modules is unreadable
      return Promise.resolve()
    }
    throw err
  })
}

function processModulePath(cwd, rokuModulesPath, moduleName, cb) {
  var config, moduleComponents, moduleSource, targetComponents, targetSource
  try {
    var config = {}

    var moduleComponents = path.join(rokuModulesPath, moduleName, 'components')
    var targetComponents = path.join(cwd, 'components', moduleName)
    var moduleSource = path.join(rokuModulesPath, moduleName, 'source')
    var targetSource = path.join(cwd, 'source', moduleName)
  } catch (e) {
    cb(e)
  }

  fs.copy(moduleComponents, targetComponents).then(function() {
    return fs.copy(moduleSource, targetSource)
  }).then(function() {
    cb()
  }).catch(function(err) {
    cb(err)
  })
}
