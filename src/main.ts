import * as tc from "@actions/tool-cache";
import * as exec from "@actions/exec";
import * as core from "@actions/core";

function getWizInstallUrl(
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture,
): string {
  switch (platform) {
    case "win32":
      return "https://wizcli.app.wiz.io/latest/wizcli-windows-amd64.exe";
    case "darwin":
      return "https://wizcli.app.wiz.io/latest/wizcli-darwin-amd64";
    case "linux":
      switch (arch) {
        case "x64":
          return "https://wizcli.app.wiz.io/latest/wizcli-linux-amd64";
        case "arm64":
          return "https://wizcli.app.wiz.io/latest/wizcli-linux-arm64";
      }
  }

  throw new Error(`Unsupported platform or architecture: ${platform}/${arch}`);
}

async function installWizCli(
  platform: NodeJS.Platform,
  arch: NodeJS.Architecture,
): Promise<string> {
  core.info(`Installing wizcli for ${platform}/${arch}`);
  const wizUrl = getWizInstallUrl(process.platform, process.arch);
  const wizcli = await tc.downloadTool(wizUrl);
  await exec.exec("chmod", ["+x", wizcli]);
  core.debug(`Installed ${wizcli}`);
  return wizcli;
}

type WizCredentials = {
  clientId: string;
  clientSecret: string;
};

function getWizCredentials(): WizCredentials {
  const clientId = core.getInput("wiz-client-id", { required: true });
  const clientSecret = core.getInput("wiz-client-secret", { required: true });
  return { clientId, clientSecret };
}

async function run() {
  try {
    const wizcli = await installWizCli(process.platform, process.arch);
    const { clientId, clientSecret } = getWizCredentials();
    await exec.exec(wizcli, [
      "auth",
      "--id",
      clientId,
      "--secret",
      clientSecret,
    ]);

    const image = core.getInput("image", { required: true });
    const policies = core.getInput("custom-policies", { required: false });
    const pull = core.getBooleanInput("pull", { required: true });
    const fail = core.getBooleanInput("fail", { required: true });

    if (pull) {
      await exec.exec("docker", ["pull", image]);
    }

    const args = ["docker", "scan", "--image", image].concat(
      policies !== "" ? ["--policy", policies] : [],
    );
    const ec = await exec.exec(wizcli, args, { ignoreReturnCode: true });

    switch (ec) {
      case 0:
        core.setOutput("result", "success");
        break;
      case 4:
        core.setOutput("result", "failed");
        if (fail) {
          core.setFailed(
            `Image ${image} does not satisfy ${
              policies !== "" ? "custom policies" : "default policies"
            }`,
          );
        }
        break;
      default:
        core.setOutput("result", "error");
        throw new Error(`wiz scan failed, status: ${ec}`);
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
