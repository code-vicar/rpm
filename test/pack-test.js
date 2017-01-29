var path = require('path')

var expect = require('chai').expect
var sinon = require('sinon')
var rewire = require('rewire')
var fs = require('fs-promise')

var utils = require('../utils')
var pack = rewire('../cmds/pack')

var dir = path.resolve(__dirname)
var temp_dir = '.rpm_pack'

describe('pack', function() {
  var mockReadDir, mockfs, mockArchiver

  beforeEach(function() {
    mockReadDir = sinon.spy(function() {
      return Promise.resolve([
        'dep1',
        'dep2'
      ])
    })

    mockfs = {
      remove: sinon.spy(function() {
        return Promise.resolve()
      }),
      createWriteStream: sinon.spy(function() {
        return {
          on: function(event, cb) {
            if (event === 'close') {
              process.nextTick(cb)
            }
          }
        }
      }),
      copy: sinon.spy(function(src, dest, options) {
        if (options && typeof options.filter === 'function') {
          options.filter('')
        }
        return Promise.resolve()
      })
    }

    mockArchiver = function() {
      return {
        on: function(event, cb) {
        },
        pointer: function() {
          return 12
        },
        pipe: sinon.spy(),
        glob: sinon.spy(),
        finalize: function() { }
      }
    }

    // mock/stub out IO
    pack.__set__('readDir', mockReadDir)
    pack.__set__('fs', mockfs)
    pack.__set__('archiver', mockArchiver)
  })

  it('should throw error if cwd is invalid', function() {
    return pack({
      cwd: 'blah'
    }).then(function() {
      throw new Error('Should not succeed');
    }).catch(function(err) {
      expect(err).to.exist;
      expect(err.message).to.not.equal('Should not succeed');
    })
  })

  it('should not throw error if roku_modules doesn\'t exist', function() {
    mockReadDir = sinon.spy(function() {
      return Promise.reject(new Error('no such directory'))
    })

    // override mockReadDir with reject behavior
    return pack.__with__({
      readDir: mockReadDir
    })(function() {
      return pack({
        cwd: dir
      })
    })
  })

  it('should copy everything to a temporary working directory', function() {
    return pack({
      cwd: dir
    }).then(function() {
      expect(mockfs.copy.called).to.equal(true, 'Copy not called')
      expect(mockfs.copy.calledWith(
        dir,
        path.join(dir, temp_dir)
      )).to.equal(true, 'Didn\'t copy to temp folder')
    })
  })

  it('should not copy sub directory into itself', function() {
    var mockString = {
      charAt: function() { return '/' },
      replace: sinon.spy(function() {
        return mockString
      }),
      slice: sinon.spy(function() {
        return mockString
      }),
      startsWith: sinon.spy()
    }
    mockfs.copy = function(src, dest, options) {
      if (options && typeof options.filter === 'function') {
        options.filter(mockString)
      }
      return Promise.resolve()
    }
    return pack({
      cwd: dir
    }).then(function() {
      expect(mockString.replace.called).to.equal(true, 'Did not call replace')
      expect(mockString.slice.called).to.equal(true, 'Did not call slice')
      expect(mockString.startsWith.calledWith(temp_dir)).to.equal(true, 'Did not call startsWith with temp_dir')
    })
  })

  it('should copy dependency components to a subfolder in parent source', function() {
    return pack({
      cwd: dir
    }).then(function() {
      expect(mockfs.copy.called).to.equal(true, 'Copy not called')
      expect(mockfs.copy.calledWith(
        path.join(dir, temp_dir, 'roku_modules', 'dep1', 'components'),
        path.join(dir, temp_dir, 'components', 'dep1')
      )).to.equal(true, 'Incorrect dep1 copy parameters')

      expect(mockfs.copy.calledWith(
        path.join(dir, temp_dir, 'roku_modules', 'dep2', 'components'),
        path.join(dir, temp_dir, 'components', 'dep2')
      )).to.equal(true, 'Incorrect dep2 copy parameters')

      expect(mockfs.copy.calledWith(
        path.join(dir, temp_dir, 'roku_modules', 'dep1', 'components'),
        path.join(dir, temp_dir, 'components', 'dep2')
      )).to.not.equal(true, 'Mixed up copy parameters')
    })
  })

  it('should copy dependency sources to a subfolder in parent source', function() {
    return pack({
      cwd: dir
    }).then(function() {
      expect(mockfs.copy.called).to.equal(true, 'Copy not called')
      expect(mockfs.copy.calledWith(
        path.join(dir, temp_dir, 'roku_modules', 'dep1', 'source'),
        path.join(dir, temp_dir, 'source', 'dep1')
      )).to.equal(true, 'Incorrect dep1 copy parameters')

      expect(mockfs.copy.calledWith(
        path.join(dir, temp_dir, 'roku_modules', 'dep2', 'source'),
        path.join(dir, temp_dir, 'source', 'dep2')
      )).to.equal(true, 'Incorrect dep2 copy parameters')

      expect(mockfs.copy.calledWith(
        path.join(dir, temp_dir, 'roku_modules', 'dep1', 'source'),
        path.join(dir, temp_dir, 'source', 'dep2')
      )).to.not.equal(true, 'Mixed up copy parameters')
    })
  })

  it('should create zip archive output', function() {
    var zipArchive = path.join(dir, 'rpm_archive.zip')

    return pack({
      cwd: dir
    }).then(function() {
      expect(mockfs.createWriteStream.called).to.equal(true, 'Write stream not created')
      expect(mockfs.createWriteStream.calledWith(zipArchive)).to.equal(true, 'Write stream location not correct')
    })
  })

  describe('archive settings', function() {
    var output, pipeSpy, globSpy
    beforeEach(function() {
      output = {
        on: function(event, cb) {
          if (event === 'close') {
            process.nextTick(cb)
          }
        }
      }

      mockfs.createWriteStream = function() {
        return output
      }

      pipeSpy = sinon.spy()
      globSpy = sinon.spy()

      mockArchiver = function() {
        return {
          on: function() { },
          pointer: function() {
            return 15
          },
          pipe: pipeSpy,
          glob: globSpy,
          finalize: function() { }
        }
      }
    })

    it('should pipe temp directory to archive', function() {
      return pack.__with__({
        archiver: mockArchiver
      })(function() {
        return pack({
          cwd: dir
        }).then(function() {
          expect(pipeSpy.called).to.equal(true, 'Did not call pipe')
          expect(pipeSpy.calledWith(output)).to.equal(true, 'Did not pipe archive to output')
        })
      })
    })

    it('should glob all temp dir contents', function() {
      return pack.__with__({
        archiver: mockArchiver
      })(function() {
        return pack({
          cwd: dir
        }).then(function() {
          expect(globSpy.called).to.equal(true, 'Did not call glob')
          expect(globSpy.calledWith('**')).to.equal(true, 'Did not glob all content')
        })
      })
    })

    it('should filter globbed contents to ignore self', function() {
      return pack.__with__({
        archiver: mockArchiver
      })(function() {
        return pack({
          cwd: dir
        }).then(function() {
          expect(globSpy.called).to.equal(true, 'Did not call pipe')
          expect(globSpy.args[0][1]).to.satisfy(function(options) {
            return typeof options !== 'undefined' && options != null
          }, 'Didn\'t include glob options')
          expect(globSpy.args[0][1].ignore).to.satisfy(function(ignore) {
            return typeof ignore !== 'undefined' && ignore != null
          }, 'Didn\'t include glob ignore patterns')
          expect(globSpy.args[0][1].ignore.indexOf('rpm_archive.zip')).to.not.equal(-1, 'Did not ignore self')
        })
      })
    })

    it('should filter globbed contents to ignore roku_modules', function() {
      return pack.__with__({
        archiver: mockArchiver
      })(function() {
        return pack({
          cwd: dir
        }).then(function() {
          expect(globSpy.called).to.equal(true, 'Did not call pipe')
          expect(globSpy.args[0][1]).to.satisfy(function(options) {
            return typeof options !== 'undefined' && options != null
          }, 'Didn\'t include glob options')
          expect(globSpy.args[0][1].ignore).to.satisfy(function(ignore) {
            return typeof ignore !== 'undefined' && ignore != null
          }, 'Didn\'t include glob ignore patterns')
          expect(globSpy.args[0][1].ignore.indexOf('roku_modules/**')).to.not.equal(-1, 'Did not ignore roku_modules')
        })
      })
    })

    it('should filter globbed contents to ignore patterns if provided in options', function() {
      return pack.__with__({
        archiver: mockArchiver
      })(function() {
        return pack({
          cwd: dir,
          ignore: ['out', 'node_modules']
        }).then(function() {
          expect(globSpy.called).to.equal(true, 'Did not call pipe')
          expect(globSpy.args[0][1]).to.satisfy(function(options) {
            return typeof options !== 'undefined' && options != null
          }, 'Didn\'t include glob options')
          expect(globSpy.args[0][1].ignore).to.satisfy(function(ignore) {
            return typeof ignore !== 'undefined' && ignore != null
          }, 'Didn\'t include glob ignore patterns')
          expect(globSpy.args[0][1].ignore.indexOf('out')).to.not.equal(-1, 'Did not ignore option \'out\'')
          expect(globSpy.args[0][1].ignore.indexOf('node_modules')).to.not.equal(-1, 'Did not ignore option \'node_modules\'')
        })
      })
    })
  })

  it('should remove temporary directory when finished', function() {
    return pack({
      cwd: dir
    }).then(function() {
      expect(mockfs.remove.called).to.equal(true, 'Did not call remove')
      expect(mockfs.remove.calledWith(path.join(dir, temp_dir))).to.equal(true, 'Incorrect remove location')
    })
  })

  it('should remove temporary directory even on error', function() {
    mockfs.copy = function() {
      return Promise.reject()
    }
    return pack({
      cwd: dir
    }).then(function() {
      expect(mockfs.remove.called).to.equal(true, 'Did not call remove')
      expect(mockfs.remove.calledWith(path.join(dir, temp_dir))).to.equal(true, 'Incorrect remove location')
    })
  })
})
