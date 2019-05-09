var path = require('path')

var expect = require('chai').expect
var sinon = require('sinon')
var rewire = require('rewire')

var install = rewire('../cmds/install')

var mockRpmJson = {
  "dependencies": {
    "graphlib": "github:code-vicar/graphlib",
    "odin": "github:code-vicar/odin#66a70f6",
    "lodash": "github:lodash/lodash",
    "async": "github:lodash/async"
  }
}
var dependencies = {}
dependencies['github:code-vicar/graphlib'] = 'graphlib'
dependencies['github:code-vicar/odin#66a70f6'] = 'odin'
dependencies['github:lodash/lodash'] = 'lodash'
dependencies['github:lodash/async'] = 'async'

var mockAddRemoteGit = {
  download: sinon.spy(function(url, cb) {
    var dirName = dependencies[url]

    return cb(null, {
      tmpdir: path.join('tmpDir', 'mock_downloads', dirName)
    })
  }),
  clearCache: sinon.spy(function(cb) {
    return cb()
  })
}
install.__set__('addRemoteGit', mockAddRemoteGit)

var mockFs = {
  ensureDir: sinon.spy(function(dir) {
    return Promise.resolve(dir)
  }),
  copy: sinon.spy(function() {
    return Promise.resolve()
  })
}
install.__set__('fs', mockFs)

var mockValidateDirectory = sinon.spy(function(dir) {
  return Promise.resolve('testDir')
})
install.__set__('validateDirectory', mockValidateDirectory)

var mockReadFile = sinon.spy(function(dir, enc) {
  if (dir.indexOf("rpm.json") !== -1) {
    return Promise.resolve(JSON.stringify(mockRpmJson))
  }
  return Promise.reject('unexpected readFile')
})
install.__set__('readFile', mockReadFile)

describe('install', function() {
  beforeEach(function() {
    mockFs.ensureDir.reset()
    mockFs.copy.reset()

    mockAddRemoteGit.download.reset()
    mockAddRemoteGit.clearCache.reset()

    mockValidateDirectory.reset()
    mockReadFile.reset()
  })

  it('should throw error if cwd is invalid', function() {
    return install.__with__({
      validateDirectory: function(dir) {
        return Promise.reject(new Error('test failure'))
      }
    })(function() {
      return install().then(function() {
        throw new Error('Should not succeed');
      }).catch(function(err) {
        expect(err).to.exist;
        expect(err.message).to.equal('test failure');
      })
    })
  })

  it('should throw error if rpm.json does not exist', function() {
    return install.__with__({
      readFile: function(path, encoding) {
        if (path.indexOf("rpm.json") !== -1) {
          return Promise.reject('missing rpm.json test')
        }
        return Promise.resolve('')
      }
    })(function() {
      return install().then(function() {
        throw new Error('Should not succeed');
      }).catch(function(err) {
        expect(err).to.exist;
        expect(err.message).to.not.equal('Should not succeed');
      })
    })
  })

  it('should call add-remote-git with the git urls in rpm.json', function() {
    return install().then(function() {
      expect(mockAddRemoteGit.download.calledWith('github:code-vicar/graphlib')).to.be.true
      expect(mockAddRemoteGit.download.calledWith('github:code-vicar/odin#66a70f6')).to.be.true
      expect(mockAddRemoteGit.download.calledWith('github:lodash/lodash')).to.be.true
      expect(mockAddRemoteGit.download.calledWith('github:lodash/async')).to.be.true
    })
  })

  it('should call clearCache after install fails', function() {
    var tmpMockAddRemoteGit = {
      download: function(url, cb) {
        return cb(new Error('whoops'))
      },
      clearCache: mockAddRemoteGit.clearCache
    }

    return install.__with__({
      addRemoteGit: tmpMockAddRemoteGit
    })(function() {
      return install().then(function() {
        throw new Error('Should not succeed');
      }).catch(function(err) {
        expect(err).to.exist;
        expect(err.message).to.not.equal('Should not succeed');
        expect(mockAddRemoteGit.clearCache.called).to.equal(true, 'clearCache was not called')
      })
    })
  })

  it('should fallback to local file system if package value is not a git URL', function() {
    var tmpMockAddRemoteGit = {
      download: function(url, cb) {
        return cb(new Error('... is not a Git or GitHub URL'))
      },
      clearCache: mockAddRemoteGit.clearCache
    }

    return install.__with__({
      addRemoteGit: tmpMockAddRemoteGit
    })(function() {
      return install().then(function() {
        expect(mockAddRemoteGit.clearCache.called).to.equal(true, 'clearCache was not called')
      })
    })
  })

  it('should call clearCache after install succeeds', function() {
    return install().then(function() {
      expect(mockAddRemoteGit.clearCache.called).to.equal(true, 'clearCache was not called')
    })
  })

  it('should copy packages downloaded by add-remote-git to roku_modules', function() {
    var base = path.join('tmpDir', 'mock_downloads')
    var targetBase = path.join('testDir', 'roku_modules')
    return install().then(function() {
      expect(mockFs.copy.calledWith(path.join(base, 'graphlib'), path.join(targetBase, 'graphlib'))).to.be.true
      expect(mockFs.copy.calledWith(path.join(base, 'odin'), path.join(targetBase, 'odin'))).to.be.true
      expect(mockFs.copy.calledWith(path.join(base, 'lodash'), path.join(targetBase, 'lodash'))).to.be.true
      expect(mockFs.copy.calledWith(path.join(base, 'async'), path.join(targetBase, 'async'))).to.be.true
    })
  })

  describe('hard', function() {
    it('should copy packages downloaded into roku_modules folder to root/components/package and root/source/package folders', function() {
      var base = path.join('testDir', 'roku_modules')
      var targetBase = path.join('testDir')
      return install({
        hard: true
      }).then(function(dirContents) {
        expect(mockFs.copy.calledWith(path.join(base, 'graphlib', 'components'), path.join(targetBase, 'components', 'graphlib'))).to.be.true
        expect(mockFs.copy.calledWith(path.join(base, 'graphlib', 'source'), path.join(targetBase, 'source', 'graphlib'))).to.be.true

        expect(mockFs.copy.calledWith(path.join(base, 'odin', 'components'), path.join(targetBase, 'components', 'odin'))).to.be.true
        expect(mockFs.copy.calledWith(path.join(base, 'odin', 'source'), path.join(targetBase, 'source', 'odin'))).to.be.true

        expect(mockFs.copy.calledWith(path.join(base, 'lodash', 'components'), path.join(targetBase, 'components', 'lodash'))).to.be.true
        expect(mockFs.copy.calledWith(path.join(base, 'lodash', 'source'), path.join(targetBase, 'source', 'lodash'))).to.be.true

        expect(mockFs.copy.calledWith(path.join(base, 'async', 'components'), path.join(targetBase, 'components', 'async'))).to.be.true
        expect(mockFs.copy.calledWith(path.join(base, 'async', 'source'), path.join(targetBase, 'source', 'async'))).to.be.true
      })
    })
  })
})
