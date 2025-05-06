import * as core from "@actions/core";
import type { HttpClient } from "@actions/http-client";
import * as http from "@actions/http-client";

import type { WizCredentials, WizIdP } from "./wiz-config";

const JSON_HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
};

type CICDScanQL = {
  data: {
    cicdScan: {
      resultJSON: ScanResult;
    };
  };
};

export type ScanResult = {
  analytics: ScanAnalytics;
  failedPolicyMatches: PolicyMatch[] | null;
  applications: ScanResultItem[] | null;
  cpes: ScanResultItem[] | null;
  libraries: ScanResultItem[] | null;
  osPackages: ScanResultItem[] | null;
  secrets: ScanResultItem[] | null;
};

export type ScanAnalytics = {
  vulnerabilities: {
    criticalCount: number;
    highCount: number;
    infoCount: number;
    lowCount: number;
    mediumCount: number;
    unfixedCount: number;
  };
};

function scanAnalyticsCount(
  analytics: ScanAnalytics,
  severity: Severity,
): number {
  switch (severity) {
    case "INFO":
      return analytics.vulnerabilities.infoCount;
    case "LOW":
      return analytics.vulnerabilities.lowCount;
    case "MEDIUM":
      return analytics.vulnerabilities.mediumCount;
    case "HIGH":
      return analytics.vulnerabilities.highCount;
    case "CRITICAL":
      return analytics.vulnerabilities.criticalCount;
  }
}

export type PolicyMatch = {
  policy: {
    name: string;
    description: string;
    params: PolicyParams;
  };
};

export type PolicyParams = {
  ignoreUnfixed: boolean;
  packageAllowList: string[];
  packageCountThreshold: number;
  severity: Severity;
};

export type ScanResultItem = {
  name: string;
  version: string;
  vulnerabilities: Vulnerability[];
};

export type Vulnerability = {
  name: string;
  severity: Severity;
};

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export async function fetch(
  scanId: string,
  credentials: WizCredentials,
  apiEndpointUrl: string,
  apiIdP: WizIdP,
): Promise<ScanResult> {
  const client = new http.HttpClient();
  const token = await getAccessToken(client, credentials, apiIdP);
  const body = await getCICDScanQL(client, token, apiEndpointUrl, scanId);
  core.debug(`Raw body: ${body}`);
  return parse(body);
}

async function getAccessToken(
  client: HttpClient,
  credentials: WizCredentials,
  apiIdP: string,
): Promise<string> {
  const { clientId, clientSecret } = credentials;

  let apiHost = "";
  let apiAudience = "";

  switch (apiIdP.toLowerCase()) {
    case "auth0":
      apiHost = "auth.wiz.io";
      apiAudience = "beyond-api";
      break;
    case "cognito":
      apiHost = "auth.app.wiz.io";
      apiAudience = "wiz-api";
      break;
    default:
      throw new Error(`Unexpected IdP ${apiIdP}, must be Auth0 or Cognito`);
  }

  const formPart = (k: string, v: string): string => {
    return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
  };
  const formBody = [
    formPart("grant_type", "client_credentials"),
    formPart("client_id", clientId),
    formPart("client_secret", clientSecret),
    formPart("audience", apiAudience),
  ].join("&");

  const response = await client.post(
    `https://${apiHost}/oauth/token`,
    formBody,
    { "content-type": "application/x-www-form-urlencoded" },
  );

  const body = await response.readBody();
  return JSON.parse(body).access_token;
}

async function getCICDScanQL(
  client: HttpClient,
  accessToken: string,
  apiEndpointUrl: string,
  scanId: string,
): Promise<string> {
  const response = await client.post(
    apiEndpointUrl,
    JSON.stringify({ query: `query{cicdScan(id:"${scanId}"){resultJSON}}` }),
    { authorization: `bearer ${accessToken}`, ...JSON_HEADERS },
  );
  return await response.readBody();
}

// Work around lack of export
type Summary = ReturnType<typeof core.summary.addRaw>;

export function buildSummary(
  image: string,
  scanId: string,
  result: ScanResult,
): Summary {
  const matches: string[] = (result.failedPolicyMatches || []).map((pm) => {
    const {
      name,
      params: { ignoreUnfixed, packageCountThreshold, severity },
    } = pm.policy;

    const cveCount = scanAnalyticsCount(result.analytics, severity);
    const withFixes = ignoreUnfixed ? " (with fixes)" : "";
    return `<strong>${name}</strong>: This image contains ${cveCount} ${severity} vulnerabilities${withFixes}, which is greater than the policy threshold (${packageCountThreshold})`;
  });

  const title =
    matches.length === 0
      ? `✅ ${image} passed all policies`
      : `❌ ${image} failed some policies`;

  const link = toScanUrl(scanId);

  return core.summary
    .addHeading(title)
    .addList(matches)
    .addLink("View report on Wiz", link);
}

export function toScanUrl(scanId: string): string {
  return `https://app.wiz.io/reports/cicd-scans#~(cicd_scan~'${scanId})`;
}

// Exported for use in tests
export function parse(body: string): ScanResult {
  return (JSON.parse(body) as CICDScanQL).data.cicdScan.resultJSON;
}
