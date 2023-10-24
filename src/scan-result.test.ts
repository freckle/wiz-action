import * as core from "@actions/core";
import * as fs from "fs";
import * as scanResult from "./scan-result";

beforeEach(() => {
  core.summary.emptyBuffer();
});

test("Failed with cpes and osPackages", () => {
  const body = fs.readFileSync("test/scan-results/statsd.json").toString();
  const result = scanResult.parse(body);

  expect(result.analytics.vulnerabilities.criticalCount).toBe(193);
  expect(result.cpes?.length).toBe(1);
  expect(result.osPackages?.length).toBe(215);

  const summary = scanResult
    .buildSummary("statsd/statsd", "abc123", result)
    .stringify();

  expect(summary).toBe(
    `<h1>❌ statsd/statsd failed some policies</h1>
<ul><li><strong>Default vulnerabilities policy</strong>: This image contains 193 CRITICAL vulnerabilities (with fixes), which is greater than the policy threshold (1)</li></ul>
<a href="https://app.wiz.io/reports/cicd-scans#~(cicd_scan~'abc123)">View report on Wiz</a>
`,
  );
});

test("Passed with osPackages", () => {
  const body = fs
    .readFileSync("test/scan-results/statsd-passed.json")
    .toString();
  const result = scanResult.parse(body);

  expect(result.analytics.vulnerabilities.criticalCount).toBe(1);
  expect(result.cpes).toBeNull();
  expect(result.osPackages?.length).toBe(164);

  const summary = scanResult
    .buildSummary("statsd/statsd", "abc123", result)
    .stringify();

  // See https://github.com/actions/toolkit/issues/1567 about the extra <ul>
  expect(summary).toBe(
    `<h1>✅ statsd/statsd passed all policies</h1>
<ul>
<a href="https://app.wiz.io/reports/cicd-scans#~(cicd_scan~'abc123)">View report on Wiz</a>
`,
  );
});
