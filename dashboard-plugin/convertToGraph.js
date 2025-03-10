const { validateParams } = require("./helpers");
const convertToGraph = (
  {
    name,
    federationRemoteEntry,
    modules,
    topLevelPackage,
    metadata,
    versionData,
    environment,
    version,
    posted,
    group,
    functionRemotes,
  },
  standalone
) => {
  validateParams(
    { federationRemoteEntry, modules, topLevelPackage, metadata },
    standalone
  );

  const app = name;
  const overrides = {};
  const consumes = [];
  const consumesByName = {};
  const modulesObj = {};

  modules.forEach(({ identifier, reasons }) => {
    const data = identifier.split(" ");
    if (data[0] === "remote") {
      if (data.length === 4) {
        const name = data[3].replace("./", "");
        const consume = {
          consumingApplicationID: app,
          applicationID: data[2].replace("webpack/container/reference/", ""),
          name,
          usedIn: new Set(),
        };
        consumes.push(consume);
        consumesByName[`${consume.applicationID}/${name}`] = consume;
      }
      if (reasons) {
        reasons.forEach(({ userRequest, resolvedModule, type }) => {
          if (consumesByName[userRequest]) {
            consumesByName[userRequest].usedIn.add(
              resolvedModule.replace("./", "")
            );
          }
        });
      }
    } else if (data[0] === "container" && data[1] === "entry") {
      JSON.parse(data[3]).forEach(([prefixedName, file]) => {
        const name = prefixedName.replace("./", "");
        modulesObj[file.import[0]] = {
          id: `${app}:${name}`,
          name,
          applicationID: app,
          requires: new Set(),
          file: file.import[0],
        };
      });
    }
  });

  const convertDeps = (deps = {}) =>
    Object.entries(deps).map(([version, name]) => ({
      name,
      version: version.replace(`${name}-`, ""),
    }));
  const convertedDeps = {
    dependencies: convertDeps(topLevelPackage.dependencies),
    devDependencies: convertDeps(topLevelPackage.devDependencies),
    optionalDependencies: convertDeps(topLevelPackage.optionalDependencies),
  };

  modules.forEach(({ identifier, issuerName, reasons }) => {
    const data = identifier.split("|");

    if (data[0] === "consume-shared-module") {
      if (issuerName) {
        // This is a hack
        const issuerNameMinusExtension = issuerName.replace(".js", "");
        if (modulesObj[issuerNameMinusExtension]) {
          modulesObj[issuerNameMinusExtension].requires.add(data[2]);
        }
      }
      if (reasons) {
        reasons.forEach(({ module }) => {
          const moduleMinusExtension = module.replace(".js", "");
          if (modulesObj[moduleMinusExtension]) {
            modulesObj[moduleMinusExtension].requires.add(data[2]);
          }
        });
      }
      let version = "";
      [
        convertedDeps.dependencies,
        convertedDeps.devDependencies,
        convertedDeps.optionalDependencies,
      ].forEach((deps) => {
        const dep = deps.find(({ name }) => name === data[2]);
        if (dep) {
          version = dep.version;
        }
      });

      overrides[data[2]] = {
        id: data[2],
        name: data[2],
        version,
        location: data[2],
        applicationID: app,
      };
    }
  });

  // TODO move this into the main consumes loop
  if (Array.isArray(functionRemotes)) {
    const dynamicConsumes = Object.values(
      functionRemotes.reduce((acc, [file, applicationID, name]) => {
        const cleanName = name.replace("./", "");
        const objectId = applicationID + "/" + cleanName;
        const cleanFile = file.replace("./", "");
        const foundExistingConsume = consumes.find((consumeObj) => {
          return (
            consumeObj.applicationID === applicationID &&
            consumeObj.name === cleanName
          );
        });
        if (foundExistingConsume) {
          foundExistingConsume.usedIn.add(cleanFile);
          return acc;
        }
        if (acc[objectId]) {
          acc[objectId].usedIn.add(cleanFile);
          return acc;
        }
        acc[objectId] = {
          applicationID,
          name: cleanName,
          consumingApplicationID: app,
          usedIn: new Set([cleanFile]),
        };
        return acc;
      }, {})
    );
    consumes.push(...dynamicConsumes);
  }

  const sourceUrl = metadata && metadata.source ? metadata.source.url : "";
  const remote = metadata && metadata.remote ? metadata.remote : "";

  const out = {
    ...convertedDeps,
    id: app,
    name: app,
    remote,
    metadata,
    versionData,
    overrides: Object.values(overrides),
    consumes: consumes.map((con) => ({
      ...con,
      usedIn: Array.from(con.usedIn.values()).map((file) => ({
        file,
        url: `${sourceUrl}/${file}`,
      })),
    })),
    modules: Object.values(modulesObj).map((mod) => ({
      ...mod,
      requires: Array.from(mod.requires.values()),
    })),
    environment,
    version,
    posted,
    group,
  };

  return out;
};

module.exports = convertToGraph;
