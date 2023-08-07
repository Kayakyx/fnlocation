import test from 'ava'
import fnlocation from '../src/index.js'

test.serial('function location', async t => {
  const sayHello = function () { console.log('hello') }

  const sayHelloPath = await fnlocation.scriptPath(sayHello)
  t.deepEqual(sayHelloPath.path.split('/').slice(-2), ['test', 'test.js'])
})

test.serial('class location', async t => {
  class Foo { }

  const fooPath = await fnlocation.scriptPath(Foo)
  t.deepEqual(fooPath.path.split('/').slice(-2), ['test', 'test.js'])
})

test.serial('function location clean', async t => {
  t.true(Object.keys(fnlocation.scripts).length > 1)
  await fnlocation.clean()

  fnlocation.init()
  t.true(Object.keys(fnlocation.scripts).length > 1)
  await fnlocation.clean()
})
