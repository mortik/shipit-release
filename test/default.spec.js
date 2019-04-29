const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const Shipit = require('shipit-cli')
const shipitRelease = require('../')

const { expect } = chai
chai.use(sinonChai)

describe('Shipit-Release Default Functions', () => {
  let shipit
  let remoteStub
  let localStub
  let copyToRemoteStub
  const now = new Date()
  const releaseDir = now.toISOString().replace(/-|:|T/g, '').substring(0, 14)
  let clock

  beforeEach(() => {
    clock = sinon.useFakeTimers(now.getTime())

    shipit = new Shipit({
      environment: 'test',
      log: sinon.stub(),
    })
    shipit.stage = 'test'

    shipitRelease(shipit)

    shipit.initConfig({
      default: {
        keepReleases: 10,
        installCommand: 'npm ci',
      },
      test: {
        deployTo: '/tmplocal/deploy',
      },
    })

    remoteStub = sinon.stub(shipit, 'remote').resolves([])
    localStub = sinon.stub(shipit, 'local').resolves([])
    copyToRemoteStub = sinon.stub(shipit, 'copyToRemote').resolves([])
    sinon.stub(shipit, 'emit')
  })

  afterEach(() => {
    clock.restore()
  })

  describe('Setup', () => {
    it('creates dirs', (done) => {
      shipit.start('setup', () => {
        expect(shipit.remote).calledWith('mkdir -p /tmplocal/deploy')
        expect(shipit.remote).calledWith('mkdir -p /tmplocal/deploy/releases')
        expect(remoteStub.callCount).to.equal(2)
        done()
      })
    })

    it('emits event', (done) => {
      shipit.start('setup', () => {
        expect(shipit.emit).calledWith('setup')
        done()
      })
    })
  })

  describe('deploy:install', () => {
    it('calls install command', (done) => {
      shipit.start('deploy:install', () => {
        expect(shipit.local).calledWith('npm ci')
        expect(localStub.callCount).to.equal(1)
        done()
      })
    })

    it('emits event', (done) => {
      shipit.start('deploy:install', () => {
        expect(shipit.emit).calledWith('installed')
        done()
      })
    })
  })

  describe('deploy:build', () => {
    it('calls build command', (done) => {
      shipit.start('deploy:build', () => {
        expect(shipit.local).calledWith('npm run build')
        expect(localStub.callCount).to.equal(1)
        done()
      })
    })

    it('emits event', (done) => {
      shipit.start('deploy:build', () => {
        expect(shipit.emit).calledWith('built')
        done()
      })
    })
  })

  describe('deploy:upload', () => {
    it('calls upload command', (done) => {
      shipit.start('deploy:upload', () => {
        expect(shipit.remote).calledWith(`mkdir -p /tmplocal/deploy/releases/${releaseDir}`)
        expect(remoteStub.callCount).to.equal(1)
        expect(shipit.copyToRemote).calledWith('build/', `/tmplocal/deploy/releases/${releaseDir}/`)
        expect(copyToRemoteStub.callCount).to.equal(1)
        done()
      })
    })

    it('emits event', (done) => {
      shipit.start('deploy:upload', () => {
        expect(shipit.emit).calledWith('uploaded')
        done()
      })
    })
  })

  describe('deploy:symlink', () => {
    it('calls symlink command', (done) => {
      shipit.start('deploy:symlink', () => {
        expect(shipit.remote).calledWith(`ln -nfs /tmplocal/deploy/releases/${releaseDir} /tmplocal/deploy/current`)
        expect(remoteStub.callCount).to.equal(1)
        done()
      })
    })

    it('emits event', (done) => {
      shipit.start('deploy:symlink', () => {
        expect(shipit.emit).calledWith('symlinked')
        done()
      })
    })
  })

  describe('deploy:cleanup', () => {
    it('calls cleanup command', (done) => {
      shipit.start('deploy:cleanup', () => {
        expect(shipit.remote).calledWith('(ls -rd /tmplocal/deploy/releases/*|head -n 10;ls -d /tmplocal/deploy/releases/*)|sort|uniq -u|xargs rm -rf')
        expect(remoteStub.callCount).to.equal(1)
        done()
      })
    })
  })

  describe('deploy:finish', () => {
    it('emits event', (done) => {
      shipit.start('deploy:finish', () => {
        expect(shipit.emit).calledWith('finished')
        done()
      })
    })
  })
})
