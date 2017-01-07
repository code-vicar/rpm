var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');

var install = rewire('../cmds/install');

var mockAddRemoteGit = sinon.spy();

install.__set__('addRemoteGit', mockAddRemoteGit);

describe('install', function () {
  it('should throw error if cwd is invalid', function (done) {
    install({
      cwd: 'blah'
    }).then(function () {
      done(new Error('Should not succeed'));
    }).catch(function (err) {
      expect(err).to.exist;
      expect(err.message).to.not.equal('Should not succeed');
      done();
    })
  })

  describe('parsePackageInfo', function () {
    it('should parse package info file', function (done) {
      done('err');
    })
  })

  describe('cloneMissingDeps', function () {
    it('should clone missing deps', function (done) {
      done('err');
    })
  })

  describe('pullLatestExistingDeps', function () {
    it('should pull latest for existing deps', function (done) {
      done('err');
    })
  })

  describe('removeExtraneusDeps', function () {
    it('should remove folders that aren\'t listed as dependencies', function (done) {
      done('err');
    })
  })
})
