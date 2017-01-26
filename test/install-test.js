var path = require('path');
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

var utils = require('../utils');

var install = rewire('../cmds/install');

var mockDownload = sinon.spy(function(url, cb) {
  return cb(null, '')
});

var mockClearCache = sinon.spy(function(cb) {
  return cb()
});

install.__set__('addRemoteGit', {
  download: mockDownload,
  clearCache: mockClearCache
});

describe('install', function () {
  beforeEach(function() {
    mockDownload.reset()
    mockClearCache.reset()
  })

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

  it('should call add-remote-git with the git urls in rpm.json', function() {
    var dir = path.resolve(__dirname, 'install-staging')
    return install({
      cwd: dir
    }).then(function() {
      expect(mockDownload.calledWith('github:code-vicar/graphlib')).to.be.true
      expect(mockDownload.calledWith('github:code-vicar/odin#66a70f6')).to.be.true
      expect(mockDownload.calledWith('github:lodash/lodash')).to.be.true
      expect(mockDownload.calledWith('github:lodash/async')).to.be.true
    })
  })

  // it('should copy packages downloaded by add-remote-git to roku_modules', function() {
  //   var dir = path.resolve(__dirname, 'install-staging')
  //   return install({
  //     cwd: dir
  //   }).then(function() {
  //     return utils.stat(path.join(dir, 'rpm_modules', 'some-repo'))
  //   }).then(function(stats) {
  //     expect(stats).to.exist;
  //     expect(stats.isDirectory).to.be.true;
  //   })
  // })
})
