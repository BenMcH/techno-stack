const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const sort = require("sort-package-json");

function escapeRegExp(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRandomString(length) {
  return crypto.randomBytes(length).toString("hex");
}

async function main({ rootDirectory }) {
  const README_PATH = path.join(rootDirectory, "README.md");
  const EXAMPLE_ENV_PATH = path.join(rootDirectory, ".env.example");
  const ENV_PATH = path.join(rootDirectory, ".env");
  const PACKAGE_JSON_PATH = path.join(rootDirectory, "package.json");

  const REPLACER = "techno-stack-template";

  const APP_NAME = path.basename(rootDirectory);

  const [readme, env, packageJson] = await Promise.all([
    fs.readFile(README_PATH, "utf-8"),
    fs.readFile(EXAMPLE_ENV_PATH, "utf-8"),
    fs.readFile(PACKAGE_JSON_PATH, "utf-8"),
  ]);

  const newEnv = env.replace(
    /^SESSION_SECRET=.*$/m,
    `SESSION_SECRET="${getRandomString(16)}"`
  );

  const deploymentFilePaths = [
    'k3s/0_namespace.yml',
    'k3s/1_deployment.yml',
    'k3s/2_service.yml',
    'k3s/3_ingress.yml',
  ];

  const deploymentFiles = await Promise.all(
    deploymentFilePaths.map((filePath) => fs.readFile(path.join(rootDirectory, filePath), "utf-8"))
  );

  const newDeploymentFiles = deploymentFiles.map((file) =>
    file.replace(
      new RegExp(escapeRegExp(REPLACER), "g"),
      APP_NAME
    )
  );

  const newReadme = readme.replace(
    new RegExp(escapeRegExp(REPLACER), "g"),
    APP_NAME
  );

  const newPackageJson =
    JSON.stringify(
      sort({ ...JSON.parse(packageJson), name: APP_NAME }),
      null,
      2
    ) + "\n";

  await Promise.all([
    fs.writeFile(README_PATH, newReadme),
    fs.writeFile(ENV_PATH, newEnv),
    fs.writeFile(PACKAGE_JSON_PATH, newPackageJson),
    ...newDeploymentFiles.map((file, index) =>
      fs.writeFile(path.join(rootDirectory, deploymentFilePaths[index]), file)
    ),
  ]);

  console.log(
    `
Setup is almost complete. Follow these steps to finish initialization:

- Start the database:
  npm run docker

- Run setup (this runs the tests and things to verify things got setup properly):
  npm run setup

- You're now ready to rock and roll 🤘
  npm run dev
    `.trim()
  );
}

module.exports = main;
