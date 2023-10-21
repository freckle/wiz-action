import * as core from "@actions/core";

export type Inputs = {
  wizClientId: string;
  wizClientSecret: string;
  image: string;
  customPolicies: string | null;
  pull: boolean;
  fail: boolean;
};

export function getInputs(): Inputs {
  const wizClientId = core.getInput("wiz-client-id", { required: true });
  const wizClientSecret = core.getInput("wiz-client-secret", {
    required: true,
  });
  const image = core.getInput("image", { required: true });
  const customPolicies = getOptionalInput("custom-policies");
  const pull = core.getBooleanInput("pull", { required: true });
  const fail = core.getBooleanInput("fail", { required: true });

  return {
    wizClientId,
    wizClientSecret,
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
