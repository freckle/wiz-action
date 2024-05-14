import * as exec from "@actions/exec";
import * as core from "@actions/core";

import * as wc from "./wiz-cli";
import * as sr from "./scan-result";
import { getInputs } from "./inputs";

async function run() {
  try {
    const {
      wizClientId,
      wizClientSecret,
      wizApiEndpointUrl,
      wizApiIdP,
      image,
      customPolicies,
      pull,
      fail,
    } = getInputs();

    const wizCredentials = {
      clientId: wizClientId,
      clientSecret: wizClientSecret,
    };

    if (pull) {
      await exec.exec("docker", ["pull", image]);
    }

    const wizcli = await wc.getWizCLI(wizCredentials);
    const { scanId, scanPassed } = await wizcli.scan(image, customPolicies);

    if (wizApiEndpointUrl) {
      try {
        const result = await sr.fetch(
          scanId,
          wizCredentials,
          wizApiEndpointUrl,
          wizApiIdP,
        );
        const summary = sr.buildSummary(image, scanId, result);
        await summary.write();
      } catch (error) {
        if (error instanceof Error) {
          core.warning(`Error writing summary: ${error.message}`);
        } else if (typeof error === "string") {
          core.warning(`Error writing summary: ${error}`);
        } else {
          core.warning("Error writing summary");
        }
      }
    }

    const resultUrlBase = "https://app.wiz.io/reports/cicd-scans";
    const resultUrlHash = fixedEncodeURIComponent(`~(cicd_scan~'${scanId})`);
    const resultUrl = `${resultUrlBase}#${resultUrlHash}`;

    if (scanPassed) {
      core.info(`Scan passed: ${resultUrl}`);
      core.setOutput("scan-id", scanId);
      core.setOutput("scan-result", "success");
    } else {
      core.warning(`Scan failed: ${resultUrl}`);
      core.setOutput("scan-id", scanId);
      core.setOutput("scan-result", "failed");

      if (fail) {
        core.setFailed(
          `Image ${image} does not satisfy ${
            customPolicies ? "custom policies" : "default policies"
          }`,
        );
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else if (typeof error === "string") {
      core.setFailed(error);
    } else {
      core.setFailed("Non-Error exception");
    }
  }
}

// https://stackoverflow.com/a/62436236
function fixedEncodeURIComponent(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
    return "%" + c.charCodeAt(0).toString(16);
  });
}

run();
