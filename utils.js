var fs = require('fs')
var _ = require('lodash')

function stat(path) {
  return new Promise(function(resolve, reject) {
    return fs.stat(path, function(err, stats) {
      if (err) {
        return reject(err)
      }

      resolve(stats)
    })
  })
}

var utils = {
  stat: stat,
  cp: function cp(srcFile, outFile) {
    return new Promise(function(resolve, reject) {
      var readStream = fs.createReadStream(srcFile)
      var writeStream = fs.createWriteStream(outFile)

      readStream.pipe(writeStream)

      readStream.on('error', function(err) {
        reject(err)
      })

      writeStream.on('error', function(err) {
        reject(err)
      })

      readStream.on('end', function() {
        resolve()
      })
    })
  },
  validateDirectory: function validateDirectory(cwd) {
    if (!_.isNil(cwd)) {
      return stat(cwd).then(function(cwdStats) {
        if (!cwdStats.isDirectory()) {
          throw new Error('Invalid cwd option')
        }
        return cwd
      })
    } else {
      return Promise.resolve(process.cwd())
    }
  }
}

var exists = [
  'File',
  'Directory'
]

_.forEach(exists, function(thingType) {
  utils['does' + thingType + 'AlreadyExist'] = function(thing) {
    return stat(thing).then(function(stats) {
      return stats['is' + thingType]()
    }).catch(function(err) {
      if (err && err.code === 'ENOENT') {
        return false
      }
      throw err
    })
  }
})

module.exports = utils
