var path = require('path')

var _ = require('lodash')
var async = require('async')
var addRemoteGit = require('add-remote-git')
var fs = require('fs-promise')
var utils = require('../../utils')
var validateDirectory = utils.validateDirectory
var readFile = utils.readFile
var RpmError = utils.RpmError

module.exports = install

function install(options) {
  var cwd = _.get(options, 'cwd')
  var rpmJsonPath, rokuModulesPath
  var didClearCache = false
  var isHardInstall = !!_.get(options, 'hard')

  return validateDirectory(cwd).then(function(_cwd) {
    // set paths
    cwd = _cwd
    rpmJsonPath = path.join(cwd, 'rpm.json')
    rokuModulesPath = path.join(cwd, 'roku_modules')

    return readFile(rpmJsonPath, 'utf-8').catch(function(err) {
      throw new RpmError({ message: 'Could not read rpm.json file', innerError: err })
    })
  }).then(function(contents) {
    var rpmJson = {}
    try {
      rpmJson = JSON.parse(contents)
    } catch (err) {
      throw new RpmError({ message: 'Could not parse rpm.json contents', innerError: err })
    }

    if (typeof rpmJson.dependencies !== 'object') {
      return Promise.resolve(0)
    }

    var downloads = []
    _.forOwn(rpmJson.dependencies, function(value, key) {
      downloads.push(function(callback) {
        addRemoteGit.download(value, function(err, download) {
          if (err) {
            console.log("NOT A GIT URL - assuming file system path")
            console.log(value)
            console.log(key)
            download = {}
            download.tmpdir = value
            download.sourceKey = key
            return callback(null, download)
          }
          download.sourceValue = value
          download.sourceKey = key
          return callback(null, download)
        })
      })
    })

    return new Promise(function(resolve, reject) {
      return async.series(downloads, function(err, results) {
        if (err) {
          return reject(err)
        }

        return resolve(results)
      })
    })
  }).then(function(results) {
    return fs.ensureDir(rokuModulesPath).then(function() {
      return results
    })
  }).then(function(results) {
    var copies = []
    _.forEach(results, function(result) {
      var targetDir = path.join(rokuModulesPath, result.sourceKey)
      copies.push(function(callback) {
        fs.copy(result.tmpdir, targetDir)
          .then(function() { callback() })
          .catch(function(err) { callback(err) })
      })
    })

    return new Promise(function(resolve, reject) {
      return async.series(copies, function(err) {
        if (err) {
          return reject(err)
        }
        return resolve(results)
      })
    })
  }).then(function(results) {
    if (!isHardInstall) {
      return results
    }
    var moduleNames = results.map(function(result) {
      return result.sourceKey
    })

    // collect up the module paths and process them in series returning the results
    var modulePathProcessors = []

    _.forEach(moduleNames, function(moduleName) {
      modulePathProcessors.push(function(callback) {
        processModulePath(cwd, rokuModulesPath, moduleName, callback)
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
  }).then(function(results) {
    return clearCache().then(function() {
      didClearCache = true
      return results
    })
  }).catch(function(err) {
    // already cleared the cache, or clear cache attempt resulted in error then just rethrow (nothing else to do)
    if (didClearCache || (err && err.type && err.type === 'ClearCacheError')) {
      throw err
    }

    // haven't cleared cache yet, and error wasn't a result of a failed clearCache attempt, go ahead and try to clear the cache
    return clearCache().then(function() {
      // rethrow original error
      throw err
    })
  })
}

function clearCache() {
  return new Promise(function(resolve, reject) {
    addRemoteGit.clearCache(function(err) {
      if (err) {
        return reject(new RpmError({
          message: 'Could not clear cache',
          type: 'ClearCacheError',
          innerError: err
        }))
      }

      return resolve()
    })
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
