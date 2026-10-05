const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const event = require('codeceptjs').event
const tesults = require('tesults')
const packageVersion = require('./package.json').version
const reporter = require('./codeceptjs-tesults')

const originalOutputFile = process.env.TESULTS_OUTPUT_FILE
const originalResults = tesults.results
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codeceptjs-tesults-'))

let uploads = []

const cleanEventDispatcher = () => {
    for (const group of ['test', 'suite', 'step', 'all']) {
        for (const eventName of Object.values(event[group] || {})) {
            event.dispatcher.removeAllListeners(eventName)
        }
    }
}

const reset = () => {
    cleanEventDispatcher()
    delete process.env.TESULTS_OUTPUT_FILE
    uploads = []
    tesults.results = (data, callback) => {
        uploads.push(data)
        callback(null, {
            success: true,
            message: 'mock upload',
            warnings: [],
            errors: []
        })
    }
}

const emitTest = (overrides = {}, options = {}) => {
    const test = Object.assign({
        id: 'test-1',
        parent: { title: 'Checkout' },
        title: 'completes an order',
        state: 'passed',
        body: 'test body',
        _currentRetry: 0,
        file: '/tests/checkout_test.js',
        tags: ['@smoke'],
        startedAt: 1234,
        artifacts: {
            screenshot: '/artifacts/screenshot.png'
        },
        steps: [{
            name: 'see confirmation',
            status: 'success',
            startTime: 10,
            endTime: 20,
            duration: 10,
            toCode: () => 'I.see("Order confirmed")',
            line: () => 'checkout_test.js:12'
        }]
    }, overrides)

    event.dispatcher.emit(event.test.started, test)
    event.dispatcher.emit(event.step.comment, 'tesults:file:/artifacts/order.json')

    if (test.state === 'failed' || options.failure) {
        event.dispatcher.emit(event.test.failed, test, new Error('payment rejected'))
    }

    event.dispatcher.emit(event.test.finished, test)
    return test
}

try {
    reset()
    reporter({ target: 'token' })
    emitTest({ state: 'failed' })
    event.dispatcher.emit(event.all.after)

    assert.strictEqual(uploads.length, 1)
    assert.strictEqual(uploads[0].target, 'token')
    assert.deepStrictEqual(uploads[0].metadata, {
        integration_name: 'codeceptjs-tesults',
        integration_version: packageVersion,
        test_framework: 'codeceptjs'
    })
    assert.strictEqual(uploads[0].results.cases.length, 1)
    assert.deepStrictEqual(uploads[0].results.cases[0], {
        suite: 'Checkout',
        name: 'completes an order',
        result: 'fail',
        rawResult: 'failed',
        reason: 'Error: payment rejected',
        start: 1234,
        end: uploads[0].results.cases[0].end,
        steps: [{
            name: 'see confirmation',
            result: 'pass',
            rawResult: 'success',
            start: 10,
            end: 20,
            duration: 10,
            desc: 'I.see("Order confirmed") checkout_test.js:12'
        }],
        _Test: 'test body',
        '_Current Retry': 0,
        '_Test File': '/tests/checkout_test.js',
        _Tags: ['@smoke'],
        files: ['/artifacts/screenshot.png', '/artifacts/order.json']
    })
    assert.strictEqual(typeof uploads[0].results.cases[0].end, 'number')

    reset()
    reporter({ target: 'token' })
    emitTest({ state: undefined }, { failure: true })
    event.dispatcher.emit(event.all.after)
    assert.strictEqual(uploads[0].results.cases[0].result, 'fail')
    assert.strictEqual(uploads[0].results.cases[0].rawResult, 'failed')

    reset()
    const outputOnlyFile = path.join(temporaryDirectory, 'nested', 'results.json')
    process.env.TESULTS_OUTPUT_FILE = outputOnlyFile
    reporter({
        'build-name': 'build-42',
        'build-result': 'pass',
        'build-description': 'main branch',
        'build-reason': 'completed',
        'build-files': ['/artifacts/build.log']
    })
    emitTest()
    event.dispatcher.emit(event.all.after)

    assert.strictEqual(uploads.length, 0)
    const outputOnlyData = JSON.parse(fs.readFileSync(outputOnlyFile, 'utf8'))
    assert.strictEqual(outputOnlyData.target, '')
    assert.strictEqual(outputOnlyData.metadata.integration_version, packageVersion)
    assert.deepStrictEqual(outputOnlyData.results.cases[0], {
        name: 'build-42',
        suite: '[build]',
        result: 'pass',
        desc: 'main branch',
        reason: 'completed',
        files: ['/artifacts/build.log']
    })
    assert.strictEqual(outputOnlyData.results.cases[1].result, 'pass')

    reset()
    const combinedFile = path.join(temporaryDirectory, 'combined.json')
    process.env.TESULTS_OUTPUT_FILE = combinedFile
    reporter({ target: 'combined-token' })
    emitTest()
    event.dispatcher.emit(event.all.after)

    assert.strictEqual(uploads.length, 1)
    assert.strictEqual(uploads[0].target, 'combined-token')
    assert.strictEqual(JSON.parse(fs.readFileSync(combinedFile, 'utf8')).target, '')

    reset()
    process.env.TESULTS_OUTPUT_FILE = '   '
    reporter({})
    emitTest()
    event.dispatcher.emit(event.all.after)
    assert.strictEqual(uploads.length, 0)

    reset()
    process.env.TESULTS_OUTPUT_FILE = temporaryDirectory
    reporter({})
    emitTest()
    assert.throws(
        () => event.dispatcher.emit(event.all.after),
        /EISDIR|illegal operation on a directory|is a directory/i
    )

    console.log('All CodeceptJS Tesults reporter tests passed.')
} finally {
    cleanEventDispatcher()
    tesults.results = originalResults
    if (originalOutputFile === undefined) {
        delete process.env.TESULTS_OUTPUT_FILE
    } else {
        process.env.TESULTS_OUTPUT_FILE = originalOutputFile
    }
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
}
