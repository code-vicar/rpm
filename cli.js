#!/usr/bin/env node

var path = require('path')
var program = require('commander')

var cmds = require('./index.js')
var info = require('./package.json')

program.version(info.version)
  .option('-d, --dir <dir>', 'set the cwd')
  .option('--debug', 'print debug messages')

program
  .command('deploy')
  .arguments('<ipaddress>')
  .option('-u, --user <user>', 'roku device user')
  .option('-p, --password <password>', 'roku device password')
  .description('deploy roku app')
  .action(function(ipaddress, options) {
    var cwd = getCwd();
    return cmds.deploy({
      cwd: cwd,
      debug: program.debug,
      ipaddress: ipaddress,
      user: options.user,
      password: options.password
    }).then(function(output) {
      console.log(output.msg)
      return 0;
    }).catch(function(err) {
      console.log('deploy command error')
      console.log(err)
      return 1;
    })
  })

program
  .command('install')
  .option('-H, --hard', 'copy installed modules into source and components folders')
  .description('download dependencies')
  .action(function(options) {
    var cwd = getCwd()
    return cmds.install({
      cwd: cwd,
      hard: options.hard,
      debug: program.debug
    }).then(function(results) {
      var count = results.length

      console.log('Installed ' + count + ' dependencies')
      return 0
    }).catch(function(err) {
      if (err) {
        if (err.message) {
          console.error(err.message)
        }
        if (err.innerError && err.innerError.message) {
          console.error('innerError', err.innerError.message)
        }
      }
      return 1
    })
  })

program
  .command('pack')
  .description('pack and create a zip of the application')
  .option('-i, --ignore <ignore>', 'patterns to exclude when creating archive')
  .action(function(options) {
    var cwd = getCwd()
    var ignore = parseIgnore(options)
    if (program.debug) {
      console.log('ignore', ignore)
    }
    return cmds.pack({
      cwd: cwd,
      debug: program.debug,
      ignore: ignore
    }).then(function() {
      console.log('Success')
      return 0
    }).catch(function(err) {
      if (err) {
        if (err.message) {
          console.error(err.message)
        }
        if (err.innerError && err.innerError.message) {
          console.error('innerError', err.innerError.message)
        }
      }
      return 1
    })
  })

function getCwd() {
  var cwd = process.cwd()

  if (program.dir) {
    cwd = path.resolve(cwd, program.dir)
  }

  return cwd
}

function parseIgnore(options) {
  if (!options || typeof options.ignore !== 'string') {
    return []
  }

  return options.ignore.split(',')
}

program.parse(process.argv)
