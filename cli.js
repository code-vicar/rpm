#!/usr/bin/env node

var path = require('path')
var program = require('commander')

var cmds = require('./index.js')
var info = require('./package.json')

program.version(info.version)
  .option('-d, --dir <dir>', 'set the cwd')

// program
//     .command('deploy')
//     .arguments('<ipaddress> <packagepath>')
//     .description('deploy roku app')
//     .action(function(ipaddress, packagepath) {
//         var cwd = getCwd();
//         return cmds.deploy({cwd: cwd, ipaddress: ipaddress, packagepath: packagepath}).then(function(results) {
//           if (results) {
//             console.log('Success')
//             return 0;
//           }
//           console.log('Failure')
//           return 1;
//         })
//     })
//
program
  .command('install')
  .description('download dependencies')
  .action(function() {
    var cwd = getCwd()
    return cmds.install({ cwd: cwd }).then(function(results) {
      var count = results.length

      console.log('Installed ' + count + ' dependencies')
    }).catch(function(err) {
      if (err) {
        if (err.message) {
          console.error(err.message)
        }
        if (err.innerError && err.innerError.message) {
          console.error('innerError', err.innerError.message)
        }
      }
    })
  })
//
// program
//     .command('pack')
//     .description('pack and create a zip of the application')
//     .action(function() {
//         var cwd = getCwd()
//         return cmds.pack({cwd: cwd}).then(function(results) {
//             console.log('results')
//         })
//     })

function getCwd() {
  var cwd = process.cwd()

  if (program.dir) {
    cwd = path.resolve(cwd, program.dir)
  }

  return cwd
}

program.parse(process.argv)
