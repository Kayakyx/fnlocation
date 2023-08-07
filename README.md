# Getting the location of a function in a file in Node

## Usage

```javascript
// src/test/test.js
import fnlocation from 'fnlocation'

const sayHello = function () { console.log('hello') }

const sayHelloPath = await fnlocation.scriptPath(sayHello)
console.log(sayHelloPath)
// {
//   column: 1,
//   line: 3,
//   path: '/you/path/src/test.test.js'
//   source: 'file:///you/path/src/test.test.js'
// }

```
When the function location is no longer queried, call the `clean` method to release all remote objects
```javascript
// ...
;(async () => {
  await fnlocation.clean()
// ...
})()
```

You can initialize it by calling the `init` method when you query it again.

```javascript
// ...
;(async () => {
  fnlocation.init()

// ...
// await fnlocation.scriptPath(xxx)
})()

```
