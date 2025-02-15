import * as core from "@actions/core";
import { getKubectlPath, Kubectl } from "./types/kubectl";
import { deploy } from "./actions/deploy";
import { promote } from "./actions/promote";
import { reject } from "./actions/reject";
import { Action, parseAction } from "./types/action";
import { parseDeploymentStrategy } from "./types/deploymentStrategy";

export async function run() {
  // verify kubeconfig is set
  if (!process.env["KUBECONFIG"])
    core.warning(
      "KUBECONFIG env is not explicitly set. Ensure cluster context is set by using k8s-set-context action."
    );

  // get inputs
  const action: Action | undefined = parseAction(
    core.getInput("action", { required: true })
  );
  const strategy = parseDeploymentStrategy(core.getInput("strategy"));
  const manifestsInput = core.getInput("manifests", { required: true });
  const manifestFilePaths = manifestsInput
    .split(/[\n,;]+/) // split into each individual manifest
    .map((manifest) => manifest.trim()) // remove surrounding whitespace
    .filter((manifest) => manifest.length > 0); // remove any blanks

  // create kubectl
  const kubectlPath = await getKubectlPath();
  const namespace = core.getInput("namespace") || "default";
  const kubectl = new Kubectl(kubectlPath, namespace, true);

  // run action
  switch (action) {
    case Action.DEPLOY: {
      await deploy(kubectl, manifestFilePaths, strategy);
      break;
    }
    case Action.PROMOTE: {
      await promote(kubectl, manifestFilePaths, strategy);
      break;
    }
    case Action.REJECT: {
      await reject(kubectl, manifestFilePaths, strategy);
      break;
    }
    default: {
      throw Error(
        'Not a valid action. The allowed actions are "deploy", "promote", and "reject".'
      );
    }
  }
}

run().catch(core.setFailed);
