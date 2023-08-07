import { Session } from 'node:inspector'
import { promisify } from 'node:util'
import { v1 as uuid } from 'uuid'

export class Fnlocation {
  static instance = null

  session

  sessionPost

  PREFIX = '__functionlocation__'

  scripts = {}

  constructor () {
    if (!Fnlocation.instance) {
      this.init()
      Fnlocation.instance = this
    }

    return Fnlocation.instance
  }

  init() {
    if (!global[this.PREFIX]) {
      global[this.PREFIX] = {}
    }

    if (this.session) {
      return
    }

    this.session = new Session()
    this.sessionPost = promisify(this.session.post).bind(this.session)

    this.session.connect()

    this.session.on('Debugger.scriptParsed', res => {
      // {
      //   method: 'Debugger.scriptParsed',
      //   params: {
      //     scriptId: '4471',
      //     url: 'file:///D:/foo/bar/baz.ts',
      //     startLine: 0,
      //     startColumn: 0,
      //     endLine: 225,
      //     endColumn: 14188,
      //     executionContextId: 1,
      //     hash: '02de051f345d96450fa99dc745759a9109a36b99',
      //     executionContextAuxData: { isDefault: true },
      //     isLiveEdit: false,
      //     sourceMapURL: 'data:application/json;charset=utf-8;base64,eyJ2ZXJ',
      //     hasSourceURL: false,
      //     isModule: false,
      //     length: 22518,
      //     stackTrace: { callFrames: [Array], parentId: [Object] },
      //     scriptLanguage: 'JavaScript',
      //     embedderName: 'file:///D:/foo/bar/baz.ts'
      //   }
      // }
      if (!res.params?.url) return
      // console.log('Debugger.scriptParsed', res)
      // console.count('scriptParsed')

      this.scripts[res.params.scriptId] = res.params // 保存脚本信息
    })

    // 通知 inspector 开启 debugger 模式, 这里会等待 inspector 读取解析完成所有脚本后,才会继续往后执行,
    // 所以 this.session.on('Debugger.scriptParsed', callback) 中的所有 callback 都触发完毕后,
    // this.session.post('Debugger.enable') 下一行的代码才会执行
    this.session.post('Debugger.enable')
    // console.log('所有脚本都已解析完')
    Fnlocation.instance = this
  }

  async scriptPath(target) {
    const id = uuid()
    global[this.PREFIX][id] = target
    // 1.在检查器中 读取 target对象, 获取 target 对象的 objectId,
    // 2.通过 objectId 获取 scriptId
    // 3.通过 scriptId 获取 脚本的 url 等具体信息
    const evaluated = await this.sessionPost(
      'Runtime.evaluate',
      {
        expression: `global['${this.PREFIX}']['${id}']`,
        // 当我们在执行 Runtime.evaluate 方法时，如果指定了 objectGroup 参数，那么在执行过程中创建的所有对象都会被分配到该分组中。
        // 这样一来，我们可以通过 objectGroup 参数来识别和区分不同执行过程中创建的对象。这在执行多次代码片段并需要对每次执行结果进行区分时非常有用。
        // 我们这里 都保存到 同一个分组(`this.PREFIX`)中,方便 clean 时候,统一销毁,释放内存
        objectGroup: this.PREFIX
      }
    )
    // evaluated
    // {
    //   result: {
    //     type: 'function',
    //     className: 'Function',
    //     description: 'class Foo {\r\n}',
    //     objectId: '-5665471033558134177.1.1'
    //   }
    // }

    const properties = await this.sessionPost(
      'Runtime.getProperties',
      { objectId: evaluated.result.objectId }
    )
    // properties
    // {
    //   result: [...],
    //   internalProperties: [
    //     { name: '[[FunctionLocation]]', value: [Object] },
    //     { name: '[[Prototype]]', value: [Object] },
    //     { name: '[[Scopes]]', value: [Object] }
    //   ]
    // }

    const location = properties.internalProperties.find(prop => prop.name === '[[FunctionLocation]]')
    // location
    // {
    //   name: '[[FunctionLocation]]',
    //   value: {
    //     type: 'object',
    //     subtype: 'internal#location',
    //     value: { scriptId: '3872', lineNumber: 3, columnNumber: 0 },
    //     description: 'Object'
    //   }
    // }
    const scriptId = location.value.value.scriptId
    const script = this.scripts[scriptId]

    delete global[this.PREFIX][id];

    let source = decodeURI(script.url)
    if (!source.startsWith('file://')) {
      source = `file://${source}`
    }
    return {
      column: location.value.value.columnNumber + 1,
      line: location.value.value.lineNumber + 1,
      path: source.slice(7),
      source,
    }
  }

  async clean() {
    if (this.session) {
      // 释放在执行过程中创建的所有对象
      // https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-releaseObjectGroup
      await this.sessionPost(
        'Runtime.releaseObjectGroup',
        {
          objectGroup: this.PREFIX
        }
      )
      this.session.disconnect()
    }

    this.session = null
    this.sessionPost = null
    this.scripts = {}
    delete global[this.PREFIX]
    Fnlocation.instance = null
  }
}


export default new Fnlocation()



