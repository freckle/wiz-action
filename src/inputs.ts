import * as core from "@actions/core";

export type Inputs = {
  wizClientId: string;
  wizClientSecret: string;
  image: string;
  wizApiEndpointURL: string | null;
  wizApiIdP: WizIdP;
  customPolicies: string | null;
  pull: boolean;
  fail: boolean;
  testScanId: string | null;
};

export type WizIdP = "auth0" | "cognito";

function parseWizIdP(raw: string): WizIdP {
  switch (raw) {
    case "auth0":
      return "auth0";
    case "cognito":
      return "cognito";
    default:
      throw new Error("");
  }
}

export function getInputs(): Inputs {
  const wizClientId = core.getInput("wiz-client-id", { required: true });
  const wizClientSecret = core.getInput("wiz-client-secret", {
    required: true,
  });
  const image = core.getInput("image", { required: true });
  const wizApiEndpointURL = getOptionalStringInput("wiz-api-endpoint-url");
  const wizApiIdP = parseWizIdP(
    core.getInput("wiz-api-idp", { required: true }),
  );
  const customPolicies = getOptionalStringInput("custom-policies");
  const pull = core.getBooleanInput("pull", { required: true });
  const fail = core.getBooleanInput("fail", { required: true });
  const testScanId = getOptionalStringInput("test-scan-id");
  return {
    wizClientId,
    wizClientSecret,
    image,
    wizApiEndpointURL,
    wizApiIdP,
    customPolicies,
    pull,
    fail,
    testScanId,
  };
}

function getOptionalStringInput(name: string): string | null {
  const value = core.getInput(name, { required: false });
  return value !== "" ? value : null;
}
