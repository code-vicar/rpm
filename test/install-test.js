var path = require('path')

var expect = require('chai').expect
var sinon = require('sinon')
var rewire = require('rewire')
var del = require('del')
var fs = require('fs-promise')

var utils = require('../utils')
var install = rewire('../cmds/install')

describe('install', function() {
  var dir, mockDownload, mockClearCache

  beforeEach(function() {
    dir = path.resolve(__dirname, 'install-staging')

    mockDownload = sinon.spy(function(url, cb) {
      return cb(null, '')
    })
    mockClearCache = sinon.spy(function(cb) {
      return cb()
    })

    install.__set__('addRemoteGit', {
      download: mockDownload,
      clearCache: mockClearCache
    })
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
      expect(mockDownload.calledWith('github:code-vicar/graphlib')).to.be.true
      expect(mockDownload.calledWith('github:code-vicar/odin#66a70f6')).to.be.true
      expect(mockDownload.calledWith('github:lodash/lodash')).to.be.true
      expect(mockDownload.calledWith('github:lodash/async')).to.be.true
    })
  })

  describe('copying downloaded packages', function() {
    var rokuModulesDir
    beforeEach(function() {
      rokuModulesDir = path.join(dir, 'roku_modules')
    })

    afterEach(function() {
      return del(rokuModulesDir)
    })

    it('should copy packages downloaded by add-remote-git to roku_modules', function() {
      return install({
        cwd: dir
      }).then(function() {
        return fs.readdir(rokuModulesDir)
      }).then(function(dirContents) {
        console.log(dirContents)
        expect(dirContents).to.contain('lodash')
      })
    })
  })
})
