import {
  makeStyles,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  Chip,
} from "@material-ui/core";
import gql from "graphql-tag";
import { useQuery } from "@apollo/react-hooks";
import { observer } from "mobx-react";

import store from "../src/store";
import { ApplicationLink, ModuleLink } from "./links";

const useStyles = makeStyles((theme) => ({
  title: {
    fontWeight: "bold",
  },
  container: {
    padding: 10,
  },
  panel: {
    padding: 10,
  },
  panelTitle: {
    fontWeight: "bold",
  },
  dependenciesTable: {
    marginBottom: "3em",
  },
  overridden: {
    fontWeight: "bold",
  },
}));

const GET_APPS = gql`
  query ($name: String!, $group: String!, $environment: String!) {
    groups(name: $group) {
      applications(id: $name) {
        id
        name
        tags
        metadata {
          name
          value
        }
        versions(latest: true, environment: $environment) {
          consumes {
            application {
              id
              name
            }
            name
            usedIn {
              file
              url
            }
          }
          modules {
            name
            tags
            metadata {
              name
              value
            }
            consumedBy {
              consumingApplication {
                name
                id
              }
            }
          }
        }
      }
    }
  }
`;

const UsedIn = ({ usedIn }) => (
  <>
    {usedIn.map(({ file, url }) => (
      <Typography variant="body2" key={[file, url].join(":")}>
        <a href={url}>{file}</a>
      </Typography>
    ))}
  </>
);

const ConsumedBy = ({ consumedBy, moduleName }) => (
  <>
    {consumedBy.map(({ consumingApplication: { name: consumer } }) => (
      <span key={[name, moduleName, consumer].join(":")}>
        <ApplicationLink group={store.group} application={consumer}>
          <a>{consumer}</a>
        </ApplicationLink>{" "}
      </span>
    ))}
  </>
);

const ConsumesTable = ({ consumes }) => {
  const classes = useStyles();
  return (
    <>
      <h4 className={classes.panelTitle}>Consumes</h4>
      <Table>
        <TableBody>
          {consumes.map(({ name, application, usedIn }) => (
            <TableRow key={[application.id, name].join()}>
              <TableCell>
                <Typography>
                  <ApplicationLink
                    group={store.group}
                    application={application.name}
                  >
                    <a>{application.name}</a>
                  </ApplicationLink>
                  /
                  <ModuleLink
                    group={store.group}
                    application={application.name}
                    module={name}
                  >
                    <a>{name}</a>
                  </ModuleLink>
                </Typography>
              </TableCell>
              <TableCell>
                <UsedIn usedIn={usedIn} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
};

const ConsumersTable = ({ modules, name }) => {
  const classes = useStyles();
  return (
    <>
      <h4 className={classes.panelTitle}>Consumers</h4>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <Typography>Module</Typography>
            </TableCell>
            <TableCell>
              <Typography>Consumers</Typography>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {modules
            .filter(({ consumedBy }) => consumedBy.length)
            .map(({ name: moduleName, consumedBy }) => {
              console.log(store.group, name, module);
              return (
                <TableRow key={moduleName}>
                  <TableCell>
                    <Typography>
                      <ModuleLink
                        group={store.group}
                        application={name}
                        module={moduleName}
                      >
                        <a>{moduleName}</a>
                      </ModuleLink>
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>
                      {consumedBy.map(
                        ({ consumingApplication: { name: consumer } }) => (
                          <span key={[name, moduleName, consumer].join(":")}>
                            <ApplicationLink
                              group={store.group}
                              application={consumer}
                            >
                              <a>{consumer}</a>
                            </ApplicationLink>{" "}
                          </span>
                        )
                      )}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </>
  );
};

const Tags = ({ tags }) => (
  <div>
    {tags.map((t) => (
      <Chip label={t} key={t} style={{ marginRight: "0.5em" }} />
    ))}
  </div>
);

const isLink = (value) => value.startsWith("http");

const Metadata = ({ metadata }) => (
  <Table>
    <TableBody>
      {metadata.map(({ name, value }) => (
        <TableRow key={[name, value].join(":")}>
          <TableCell>{name}</TableCell>
          <TableCell>
            {isLink(value) ? (
              <a href={value} target="_blank">
                {value}
              </a>
            ) : (
              value
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const ApplicationSidebar = ({ name }) => {
  const { data } = useQuery(GET_APPS, {
    variables: {
      name: name.split("/")[0],
      environment: store.environment,
      group: store.group,
    },
  });

  if (!data) {
    return null;
  }

  const [applicationName, moduleName] = name.split("/");
  const consumes =
    data?.groups?.[0].applications?.[0]?.versions?.[0]?.consumes || [];
  const modules =
    data?.groups?.[0].applications?.[0]?.versions?.[0]?.modules || [];
  const module = moduleName
    ? modules.filter(({ name }) => name === moduleName)[0]
    : null;
  const tags = module
    ? module.tags || []
    : data?.groups?.[0].applications?.[0]?.tags || [];
  const metadata = module
    ? module.metadata || []
    : data?.groups?.[0].applications?.[0]?.metadata || [];

  return (
    <div
      style={{
        padding: "1em",
      }}
    >
      {!module && <ConsumersTable modules={modules} name={name} />}
      {!module && consumes.length > 0 && <ConsumesTable consumes={consumes} />}
      {module && (
        <>
          <h2>Used In</h2>
          <ConsumedBy consumedBy={module.consumedBy} moduleName={moduleName} />
        </>
      )}
      {tags.length > 0 && (
        <>
          <h4>Tags</h4>
          <Tags tags={tags} />
        </>
      )}
      {metadata.length > 0 && (
        <>
          <h4>Metadata</h4>
          <Metadata metadata={metadata} />
        </>
      )}
    </div>
  );
};

export default observer(ApplicationSidebar);
