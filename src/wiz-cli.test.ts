import { parseScanId, getWizInstallUrl } from "./wiz-cli.js"

describe("parseScanId", () => {
  it("parses un-encoded scan-id URLs", () => {
    const scanId = parseScanId(
      "https://app.wiz.io/findings/cicd-scans#~(cicd_scan~'8221aac6-eae9-4867-bbb6-91fbd1092f45)",
    );

    expect(scanId).toBe("8221aac6-eae9-4867-bbb6-91fbd1092f45");
  });

  it("parses encoded scan-id URLs", () => {
    const scanId = parseScanId(
      "https://app.wiz.io/findings/cicd-scans#%7E%28cicd_scan%7E%278221aac6-eae9-4867-bbb6-91fbd1092f45%29",
    );

    expect(scanId).toBe("8221aac6-eae9-4867-bbb6-91fbd1092f45");
  });
});

describe("getWizInstallUrl", () => {
  const originalPlatform = process.platform;
  const originalArch = process.arch;

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    Object.defineProperty(process, "arch", { value: originalArch });
  });

  it("returns linux amd64 URL", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    Object.defineProperty(process, "arch", { value: "x64" });
    expect(getWizInstallUrl()).toBe(
      "https://downloads.wiz.io/v1/wizcli/latest/wizcli-linux-amd64",
    );
  });

  it("returns linux arm64 URL", () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    Object.defineProperty(process, "arch", { value: "arm64" });
    expect(getWizInstallUrl()).toBe(
      "https://downloads.wiz.io/v1/wizcli/latest/wizcli-linux-arm64",
    );
  });

  it("returns darwin amd64 URL", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    Object.defineProperty(process, "arch", { value: "x64" });
    expect(getWizInstallUrl()).toBe(
      "https://downloads.wiz.io/v1/wizcli/latest/wizcli-darwin-amd64",
    );
  });

  it("returns darwin arm64 URL", () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    Object.defineProperty(process, "arch", { value: "arm64" });
    expect(getWizInstallUrl()).toBe(
      "https://downloads.wiz.io/v1/wizcli/latest/wizcli-darwin-arm64",
    );
  });

  it("returns windows amd64 URL", () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    Object.defineProperty(process, "arch", { value: "x64" });
    expect(getWizInstallUrl()).toBe(
      "https://downloads.wiz.io/v1/wizcli/latest/wizcli-windows-amd64.exe",
    );
  });

  it("throws for unsupported platform", () => {
    Object.defineProperty(process, "platform", { value: "freebsd" });
    Object.defineProperty(process, "arch", { value: "x64" });
    expect(() => getWizInstallUrl()).toThrow(
      "Unsupported platform or architecture: freebsd/x64",
    );
  });
});
