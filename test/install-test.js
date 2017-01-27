var path = require('path')

var expect = require('chai').expect
var sinon = require('sinon')
var rewire = require('rewire')
var del = require('del')
var fs = require('fs-promise')

var utils = require('../utils')
var install = rewire('../cmds/install')

var mockAddRemoteGit = {}
install.__set__('addRemoteGit', mockAddRemoteGit)

describe('install', function() {
  var dir, rokuModulesDir

  beforeEach(function() {
    dir = path.resolve(__dirname, 'install-staging')
    rokuModulesDir = path.join(dir, 'roku_modules')

    var dependencies = {}
    dependencies['github:code-vicar/graphlib'] = 'graphlib'
    dependencies['github:code-vicar/odin#66a70f6'] = 'odin'
    dependencies['github:lodash/lodash'] = 'lodash'
    dependencies['github:lodash/async'] = 'async'

    mockAddRemoteGit.download = sinon.spy(function(url, cb) {
      dirName = dependencies[url]

      return cb(null, {
        tmpdir: path.join(dir, 'mock_downloads', dirName)
      })
    })

    mockAddRemoteGit.clearCache = sinon.spy(function(cb) {
      return cb()
    })
  })

  afterEach(function() {
    return del(rokuModulesDir)
  })

  it('should throw error if cwd is invalid', function() {
    return install({
      cwd: 'blah'
    }).then(function() {
      throw new Error('Should not succeed');
    }).catch(function(err) {
      expect(err).to.exist;
      expect(err.message).to.not.equal('Should not succeed');
    })
  })

  it('should call add-remote-git with the git urls in rpm.json', function() {
    return install({
      cwd: dir
    }).then(function() {
      expect(mockAddRemoteGit.download.calledWith('github:code-vicar/graphlib')).to.be.true
      expect(mockAddRemoteGit.download.calledWith('github:code-vicar/odin#66a70f6')).to.be.true
      expect(mockAddRemoteGit.download.calledWith('github:lodash/lodash')).to.be.true
      expect(mockAddRemoteGit.download.calledWith('github:lodash/async')).to.be.true
    })
  })

  it('should copy packages downloaded by add-remote-git to roku_modules', function() {
    return install({
      cwd: dir
    }).then(function() {
      return fs.readdir(rokuModulesDir)
    }).then(function(dirContents) {
      expect(dirContents).to.contain('graphlib')
      expect(dirContents).to.contain('odin')
      expect(dirContents).to.contain('lodash')
      expect(dirContents).to.contain('async')
    })
  })

  it('should call clearCache after install fails', function() {
    mockAddRemoteGit.download = sinon.spy(function(url, cb) {
      return cb(new Error('whoops'))
    })

    return install({
      cwd: dir
    }).then(function() {
      throw new Error('Should not succeed');
    }).catch(function(err) {
      expect(err).to.exist;
      expect(err.message).to.not.equal('Should not succeed');
      expect(mockAddRemoteGit.clearCache.called).to.equal(true, 'clearCache was not called')
    })
  })

  it('should call clearCache after install succeeds', function() {
    return install({
      cwd: dir
    }).then(function() {
      expect(mockAddRemoteGit.clearCache.called).to.equal(true, 'clearCache was not called')
    })
  })
})
