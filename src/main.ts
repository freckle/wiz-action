import * as exec from "@actions/exec";
import * as core from "@actions/core";

import * as wc from "./wiz-cli";
import * as sr from "./scan-result";
import type { Inputs } from "./inputs";
import { getInputs } from "./inputs";

async function writeSummary(
  inputs: Inputs,
  scanId: string | null,
): Promise<void> {
  if (!scanId || !inputs.wizApiEndpointURL) {
    return;
  }

  const credentials = {
    clientId: inputs.wizClientId,
    clientSecret: inputs.wizClientSecret,
  };
  const config = {
    credentials,
    apiConfig: {
      apiEndpointUrl: inputs.wizApiEndpointURL,
      apiIdP: inputs.wizApiIdP,
    },
  };

  try {
    const result = await sr.fetch(scanId, config);
    sr.writeSummary(inputs.image, scanId, result);
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

async function run() {
  try {
    const inputs = getInputs();
    const credentials = {
      clientId: inputs.wizClientId,
      clientSecret: inputs.wizClientSecret,
    };

    if (inputs.testScanId !== "") {
      return await writeSummary(inputs, inputs.testScanId);
    }

    if (inputs.pull) {
      await exec.exec("docker", ["pull", inputs.image]);
    }

    const wizcli = await wc.getWizCLI(credentials);
    const { scanId, scanPassed } = await wizcli.scan(
      inputs.image,
      inputs.customPolicies,
    );
    await writeSummary(inputs, scanId);

    if (scanPassed) {
      core.setOutput("scan-id", scanId);
      core.setOutput("scan-result", "success");
    } else {
      core.setOutput("scan-id", scanId);
      core.setOutput("scan-result", "failed");

      if (inputs.fail) {
        core.setFailed(
          `Image ${inputs.image} does not satisfy ${
            policies !== "" ? "custom policies" : "default policies"
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

run();
