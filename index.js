const path = require('path2/posix')
const utils = require('shipit-utils')

function getCurrentRelease(result) {
  return result.map(item => item.stdout.replace(/\n$/, '').split('/').pop())[0]
}

function computeReleases(result) {
  const releases = result.map(item => item.stdout.replace(/\n$/, '').split('/').pop().split('\n'))
  return [].concat(...releases)
}

function getDeployTime() {
  return new Date().toISOString().replace(/-|:|T/g, '').substring(0, 14)
}

function extendShipit(shipit) {
  const config = {
    keepReleases: 5,
    deployTo: '',
    dirToCopy: 'build',
    installCommand: 'npm install',
    buildCommand: 'npm run build',
    ...shipit.config,
  }
  Object.assign(shipit.config, config)

  /* eslint-disable no-param-reassign */
  shipit.currentPath = path.join(shipit.config.deployTo, 'current')
  shipit.releasesPath = path.join(shipit.config.deployTo, 'releases')
  shipit.deployTime = shipit.deployTime || getDeployTime()
  shipit.logInfo = function logInfo(message) {
    shipit.log(`\n\x1b[32m----->\x1b[0m ${message}`)
  }
  shipit.logError = function logError(message) {
    shipit.log(`\n\x1b[33m !    \x1b[0m ${message}`)
  }
  /* eslint-enable no-param-reassign */
}

/* eslint-disable func-names */
module.exports = function(shipit) {
  shipit.task('setup', async () => {
    extendShipit(shipit)

    shipit.logInfo('Creating deployTo directory')
    await shipit.remote(`mkdir -p ${shipit.config.deployTo}`)

    shipit.logInfo('Creating releases directory')
    await shipit.remote(`mkdir -p ${shipit.releasesPath}`)

    return shipit.emit('setup')
  })

  utils.registerTask(shipit, 'deploy', [
    'deploy:install',
    'deploy:build',
    'deploy:upload',
    'deploy:symlink',
    'deploy:cleanup',
    'deploy:finish',
  ])

  shipit.blTask('deploy:install', async () => {
    extendShipit(shipit)

    shipit.logInfo('Installing deps')
    await shipit.local(shipit.config.installCommand)

    shipit.emit('installed')
  })

  shipit.blTask('deploy:build', async () => {
    extendShipit(shipit)

    shipit.logInfo('Build App')
    await shipit.local(shipit.config.buildCommand)

    shipit.emit('built')
  })

  shipit.blTask('deploy:upload', async () => {
    extendShipit(shipit)

    const deployPath = path.join(shipit.releasesPath, shipit.deployTime)

    shipit.logInfo(`Creating new Release directory "${shipit.deployTime}"`)
    await shipit.remote(`mkdir -p ${deployPath}`)

    shipit.logInfo('Uploading new Release')
    await shipit.copyToRemote(`${shipit.config.dirToCopy}/`, `${deployPath}/`)

    shipit.emit('uploaded')
  })

  shipit.blTask('deploy:symlink', async () => {
    extendShipit(shipit)

    const deployPath = path.join(shipit.releasesPath, shipit.deployTime)

    shipit.logInfo('Updating current Symlink')
    await shipit.remote(`ln -nfs ${deployPath} ${shipit.currentPath}`)

    shipit.emit('symlinked')
  })

  shipit.blTask('deploy:cleanup', async () => {
    extendShipit(shipit)

    shipit.logInfo(`Keeping "${shipit.config.keepReleases}" last releases, cleaning others`)

    const command = `(ls -rd ${shipit.releasesPath}/*|head -n ${shipit.config.keepReleases};ls -d ${shipit.releasesPath}/*)|sort|uniq -u|xargs rm -rf`
    await shipit.remote(command)
  })

  shipit.task('deploy:finish', () => {
    extendShipit(shipit)

    shipit.emit('finished')

    shipit.logInfo(`Done. Deployed version ${shipit.deployTime}`)
  })

  shipit.task('rollback', async () => {
    extendShipit(shipit)

    const current = getCurrentRelease(await shipit.remote(`readlink ${shipit.currentPath}`))
    if (!current) {
      shipit.logError('No Current Release - nothing to rollback')
      return null
    }

    const releases = computeReleases(await shipit.remote(`ls -r1 ${shipit.releasesPath}`))
    const previousRelease = releases.filter(item => item !== current)[0]
    if (!previousRelease) {
      shipit.logError('No Previous Release - nothing to rollback')
      return null
    }

    shipit.logInfo('Rolling back to previous Release...')
    await shipit.remote(`ln -nfs ${shipit.releasesPath}/${previousRelease} ${shipit.currentPath}`)
    await shipit.remote(`rm -rf ${shipit.releasesPath}/${current}`)

    return shipit.logInfo(`Done. Rolled back to version ${previousRelease}`)
  })
}
/* eslint-enable func-names */
