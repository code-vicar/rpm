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
  var ignore = _.get(options, 'ignore') || []
  var logger = new Logger(debug)
  var tmpDir = utils.tmpDir
  var rokuModulesPath

  return validateDirectory(cwd).then(function(_cwd) {
    // set paths
    cwd = _cwd
    tmpDir = path.join(cwd, tmpDir)

    return fs.copy(cwd, tmpDir, {
      filter: function(sourceFilePath) {
        // ignore cwd in source path
        sourceFilePath = sourceFilePath.replace(cwd, '')
        if (sourceFilePath.charAt(0) === '/') {
          sourceFilePath = sourceFilePath.slice(1)
        }
        logger.log(sourceFilePath)
        // prevent endless recursion by not copying the directory into itself
        if (sourceFilePath.startsWith(utils.tmpDir)) {
          return false
        }
        return true
      }
    })
  }).then(function() {
    rokuModulesPath = path.join(tmpDir, 'roku_modules')

    return readDir(rokuModulesPath).catch(function(err) {
      logger.warn('Could not read directory: ' + rokuModulesPath)
      return []
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
      var archive = archiver('zip')

      output.on('close', function() {
        logger.log(archive.pointer() + ' total bytes')
        logger.log('archiver has been finalized and the output file descriptor has closed.')
        resolve()
      })

      archive.on('error', function(err) {
        reject(err)
      })

      archive.pipe(output)

      archive.glob('**', {
        cwd: tmpDir,
        debug: debug,
        ignore: [
          'rpm_archive.zip',
          'roku_modules/**'
        ].concat(ignore)
      })

      archive.finalize()
    })
  }).then(function() {
    return fs.remove(tmpDir).catch(function(err) {
      if (err) {
        throw new RpmError({
          message: 'Failed to remove ' + tmpDir,
          type: 'RemoveTempDir',
          innerError: err
        })
      }
    })
  }).catch(function(err) {
    if (err && err.type !== 'RemoveTempDir') {
      throw err
    }

    return fs.remove(tmpDir)
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
