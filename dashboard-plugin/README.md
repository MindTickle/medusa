# Module Federation Dashboard Plugin

This Webpack plugin extracts data from the Webpack build, and in particular a build that uses the `ModuleFederationPlugin`, and posts it to the [dashboard](https://hub.docker.com/r/scriptedalchemy/mf-dashboard).

# Installation

```shell script
> yarn add @module-federation/dashboard-plugin -D
```

# Usage

```js
const DashboardPlugin = require("@module-federation/dashboard-plugin");
```

```js
plugins: [
  ...new DashboardPlugin({
    dashboardURL:
      "https://federation-dashboard-alpha.vercel.app/api/update?token=writeToken",
  }),
];
```

This will post the `ModuleFederationPlugin` metrics to the update endpoint at `https://federation-dashboard-alpha.vercel.app/api/update?token=writeToken`.

**In order to send data to Medusa, you need to create a write token.** It can be configured here: https://federation-dashboard-alpha.vercel.app/settings

There are also other options:

| Key            | Description                                                                             |
| -------------- | --------------------------------------------------------------------------------------- |
| dashboardURL   | The URL of the dashboard endpoint.                                                      |
| metadata       | Any additional metadata you want to apply to this application for use in the dashboard. |
| filename       | The file path where the dashboard data.                                                 |
| standalone     | For use without ModuleFederationPlugin                                                  |
| publishVersion | Used for versioned remotes. '1.0.0' will be used for each remote if not passed          |

## Metadata

Metadata is _optional_ and is specified as an object.

```js
plugins: [
  ...new DashboardPlugin({
    dashboardURL:
      "https://federation-dashboard-alpha.vercel.app/api/update?token=writeToken",
    metadata: {
      source: {
        url: "http://github.com/myorg/myproject/tree/master",
      },
      remote: "http://localhost:8081/remoteEntry.js",
    },
  }),
];
```

You can add whatever keys you want to `metadata`, but there are some keys that the Dashboard will look for and which result in a better experience.

| Key        | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| source.url | The base URL of your source in a source code control system. |
| remote     | The URL for the remote entry.                                |

## Standalone Mode

This is useful when Module Federation is not used, options can be passed that are usually inferred from Module Federation Options

- `name`: the name of the app, must be unique
