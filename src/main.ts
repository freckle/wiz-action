import * as core from "@actions/core";

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });

    // Your logic here

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
