import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import type { WizCredentials } from "./wiz-config";

export type WizScanResult = {
  scanId: string | null;
  scanPassed: boolean;
};

class WizCLI {
  wizcli: string;
  credentials: WizCredentials;

  constructor(wizcli: string, credentials: WizCredentials) {
    this.wizcli = wizcli;
    this.credentials = credentials;
  }

  async auth(): Promise<WizCLI> {
    const { clientId, clientSecret } = this.credentials;

    await exec.exec(this.wizcli, [
      "auth",
      "--id",
      clientId,
      "--secret",
      clientSecret,
    ]);

    return this;
  }

  async scan(image: string, policies: string | null): Promise<WizScanResult> {
    const args = ["docker", "scan", "--image", image, "--no-style"].concat(
      policies ? ["--policy", policies] : [],
    );

    let scanId: string | null = null;

    const listener = (data: Buffer) => {
      if (!scanId) {
        scanId = parseScanId(data.toString());
      }
    };

    const ec = await exec.exec(this.wizcli, args, {
      ignoreReturnCode: true,
      listeners: {
        stdout: listener,
        stderr: listener,
      },
    });

    if (ec !== 0 && ec !== 4) {
      throw new Error(`wiz scan errored, status: ${ec}`);
    }

    if (!scanId) {
      core.warning("Unable to parse Scan Id from report");
    }

    const scanPassed = ec === 0;

    return {
      scanId,
      scanPassed,
    };
  }
}

export async function getWizCLI(credentials: WizCredentials): Promise<WizCLI> {
  const wizUrl = getWizInstallUrl();
  const wizcli = await tc.downloadTool(wizUrl);
  await exec.exec("chmod", ["+x", wizcli]);
  return new WizCLI(wizcli, credentials).auth();
}

// Example: "8221aac6-eae9-4867-bbb6-91fbd1092f45"
const SCAN_ID_FORMAT = new RegExp("[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}");

// exported for testing
export function parseScanId(str: string): string | null {
  const match = str.match(SCAN_ID_FORMAT);
  return match ? match[0] : null;
}

function getWizInstallUrl(): string {
  switch (process.platform) {
    case "win32":
      return "https://wizcli.app.wiz.io/latest/wizcli-windows-amd64.exe";
    case "darwin":
      return "https://wizcli.app.wiz.io/latest/wizcli-darwin-amd64";
    case "linux":
      switch (process.arch) {
        case "x64":
          return "https://wizcli.app.wiz.io/latest/wizcli-linux-amd64";
        case "arm64":
          return "https://wizcli.app.wiz.io/latest/wizcli-linux-arm64";
      }
  }

  throw new Error(
    `Unsupported platform or architecture: ${process.platform}/${process.arch}`,
  );
}
