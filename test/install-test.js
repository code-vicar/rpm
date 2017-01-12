var fs = require('fs');
var path = require('path');
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

var utils = require('../utils');

var install = rewire('../cmds/install');

var mockAddRemoteGit = sinon.spy();

install.__set__('addRemoteGit', mockAddRemoteGit);

describe('install', function () {
  it('should throw error if cwd is invalid', function () {
    return install({
      cwd: 'blah'
    }).then(function() {
      throw new Error('Should not succeed');
    }).catch(function (err) {
      expect(err).to.exist;
      expect(err.message).to.not.equal('Should not succeed');
    })
  })

  it('should download git urls in rpm.json to {cwd}/rpm_modules/{dependency-name}', function() {
    var dir = path.resolve(__dirname, 'install-staging')
    return install({
      cwd: path.resolve(__dirname, 'install-staging')
    }).then(function() {
      return utils.stat(path.join(dir, 'rpm_modules', 'some-repo'))
    }).then(function(stats) {
      expect(stats).to.exist;
      expect(stats.isDirectory).to.be.true;
    })
  })
})
