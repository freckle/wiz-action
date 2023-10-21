export type WizCredentials = {
  clientId: string;
  clientSecret: string;
};

export type WizIdP = "auth0" | "cognito";

export function parseWizIdP(raw: string): WizIdP {
  switch (raw.toLowerCase()) {
    case "auth0":
      return "auth0";
    case "cognito":
      return "cognito";
    default:
      throw new Error(`Invalid Wiz IdP: ${raw}. Must be Auth0 or Cognito.`);
  }
}
