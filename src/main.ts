import * as exec from "@actions/exec";
import * as core from "@actions/core";

import * as wc from "./wiz-cli";
import { getInputs } from "./inputs";

async function run() {
  try {
    const { wizClientId, wizClientSecret, image, customPolicies, pull, fail } =
      getInputs();

    const wizCredentials = {
      clientId: wizClientId,
      clientSecret: wizClientSecret,
    };

    if (pull) {
      await exec.exec("docker", ["pull", image]);
    }

    const wizcli = await wc.getWizCLI(wizCredentials);
    const { scanId, scanPassed } = await wizcli.scan(image, customPolicies);

    if (scanPassed) {
      core.setOutput("scan-id", scanId);
      core.setOutput("scan-result", "success");
    } else {
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

run();
