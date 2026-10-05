Feature('Tesults reporter fixture')

Scenario('reports a passing scenario', ({ I }) => {
    I.say('tesults:file:/tmp/codeceptjs-tesults-attachment.txt')
})

Scenario('reports a failing scenario', () => {
    throw new Error('intentional fixture failure')
})
