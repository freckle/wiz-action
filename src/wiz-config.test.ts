import {parseWizIdP} from './wiz-config.js'

describe('parseWizIdP', () => {
  it('parses auth0', () => {
    expect(parseWizIdP('auth0')).toBe('auth0')
  })

  it('parses cognito', () => {
    expect(parseWizIdP('cognito')).toBe('cognito')
  })

  it('is case-insensitive', () => {
    expect(parseWizIdP('Auth0')).toBe('auth0')
    expect(parseWizIdP('COGNITO')).toBe('cognito')
  })

  it('throws for any other IdP', () => {
    expect(() => parseWizIdP('okta')).toThrow('Invalid Wiz IdP: okta. Must be Auth0 or Cognito.')
  })
})
