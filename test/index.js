const sinon = require('sinon')
const chai = require('chai')
const sinonChai = require('sinon-chai')
const Shipit = require('shipit-cli')
const shipitRelease = require('../')

const { expect } = chai
chai.use(sinonChai)

describe('Shipit-Release', () => {
  let shipit
  let remoteStub
  let localStub

  beforeEach(() => {
    shipit = new Shipit({
      environment: 'test',
      log: sinon.stub(),
    })
    shipit.stage = 'test'

    shipitRelease(shipit)

    shipit.initConfig({
      default: {
        installCommand: 'npm ci',
      },
      test: {
        deployTo: '/tmplocal/deploy',
      },
    })

    remoteStub = sinon.stub(shipit, 'remote').resolves([])
    localStub = sinon.stub(shipit, 'local').resolves([])
    sinon.stub(shipit, 'emit')
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
  })
})
