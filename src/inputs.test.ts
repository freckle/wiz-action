import * as core from '@actions/core'

import {getInputs} from './inputs.js'

vi.mock('@actions/core')

function mockActionInputs(inputs: Record<string, string>) {
  vi.mocked(core.getInput).mockImplementation(name => inputs[name] ?? '')
  vi.mocked(core.getBooleanInput).mockImplementation(name => inputs[name] === 'true')
}

describe('getInputs', () => {
  it('reads every input', () => {
    mockActionInputs({
      'wiz-api-endpoint-url': 'https://api.us19.app.wiz.io/graphql',
      'wiz-api-idp': 'cognito',
      image: 'statsd/statsd:v0.9.0',
      'custom-policies': 'tvm_automation_policy',
      pull: 'true',
      fail: 'true'
    })

    expect(getInputs()).toEqual({
      wizApiEndpointUrl: 'https://api.us19.app.wiz.io/graphql',
      wizApiIdP: 'cognito',
      image: 'statsd/statsd:v0.9.0',
      customPolicies: 'tvm_automation_policy',
      pull: true,
      fail: true
    })
  })

  it('reads unset optional inputs as null', () => {
    mockActionInputs({
      'wiz-api-idp': 'auth0',
      image: 'myimage',
      pull: 'false',
      fail: 'false'
    })

    expect(getInputs()).toEqual({
      wizApiEndpointUrl: null,
      wizApiIdP: 'auth0',
      image: 'myimage',
      customPolicies: null,
      pull: false,
      fail: false
    })
  })

  it('rejects an invalid wiz-api-idp', () => {
    mockActionInputs({'wiz-api-idp': 'okta', image: 'myimage'})

    expect(() => getInputs()).toThrow('Invalid Wiz IdP: okta')
  })
})
