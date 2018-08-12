#!/usr/bin/env node
const {spawn} = require('child_process')
const path = require('path')
const sw = require('../../')

sw([require.resolve('./test-shim.js')])

spawn(path.resolve(process.argv[2]), process.argv.slice(3), {
  stdio: 'inherit'
}).on('close', function (code, signal) {
  if (code || signal) {
    throw new Error('failed with ' + (code || signal))
  }

  // now run using PATH
  process.env.PATH = path.resolve(path.dirname(process.argv[2])) +
    ':' + process.env.PATH

  spawn(path.basename(process.argv[2]), process.argv.slice(3), {
    stdio: 'inherit'
  }, function (code, signal) {
    if (code || signal) {
      throw new Error('failed with ' + (code || signal))
    }
  })
})
