// 获取主入口文件
const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const babel = require('@babel/core')
const getModuleInfo = file => {
    const body = fs.readFileSync(file, 'utf-8')
    // console.log(body)
    // 分析模块
    const ast = parser.parse(body, {
        sourceType: 'module'  // 表示我们要解析的是ES5模块
    })
    // console.log(ast.program.body)
    // 收集依赖
    const deps = {}
    traverse(ast, {
        ImportDeclaration({node}) {
            const dirname = path.dirname(file)
            const abspath = './' + path.join(dirname, node.source.value)
            deps[node.source.value] = abspath
        }
    })
    // console.log(deps)
    // ES6转成ES5（AST）
    const { code } = babel.transformFromAst(ast, null, {
        presets: ['@babel/preset-env']
    })
    // console.log(code)
    const moduleInfo = {file, deps, code}
    return moduleInfo
}

// getModuleInfo('./src/index.js')

// 递归获取所有依赖
const parseModules = file => {
    const entry = getModuleInfo(file)
    const temp = [entry]
    const depsGraph = {}
    for (let i = 0; i < temp.length; i++) {
        const deps = temp[i].deps
        if (deps) {
            for (const key in deps) {
                if (deps.hasOwnProperty(key)) {
                    temp.push(getModuleInfo(deps[key]))
                }
            }
        }
    }
    // console.log(temp)
    temp.forEach(moduleInfo => {
        depsGraph[moduleInfo.file] = {
            deps: moduleInfo.deps,
            code: moduleInfo.code
        }
    })
    // console.log(depsGraph)
    return depsGraph
}
// parseModules('./src/index.js')

const bundle = file => {
    const depsGraph = JSON.stringify(parseModules(file))
    return `(function (graph) {
        function require(file) {
            function absRequire(relPath) {
                return require(graph[file].deps[relPath])
            }
            var exports = {};
            (function (require,exports,code) {
                eval(code)
            })(absRequire,exports,graph[file].code)
            return exports
        }
        require('${file}')
    })(${depsGraph})`

}
//写入到我们的dist目录下
fs.exists('./dist', (exists) => {
    if (exists) {
        fs.writeFileSync('./dist/bundle.js', content)
    } else {
        fs.mkdirSync('./dist');
        fs.writeFileSync('./dist/bundle.js', content)
    }
})

const content = bundle('./src/index.js')
// console.log(content)