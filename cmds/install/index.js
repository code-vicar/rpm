var _ = require('lodash')
var addRemoteGit = require('add-remote-git')
var validateDirectory = require('../../utils').validateDirectory

module.exports = install

function install(options) {
    var cwd = _.get(options, 'cwd')

    return validateDirectory(cwd).then(function(_cwd) {
        cwd = _cwd
        return '';
    })
}
