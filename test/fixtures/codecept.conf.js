const path = require('path')

exports.config = {
    name: 'codeceptjs-tesults-fixture',
    tests: './*_test.js',
    output: process.env.CODECEPT_OUTPUT_DIR,
    helpers: {},
    include: {},
    plugins: {
        tesults: {
            require: path.resolve(__dirname, '../../codeceptjs-tesults.js'),
            enabled: true,
            ...(process.env.TESULTS_TARGET_TOKEN
                ? { target: process.env.TESULTS_TARGET_TOKEN }
                : {})
        }
    }
}
