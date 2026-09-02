import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tc from '@actions/tool-cache'

import {getWizCLI, getWizInstallUrl, parseScanId} from './wiz-cli.js'

vi.mock('@actions/core')
vi.mock('@actions/exec')
vi.mock('@actions/tool-cache')

const SCAN_ID = '8221aac6-eae9-4867-bbb6-91fbd1092f45'

describe('parseScanId', () => {
  it('parses un-encoded scan-id URLs', () => {
    const scanId = parseScanId(
      "https://app.wiz.io/findings/cicd-scans#~(cicd_scan~'8221aac6-eae9-4867-bbb6-91fbd1092f45)"
    )

    expect(scanId).toBe('8221aac6-eae9-4867-bbb6-91fbd1092f45')
  })

  it('parses encoded scan-id URLs', () => {
    const scanId = parseScanId(
      'https://app.wiz.io/findings/cicd-scans#%7E%28cicd_scan%7E%278221aac6-eae9-4867-bbb6-91fbd1092f45%29'
    )

    expect(scanId).toBe('8221aac6-eae9-4867-bbb6-91fbd1092f45')
  })
})

describe('getWizInstallUrl', () => {
  const originalPlatform = process.platform
  const originalArch = process.arch

  afterEach(() => {
    Object.defineProperty(process, 'platform', {value: originalPlatform})
    Object.defineProperty(process, 'arch', {value: originalArch})
  })

  it('returns linux amd64 URL', () => {
    Object.defineProperty(process, 'platform', {value: 'linux'})
    Object.defineProperty(process, 'arch', {value: 'x64'})
    expect(getWizInstallUrl()).toBe('https://downloads.wiz.io/v1/wizcli/latest/wizcli-linux-amd64')
  })

  it('returns linux arm64 URL', () => {
    Object.defineProperty(process, 'platform', {value: 'linux'})
    Object.defineProperty(process, 'arch', {value: 'arm64'})
    expect(getWizInstallUrl()).toBe('https://downloads.wiz.io/v1/wizcli/latest/wizcli-linux-arm64')
  })

  it('returns darwin amd64 URL', () => {
    Object.defineProperty(process, 'platform', {value: 'darwin'})
    Object.defineProperty(process, 'arch', {value: 'x64'})
    expect(getWizInstallUrl()).toBe('https://downloads.wiz.io/v1/wizcli/latest/wizcli-darwin-amd64')
  })

  it('returns darwin arm64 URL', () => {
    Object.defineProperty(process, 'platform', {value: 'darwin'})
    Object.defineProperty(process, 'arch', {value: 'arm64'})
    expect(getWizInstallUrl()).toBe('https://downloads.wiz.io/v1/wizcli/latest/wizcli-darwin-arm64')
  })

  it('returns windows amd64 URL', () => {
    Object.defineProperty(process, 'platform', {value: 'win32'})
    Object.defineProperty(process, 'arch', {value: 'x64'})
    expect(getWizInstallUrl()).toBe(
      'https://downloads.wiz.io/v1/wizcli/latest/wizcli-windows-amd64.exe'
    )
  })

  it('throws for unsupported platform', () => {
    Object.defineProperty(process, 'platform', {value: 'freebsd'})
    Object.defineProperty(process, 'arch', {value: 'x64'})
    expect(() => getWizInstallUrl()).toThrow('Unsupported platform or architecture: freebsd/x64')
  })
})

describe('getWizCLI', () => {
  async function getCLI() {
    vi.mocked(tc.downloadTool).mockResolvedValue('/tmp/wizcli')
    vi.mocked(exec.exec).mockResolvedValue(0)
    return await getWizCLI()
  }

  // Emit `output` on stdout, then exit with `code`
  function mockScan(output: string, code: number) {
    vi.mocked(exec.exec).mockImplementation(async (_command, _args, options) => {
      options?.listeners?.stdout?.(Buffer.from(output))
      return code
    })
  }

  it('downloads and chmods the CLI', async () => {
    await getCLI()

    expect(tc.downloadTool).toHaveBeenCalledWith(getWizInstallUrl())
    expect(exec.exec).toHaveBeenCalledWith('chmod', ['+x', '/tmp/wizcli'])
  })

  it('reports a scan that satisfies policy as passed', async () => {
    const wizcli = await getCLI()
    mockScan(`Scan Id: ${SCAN_ID}`, 0)

    expect(await wizcli.scan('myimage', null)).toEqual({
      scanId: SCAN_ID,
      scanPassed: true
    })

    expect(exec.exec).toHaveBeenCalledWith(
      '/tmp/wizcli',
      ['scan', 'container-image', 'myimage', '--no-style'],
      expect.anything()
    )
  })

  it('reports a policy violation (status 4) as failed, not an error', async () => {
    const wizcli = await getCLI()
    mockScan(`Scan Id: ${SCAN_ID}`, 4)

    expect(await wizcli.scan('myimage', null)).toEqual({
      scanId: SCAN_ID,
      scanPassed: false
    })
  })

  it('passes custom policies through to the CLI', async () => {
    const wizcli = await getCLI()
    mockScan(`Scan Id: ${SCAN_ID}`, 0)

    await wizcli.scan('myimage', 'tvm_automation_policy')

    expect(exec.exec).toHaveBeenCalledWith(
      '/tmp/wizcli',
      ['scan', 'container-image', 'myimage', '--no-style', '--policy', 'tvm_automation_policy'],
      expect.anything()
    )
  })

  it('warns but succeeds when no scan-id appears in the output', async () => {
    const wizcli = await getCLI()
    mockScan('no scan id here', 0)

    expect(await wizcli.scan('myimage', null)).toEqual({
      scanId: null,
      scanPassed: true
    })

    expect(core.warning).toHaveBeenCalledWith('Unable to parse Scan Id from report')
  })

  it('throws on any other non-zero status', async () => {
    const wizcli = await getCLI()
    mockScan('', 1)

    await expect(wizcli.scan('myimage', null)).rejects.toThrow('wiz scan errored, status: 1')
  })
})
