import * as core from "@actions/core";

import type { WizIdP } from "./wiz-config.js";
import { parseWizIdP } from "./wiz-config.js";

export type Inputs = {
  wizApiEndpointUrl: string | null;
  wizApiIdP: WizIdP;
  image: string;
  customPolicies: string | null;
  pull: boolean;
  fail: boolean;
};

export function getInputs(): Inputs {
  const image = core.getInput("image", { required: true });
  const wizApiEndpointUrl = getOptionalInput("wiz-api-endpoint-url");
  const wizApiIdP = parseWizIdP(
    core.getInput("wiz-api-idp", { required: true }),
  );
  const customPolicies = getOptionalInput("custom-policies");
  const pull = core.getBooleanInput("pull", { required: true });
  const fail = core.getBooleanInput("fail", { required: true });

  return {
    wizApiEndpointUrl,
    wizApiIdP,
    image,
    customPolicies,
    pull,
    fail,
  };
}

function getOptionalInput(name: string): string | null {
  const value = core.getInput(name, { required: false });
  return value !== "" ? value : null;
}
