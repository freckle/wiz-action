import { parseScanId } from "./wiz-cli";

describe("parseScanId", () => {
  it("parses un-encoded scan-id URLs", () => {
    const scanId = parseScanId(
      "https://app.wiz.io/findings/cicd-scans#~(cicd_scan~'abc123)",
    );

    expect(scanId).toBe("abc123");
  });

  it("parses encoded scan-id URLs", () => {
    const scanId = parseScanId(
      "https://app.wiz.io/findings/cicd-scans#%7E%28cicd_scan%7E%27def456%29",
    );

    expect(scanId).toBe("def456");
  });
});
