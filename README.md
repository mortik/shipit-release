# Shipit-Release

A minimal deployment Plugin for ShipitJS

## Usage

To use shipit-release just require it in your shipit file and set the needed configuration variables:

```javascript
module.exports = (shipit) => {
  require('shipit-release')(shipit)

  shipit.initConfig({
    default: {
      deployTo: '/*your-deploy-dir*',
      keepReleases: 5,
      dirToCopy: 'build',
      installCommand: 'npm install',
      buildCommand: 'npm run build',
    },
    *your-server-env-1*: {
      servers: [{
        user: '*your-staging-user*',
        host: '*your-staging-server*'
      ]
    },
    *your-server-env-2*: {
       servers: [{
        user: '*your-live-user*',
        host: '*your-live-server*'
      }],
    },
  })
}
```

Make sure you added at least one environment, for example ```staging``` to the configuration like:

```javascript
  shipit.initConfig({
    ...
    staging: {
      servers: [{
        user: '*your-staging-user*',
        host: '*your-staging-server*'
      ]
    },
  })
```

As soon as you require the plugin you have the following tasks available:

### Setup

Run: ```shipit *your-server-env* setup``` to setup your deployment directories on the server.
This will create your ```deployTo``` folder as well as a ```releases``` folder inside it.

### Deploy

Run: ```shipit *your-server-env* deploy``` to build and deploy your PWA to the given server environment.
This will install the needed dependencies with the configured ```installCommand``` and afterwards
build your PWA locally with the configured ```buildCommand```.
If the build succeeds the plugin will create a new release folder and sync your files located in the
configured ```dirToCopy``` folder and symlink it to the ```current``` folder in your ```deployTo``` directory.
To finish your deployment it will remove the oldest release to be in line with the configured ```keepReleases``` setting.

### Rollback: shipit *your-server-env* rollback

Run: ```shipit *your-server-env* rollback``` to rollback the latest release.
This will also delete the release folder you are rolling back from.

### Events

You can run tasks on specific steps of the deployment process:

Step | Description
---------|----------
 installed | when dependencies are installed.
 built | when buildCommand has been executed.
 uploaded | when dirToCopy has been uploaded.
 symlinked | after the current symlink has been updated.
 finished | after the deploy is finished.

You can also run tasks once a rollback is finsihed:

Step | Description
---------|----------
 finished | after the rollback is finished.


#### Example

```javascript
module.exports = (shipit) => {
  require('shipit-release')(shipit)

  shipit.initConfig({
    ...
  })

  shipit.on('installed', async () => {
    return shipit.start('doStuff')
  })

  shipit.blTask('doStuff', async () => {
    // ... do stuff :)
  })
}
```

## Installation

Install the package with your favorite package manager:

```bash
npm install --save-dev shipit-release
```

```bash
yarn add --dev shipit-release
```

## ToDos

- Basic Test Setup
- Basic Test Coverage
- Setup Contribution Guidelines
- Cleanup index.js

## License

The gem is available as open source under the terms of the [MIT License](https://github.com/mortik/shipit-release/blob/master/LICENSE).
