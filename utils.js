var fs = require('fs')
var lodashForEach = require('lodash.foreach')

function RpmError(options) {
  options = options || {}

  this.name = options.name || "RpmError"
  this.type = options.type || "RpmError"
  this.message = options.message || "An error occurred"
  this.innerError = options.innerError

  Error.captureStackTrace(this)
}

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

function readDir(path) {
  var i = arguments.length;
  var args = [];
  while (i--) args[i] = arguments[i];

  return new Promise(function(resolve, reject) {
    args.push(function(err, contents) {
      if (err) {
        return reject(err)
      }

      return resolve(contents)
    })
    return fs.readdir.apply(fs, args)
  })
}

function readFile() {
  var i = arguments.length;
  var args = [];
  while (i--) args[i] = arguments[i];

  return new Promise(function(resolve, reject) {
    args.push(function(err, contents) {
      if (err) {
        return reject(err)
      }

      return resolve(contents)
    })
    return fs.readFile.apply(fs, args)
  })
}

function Logger(debug) {
  return {
    log: function() {
      if (debug) {
        console.log.apply(console, arguments)
      }
    },
    warn: function() {
      if (debug) {
        console.warn.apply(console, arguments)
      }
    },
    error: function() {
      if (debug) {
        console.error.apply(console, arguments)
      }
    }
  }
}

var utils = {
  RpmError: RpmError,
  stat: stat,
  Logger: Logger,
  readDir: readDir,
  readFile: readFile,
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
    if (typeof cwd !== 'undefined' && cwd !== null) {
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

lodashForEach(exists, function(thingType) {
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
