const path = require('path2/posix')

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
    installCommand: 'yarn install',
    buildCommand: 'yarn run build',
    ...shipit.config,
  }
  Object.assign(shipit.config, config)

  /* eslint-disable no-param-reassign */
  shipit.currentPath = path.join(shipit.config.deployTo, 'current')
  shipit.releasesPath = path.join(shipit.config.deployTo, 'releases')
  shipit.deployTime = getDeployTime()
  /* eslint-enable no-param-reassign */
}

/* eslint-disable func-names */
module.exports = function(shipit) {
  function logInfo(message) {
    shipit.log(`\n\x1b[32m----->\x1b[0m ${message}`)
  }

  function logError(message) {
    shipit.log(`\n\x1b[33m !    \x1b[0m ${message}`)
  }

  shipit.task('setup', async () => {
    extendShipit(shipit)

    logInfo('Creating deployTo directory')
    await shipit.remote(`mkdir -p ${shipit.config.deployTo}`)

    logInfo('Creating releases directory')
    return shipit.remote(`mkdir -p ${shipit.releasesPath}`)
  })

  shipit.task('deploy', async () => {
    extendShipit(shipit)

    const deployPath = path.join(shipit.releasesPath, shipit.deployTime)

    logInfo('Installing deps & Building')
    await shipit.local(shipit.config.installCommand)
    await shipit.local(shipit.config.buildCommand)

    shipit.emit('build')

    logInfo(`Creating new Release directory "${shipit.deployTime}"`)
    await shipit.remote(`mkdir -p ${deployPath}`)

    logInfo('Uploading new Release')
    await shipit.copyToRemote(`${shipit.config.dirToCopy}/`, `${deployPath}/`)

    shipit.emit('uploaded')

    logInfo('Updating current Symlink')
    await shipit.remote(`ln -nfs ${deployPath} ${shipit.currentPath}`)

    logInfo(`Keeping "${shipit.config.keepReleases}" last releases, cleaning others`)
    const command = `(ls -rd ${shipit.releasesPath}/*|head -n ${shipit.config.keepReleases};ls -d ${shipit.releasesPath}/*)|sort|uniq -u|xargs rm -rf`
    await shipit.remote(command)

    shipit.emit('finished')

    return logInfo(`Done. Deployed version ${shipit.deployTime}`)
  })

  shipit.task('rollback', async () => {
    extendShipit(shipit)

    const current = getCurrentRelease(await shipit.remote(`readlink ${shipit.currentPath}`))
    if (!current) {
      logError('No Current Release - nothing to rollback')
      return null
    }

    const releases = computeReleases(await shipit.remote(`ls -r1 ${shipit.releasesPath}`))
    const previousRelease = releases.filter(item => item !== current)[0]
    if (!previousRelease) {
      logError('No Previous Release - nothing to rollback')
      return null
    }

    logInfo('Rolling back to previous Release...')
    await shipit.remote(`ln -nfs ${shipit.releasesPath}/${previousRelease} ${shipit.currentPath}`)
    await shipit.remote(`rm -rf ${shipit.releasesPath}/${current}`)

    return logInfo(`Done. Rolled back to version ${previousRelease}`)
  })
}
/* eslint-enable func-names */
