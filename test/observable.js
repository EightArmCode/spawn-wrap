const spawnWrap = require('../')

const ECHO_ARGS = require.resolve('./fixtures/echo-args.js')
const NESTED_SYNC = require.resolve('./fixtures/nested/nested-sync-0.js')

spawnWrap
  .observeSpawn(process.execPath, [NESTED_SYNC])
  .subscribe((ev) => {
    console.log('Intercepted a Node process spawn!')
    console.log(ev.args)
    ev.voidSpawn([...ev.args, 'extra'])
  })
