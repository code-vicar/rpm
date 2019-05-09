var fs = require('fs')
var path = require('path')

var request = require('request')
var lodashGet = require('lodash.get')

var utils = require('../../utils')
var validateDirectory = utils.validateDirectory

module.exports = deploy

var protocol = 'http://'
var rokuDeployPath = '/plugin_install'
var keypressPath = ':8060/keypress'
var homeButtonPath = '/Home'

function deploy(options) {
  var cwd = lodashGet(options, 'cwd')

  var ipaddress = lodashGet(options, 'ipaddress') || '192.168.1.1'
  var user = lodashGet(options, 'user') || 'rokudev'
  var password = lodashGet(options, 'password') || '1111'

  var host = protocol + ipaddress
  var remoteControlURL = host + keypressPath

  var homeButtonURL = remoteControlURL + homeButtonPath
  var deployURL = host + rokuDeployPath

  return validateDirectory(cwd).then(function(_cwd) {
    cwd = _cwd

    // press home button
    return new Promise(function(resolve, reject) {
      request.post(homeButtonURL, function(err, response) {
        if (err) {
          return reject(err)
        }
        return resolve(response)
      })
    }).then(function(response) {
      // push the archive
      var tries = 0;
      return new Promise(function(resolve, reject) {
        request.post({
          url: deployURL,
          formData: {
            mysubmit: 'Replace',
            archive: fs.createReadStream(path.join(cwd, 'rpm_archive.zip'))
          }
        }, function(err, response, body) {
          if (err) {
            return reject(err)
          }
          return resolve({ response: response, body: body })
        }).auth(user, password, false)
      })
    }).then(function(results) {
      if (results && results.response && results.response.statusCode === 200) {
        if (results.body.indexOf('Identical to previous version -- not replacing.') != -1) {
          return { msg: 'Identical to previous version -- not replacing', results: results }
        }
        return { msg: 'Successful deploy', results: results }
      } else if (results && results.response) {
        return { msg: 'Error, statusCode other than 200: ' + results.response.statusCode, results: results }
      } else {
        return { msg: 'Invalid response', results: results }
      }
    })
  })
}
