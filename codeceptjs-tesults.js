// codeceptjs-tesults.js
const tesults = require('tesults')
const event = require('codeceptjs').event
 
module.exports = (config) => {
    let disabled = false
    if (config.target === undefined) {
        disabled = true
        console.log("Tesults disabled. No target supplied in config.")
    }

    const data = {
        results: {
            cases: []
        },
        target: config.target,
        metadata: {
            integration_name: "codeceptjs-tesults",
            integration_version: "1.2.0",
            test_framework: "codeceptjs"
        }
    }

    // Build case
    if (config["build-name"] !== undefined) {
        try {
            let buildCase = {
                name: config["build-name"],
                suite: "[build]",
                result: config["build-result"] === undefined ? "unknown" : config["build-result"],
                desc: config["build-description"],
                reason: config["build-reason"],
                files: config["build-files"]
            }
            data.results.cases.push(buildCase)
        } catch (err) {
            // Omit build case
        }
    }

    const result = (codecept_result) => {
        if (codecept_result === "passed" || codecept_result === "success") {
            return "pass"
        } else if (codecept_result === "failed") {
            return "fail"
        } else {
            return "unknown"
        }
    }

    let comments = []
    event.dispatcher.on(event.test.started, (test) => {
        comments = []
    })

    event.dispatcher.on(event.step.comment, (step) => {
        comments.push(step)
    })

    const reasons = {}
    event.dispatcher.on(event.test.failed, (test, error) => {
        if (disabled) { return }
        try {
            if (JSON.stringify(error) === "{}") {
                reasons[test.id] = error.toString()
            } else {
                reasons[test.id] = JSON.stringify(error)
            }
        } catch (err) {
            reasons[test.id] = error
        }
    })

    event.dispatcher.on(event.test.finished, (test) => {
        if (disabled) { return }
        // Core Properties
        let testCase = {
            suite: test.parent.title,
            name: test.title,
            result: result(test.state),
            rawResult: test.state
        }
        // Reason
        if (reasons[test.id] !== undefined) {
            testCase.reason = reasons[test.id]
        }
        // Start / End
        if (test.startedAt !== undefined) {
            testCase.start = test.startedAt
            testCase.end = Date.now()
        }
        // Steps
        if (test.steps !== undefined) {
            if (Array.isArray(test.steps)) {
                testCase.steps = []
                for (let i = 0; i < test.steps.length; i++) {
                    let step = test.steps[i]
                    let testCaseStep = {
                        name: step.name,
                        result: result(step.status),
                        rawResult: step.status,
                        start: step.startTime,
                        end: step.endTime,
                        duration: step.duration
                    }
                    try {
                        testCaseStep.desc = step.toCode() + " " + step.line()
                        testCase.steps.push(testCaseStep)
                    } catch (err) {// Omit desc}
                        testCase.steps.push(testCaseStep)
                    }
                }
            }
        }
        // Custom
        testCase["_Test"] = test.body
        testCase["_Current Retry"] = test._currentRetry
        testCase["_Test File"] = test.file
        testCase["_Tags"] = test.tags
        // Files
        let files = []
        if (test.artifacts !== undefined) {
            Object.keys(test.artifacts).forEach((key) => {
                files.push(test.artifacts[key])
            })
        }
        // Files
        // Original solution awaiting on resolution by codeceptjs to a potential bug in event emitter for artifacts, alternate added
        const filePrefix = "tesults:file:"
        for (let i = 0; i < comments.length; i++) {
            const c = comments[i]
            if (c.startsWith(filePrefix)) {
                files.push(c.substring(filePrefix.length))
            }
        }

        if (files.length > 0) {
            testCase.files = files
        }

        // Save
        data.results.cases.push(testCase)
    })

    event.dispatcher.on(event.all.after, () => {
        if (disabled) { return }
        console.log('Tesults results uploading...');
        tesults.results(data, function (err, response) {
            if (err) {
                console.log("Tesults library error: " + err)
            } else {
                console.log('Success: ' + response.success);
                console.log('Message: ' + response.message);
                console.log('Warnings: ' + response.warnings.length);
                console.log('Errors: ' + response.errors.length);
            }
        });
    })
}