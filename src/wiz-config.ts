export type WizConfig = {
  credentials: WizCredentials;
  apiConfig: WizApiConfig;
};

export type WizCredentials = {
  clientId: string;
  clientSecret: string;
};

export type WizApiConfig = {
  apiEndpointUrl: string;
  apiIdP: string;
};
