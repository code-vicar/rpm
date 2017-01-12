var validateDirectory = require('../../utils').validateDirectory
var _ = require('lodash')

module.exports = install

function install(options) {
    var cwd = _.get(options, 'cwd')

    return validateDirectory(cwd).then(function(_cwd) {
        cwd = _cwd
        return '';
    })
}
