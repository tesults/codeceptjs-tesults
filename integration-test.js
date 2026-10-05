const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const packageVersion = require('./package.json').version
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'codeceptjs-tesults-integration-'))
const outputFile = path.join(temporaryDirectory, 'nested', 'results.json')
const codeceptBinary = path.join(path.dirname(require.resolve('codeceptjs')), '..', 'bin', 'codecept.js')
const fixtureDirectory = path.join(__dirname, 'test', 'fixtures')

try {
    const run = spawnSync(
        process.execPath,
        [codeceptBinary, 'run', '--config', path.join(fixtureDirectory, 'codecept.conf.js')],
        {
            cwd: fixtureDirectory,
            env: Object.assign({}, process.env, {
                CODECEPT_OUTPUT_DIR: path.join(temporaryDirectory, 'codecept-output'),
                TESULTS_OUTPUT_FILE: outputFile
            }),
            encoding: 'utf8'
        }
    )

    assert.strictEqual(
        run.status,
        1,
        `Expected the fixture's intentional failure to exit 1.\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`
    )
    assert.ok(
        fs.existsSync(outputFile),
        `Expected the reporter output file.\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`
    )

    const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'))
    assert.strictEqual(data.target, '')
    assert.deepStrictEqual(data.metadata, {
        integration_name: 'codeceptjs-tesults',
        integration_version: packageVersion,
        test_framework: 'codeceptjs'
    })
    assert.strictEqual(data.results.cases.length, 2)

    const passed = data.results.cases.find(testCase => testCase.name === 'reports a passing scenario')
    const failed = data.results.cases.find(testCase => testCase.name === 'reports a failing scenario')

    assert.ok(passed)
    assert.strictEqual(passed.suite, 'Tesults reporter fixture')
    assert.strictEqual(passed.result, 'pass')
    assert.ok(passed.files.includes('/tmp/codeceptjs-tesults-attachment.txt'))

    assert.ok(failed)
    assert.strictEqual(failed.result, 'fail')
    assert.match(failed.reason, /intentional fixture failure/)

    console.log('CodeceptJS CLI integration test passed.')
} finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
}
