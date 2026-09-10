import * as core from '@actions/core'
import * as fs from 'fs'
import * as scanResult from './scan-result.js'
import type {WizIdP} from './wiz-config.js'

// Only HttpClient is mocked; the real core.summary is used to assert on
// rendered summary HTML below.
const {post} = vi.hoisted(() => ({post: vi.fn()}))

vi.mock('@actions/http-client', () => ({
  HttpClient: class {
    post = post
  }
}))

beforeEach(() => {
  core.summary.emptyBuffer()
})

test('Failed with cpes and osPackages', () => {
  const body = fs.readFileSync('test/scan-results/statsd.json').toString()
  const result = scanResult.parse(body)

  expect(result.analytics.vulnerabilities.criticalCount).toBe(193)
  expect(result.cpes?.length).toBe(1)
  expect(result.osPackages?.length).toBe(215)

  const summary = scanResult.buildSummary('statsd/statsd', 'abc123', result).stringify()

  expect(summary).toBe(
    `<h1>❌ statsd/statsd failed some policies</h1>
<ul><li><strong>Default vulnerabilities policy</strong>: This image contains 193 CRITICAL vulnerabilities (with fixes), which is greater than the policy threshold (1)</li></ul>
<a href="https://app.wiz.io/reports/cicd-scans#~(cicd_scan~'abc123)">View report on Wiz</a>
`
  )
})

test('Passed with osPackages', () => {
  const body = fs.readFileSync('test/scan-results/statsd-passed.json').toString()
  const result = scanResult.parse(body)

  expect(result.analytics.vulnerabilities.criticalCount).toBe(1)
  expect(result.cpes).toBeNull()
  expect(result.osPackages?.length).toBe(164)

  const summary = scanResult.buildSummary('statsd/statsd', 'abc123', result).stringify()

  // See https://github.com/actions/toolkit/issues/1567 about the extra <ul>
  expect(summary).toBe(
    `<h1>✅ statsd/statsd passed all policies</h1>
<ul>
<a href="https://app.wiz.io/reports/cicd-scans#~(cicd_scan~'abc123)">View report on Wiz</a>
`
  )
})

describe('fetch', () => {
  const SCAN_ID = '8221aac6-eae9-4867-bbb6-91fbd1092f45'
  const ENDPOINT = 'https://api.us19.app.wiz.io/graphql'

  const RESULT_JSON = {
    analytics: {
      vulnerabilities: {
        criticalCount: 0,
        highCount: 0,
        infoCount: 0,
        lowCount: 0,
        mediumCount: 0,
        unfixedCount: 0
      }
    },
    failedPolicyMatches: null,
    applications: null,
    cpes: null,
    libraries: null,
    osPackages: null,
    secrets: null
  }

  function mockResponses() {
    post
      .mockResolvedValueOnce({readBody: async () => JSON.stringify({access_token: 'token'})})
      .mockResolvedValueOnce({
        readBody: async () => JSON.stringify({data: {cicdScan: {resultJSON: RESULT_JSON}}})
      })
  }

  beforeEach(() => {
    process.env.WIZ_CLIENT_ID = 'client-id'
    process.env.WIZ_CLIENT_SECRET = 'client-secret'
  })

  it('authenticates against Cognito, then queries the scan', async () => {
    mockResponses()

    expect(await scanResult.fetch(SCAN_ID, ENDPOINT, 'cognito')).toEqual(RESULT_JSON)

    expect(post).toHaveBeenNthCalledWith(
      1,
      'https://auth.app.wiz.io/oauth/token',
      'grant_type=client_credentials&client_id=client-id&client_secret=client-secret&audience=wiz-api',
      {'content-type': 'application/x-www-form-urlencoded'}
    )

    expect(post).toHaveBeenNthCalledWith(
      2,
      ENDPOINT,
      JSON.stringify({query: `query{cicdScan(id:"${SCAN_ID}"){resultJSON}}`}),
      {
        authorization: 'bearer token',
        accept: 'application/json',
        'content-type': 'application/json'
      }
    )
  })

  it('authenticates against Auth0 when asked to', async () => {
    mockResponses()

    await scanResult.fetch(SCAN_ID, ENDPOINT, 'auth0')

    expect(post).toHaveBeenNthCalledWith(
      1,
      'https://auth.wiz.io/oauth/token',
      expect.stringContaining('audience=beyond-api'),
      expect.anything()
    )
  })

  it('rejects an IdP it has no host for', async () => {
    await expect(scanResult.fetch(SCAN_ID, ENDPOINT, 'okta' as WizIdP)).rejects.toThrow(
      'Unexpected IdP okta, must be Auth0 or Cognito'
    )
  })

  it.each(['WIZ_CLIENT_ID', 'WIZ_CLIENT_SECRET'])('requires %s to be set', async name => {
    delete process.env[name]

    await expect(scanResult.fetch(SCAN_ID, ENDPOINT, 'cognito')).rejects.toThrow(
      'the WIZ_CLIENT_ID and WIZ_CLIENT_SECRET environment variables must be set'
    )
  })
})

describe('buildSummary', () => {
  function resultWithPolicy(severity: string, count: number) {
    return {
      analytics: {
        vulnerabilities: {
          criticalCount: 0,
          highCount: 0,
          infoCount: 0,
          lowCount: 0,
          mediumCount: 0,
          unfixedCount: 0,
          [`${severity.toLowerCase()}Count`]: count
        }
      },
      failedPolicyMatches: [
        {
          policy: {
            name: `${severity} policy`,
            description: '',
            params: {
              ignoreUnfixed: false,
              packageAllowList: [],
              packageCountThreshold: 1,
              severity
            }
          }
        }
      ],
      applications: null,
      cpes: null,
      libraries: null,
      osPackages: null,
      secrets: null
    } as unknown as scanResult.ScanResult
  }

  // scanAnalyticsCount reads a different analytics field per severity
  it.each([
    ['INFO', 2],
    ['LOW', 3],
    ['MEDIUM', 4],
    ['HIGH', 5],
    ['CRITICAL', 6]
  ])('reports the %s count from analytics', (severity, count) => {
    const summary = scanResult
      .buildSummary('myimage', 'abc123', resultWithPolicy(severity, count))
      .stringify()

    expect(summary).toContain(`contains ${count} ${severity} vulnerabilities,`)
  })
})
