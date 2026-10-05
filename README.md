# CodeceptJS Tesults Plugin

Upload CodeceptJS test results to [Tesults](https://www.tesults.com), or write them to a file for the Tesults test automation reporting GitHub Action.

## Installation

```sh
npm install --save-dev codeceptjs-tesults
```

## Direct upload

Add the plugin and your Tesults target token to `codecept.conf.js`:

```js
exports.config = {
  // ...
  plugins: {
    tesults: {
      require: 'codeceptjs-tesults',
      enabled: true,
      target: 'token'
    }
  }
}
```

Run CodeceptJS normally. The plugin uploads the completed run to Tesults.

## GitHub Actions output

Set `TESULTS_OUTPUT_FILE` to write the completed Tesults payload locally. A target token is not required in the CodeceptJS configuration for this mode.

```yaml
- name: Set up test automation reporting
  uses: tesults/test-automation-reporting@v1

- name: Run CodeceptJS tests
  run: npx codeceptjs run
```

The action supplies `TESULTS_OUTPUT_FILE` to the later test step and renders the report after the job completes. No Tesults token or account is required.

When both `target` and `TESULTS_OUTPUT_FILE` are provided, the plugin writes the local file and retains the existing direct upload behavior. The local file always contains an empty target so credentials are never written into the artifact.

## Attachments

Add a file to the current test with an `I.say` comment containing an absolute path:

```js
I.say('tesults:file:/full/path/to/screenshot.png')
```

CodeceptJS artifacts are also included when they are available on the test object.

## Build result

The plugin continues to support optional build fields in its configuration:

```js
tesults: {
  require: 'codeceptjs-tesults',
  enabled: true,
  target: 'token',
  'build-name': 'build-42',
  'build-result': 'pass',
  'build-description': 'main branch',
  'build-reason': 'completed',
  'build-files': ['/full/path/to/build.log']
}
```

For all configuration details, see the [CodeceptJS integration documentation](https://www.tesults.com/docs/codeceptjs).

## Testing

```sh
npm test
```

## Support

Email help@tesults.com.
