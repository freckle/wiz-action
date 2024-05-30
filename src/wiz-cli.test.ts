import { parseScanId } from "./wiz-cli";

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
