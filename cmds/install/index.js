var path = require('path')
var _ = require('lodash')
var async = require('async')
var addRemoteGit = require('add-remote-git')
var utils = require('../../utils')
var validateDirectory = utils.validateDirectory
var readFile = utils.readFile
var RpmError = utils.RpmError

module.exports = install

function install(options) {
  var cwd = _.get(options, 'cwd')

  return validateDirectory(cwd).then(function(_cwd) {
    cwd = _cwd

    return readFile(path.join(cwd, 'rpm.json'), 'utf-8').catch(function(err) {
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
        addRemoteGit.download(value, callback)
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
    return results.length + ' packages downloaded'
  })
}
