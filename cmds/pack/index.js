var path = require('path')
var os = require('os')

var lodashGet = require('lodash.get')
var lodashForEach = require('lodash.foreach')
var fs = require('fs-extra')
var async = require('async')
var archiver = require('archiver')

var utils = require('../../utils')
var readDir = utils.readDir
var RpmError = utils.RpmError
var Logger = utils.Logger
var validateDirectory = utils.validateDirectory

module.exports = pack

function pack(options) {
  var cwdOption = lodashGet(options, 'cwd')
  var debug = !!(lodashGet(options, 'debug'))
  var ignore = lodashGet(options, 'ignore') || []
  var logger = new Logger(debug)
  var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpm_pack-'))
  var rokuModulesPath
  var cwd

  return validateDirectory(cwdOption).then(function(validCwd) {
    // set paths
    cwd = validCwd
    return fs.copy(cwd, tmpDir)
  }).then(function() {
    rokuModulesPath = path.join(tmpDir, 'roku_modules')

    return readDir(rokuModulesPath).catch(function(err) {
      logger.warn('Could not read directory: ' + rokuModulesPath)
      return []
    })
  }).then(function(moduleNames) {
    // collect up the module paths and process them in series returning the results
    var modulePathProcessors = []

    lodashForEach(moduleNames, function(moduleName) {
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
  var moduleComponents, moduleSource, targetComponents, targetSource
  try {
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
