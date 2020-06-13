import assert from 'assert';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Notify } from './notify';

const HOSTNAME = process.env.EI_HOSTNAME || 'edgeimpulse.com';
const STUDIO_ENDPOINT = 'https://studio.' + HOSTNAME;

describe('device integration', () => {
    let studioUrl: string;
    let projectId: number;

    describe('environment variables', () => {
        it('should have EI_USERNAME set', () => {
            assert.notEqual(typeof process.env.EI_USERNAME, 'undefined', 'EI_USERNAME should be set');
        });
        it('should have EI_PASSWORD set', () => {
            assert.notEqual(typeof process.env.EI_PASSWORD, 'undefined', 'EI_PASSWORD should be set');
        });
        it('should have EI_PROJECTNAME set', () => {
            assert.notEqual(typeof process.env.EI_PROJECTNAME, 'undefined', 'EI_PROJECTNAME should be set');
        });
        it('should have EI_HMACKEY set', () => {
            assert.notEqual(typeof process.env.EI_HMACKEY, 'undefined', 'EI_HMACKEY should be set');
        });
        it('should have EI_TESTWIFI set', () => {
            assert.notEqual(typeof process.env.EI_TESTWIFI, 'undefined', 'EI_TESTWIFI should be set');
        });
    });

    describe('logging in', () => {
        it('allows logging in', () => {
            browser.url(STUDIO_ENDPOINT + '/login');

            let username = $('input[name="username"]');
            username.setValue(process.env.EI_USERNAME || '');

            let password = $('input[name="password"]');
            password.setValue(process.env.EI_PASSWORD || '');

            $('input[type="submit"]').click();

            assert.equal(browser.getUrl().indexOf(STUDIO_ENDPOINT), 0);
            assert.equal(/^\/studio\/(\d+)\/?$/.test(browser.getUrl().replace(STUDIO_ENDPOINT, '')), true,
                'redirected to dashboard (' + browser.getUrl() + ')');

            assert.equal($('h1=' + process.env.EI_PROJECTNAME).isExisting(), true,
                'project title present');

            studioUrl = browser.getUrl();
            if (!studioUrl.endsWith('/')) {
                studioUrl += '/';
            }
            let projectNumber = studioUrl.match(/(\d+)\/$/);
            if (!projectNumber) {
                assert(false, 'Could not find projectNumber in studioUrl ' + studioUrl);
                return;
            }
            projectId = Number(projectNumber[1]);
        });
    });

    describe('daemon', () => {
        const deviceName = 'selenium-device-' + Date.now();
        const label = 'automated' + Date.now();
        let cp: ChildProcessWithoutNullStreams | undefined;

        describe('clearing configuration', () => {
            it('should clear configuration', () => {
                let childProcess = cp = spawn('edge-impulse-daemon', [
                        '--clean'
                    ], {
                    env: {
                        EI_HOST: HOSTNAME,
                        PATH: process.env.PATH
                    }
                });

                let clearedConfig = false;
                let connected = false;
                let exited = false;

                function waitForLine(str: string, cb: (data: string) => void) {
                    const onData = (data: Buffer) => {
                        if (data.toString('utf-8').indexOf(str) > -1) {
                            childProcess.stdout.off('data', onData);
                            cb(data.toString('utf-8'));
                        }
                    };
                    childProcess.stdout.on('data', onData);
                }

                let dataCache: string = '';
                childProcess.stdout.on('data', data => {
                    console.log(data.toString('utf-8'));
                    dataCache += data.toString('utf-8');
                });
                childProcess.stderr.on('data', data => {
                    console.log(data.toString('utf-8'));
                    dataCache += data.toString('utf-8');
                });
                childProcess.on('exit', () => {
                    exited = true;
                });

                waitForLine('What is your user name', () => {
                    childProcess.stdin.write(process.env.EI_USERNAME + '\n');
                });

                waitForLine('What is your password?', () => {
                    childProcess.stdin.write('PF8wPcSSp9DGcKEy\n');
                });

                waitForLine('Failed to connect to', (data) => {
                    assert(false, data);
                });

                waitForLine('Could not find any devices connected over serial port', data => {
                    assert(false, data);
                });

                waitForLine('but failed to read config', data => {
                    assert(false, data);
                });

                waitForLine('Clearing configuration OK', () => {
                    clearedConfig = true;
                });

                browser.waitUntil(() => clearedConfig, {
                    timeout: 20000,
                    timeoutMsg: 'Failed to clear config: ' + dataCache
                });

                // check that there are no devices connected
                assert(typeof studioUrl !== 'undefined', 'studioUrl should not be empty');
                browser.url(studioUrl + 'devices');

                browser.waitUntil(() => {
                    return $$('.device-remote-mgmt i.bg-success').length === 0;
                }, {
                    timeout: 30000,
                    timeoutMsg: 'device should have disconnected'
                });

                assert.equal(
                    $$('.device-remote-mgmt i.bg-success').length,
                    0,
                    'should have no connected devices'
                );

                // to which project?
                childProcess.stdin.write('\n');

                waitForLine('What name do you want to give this device?', () => {
                    childProcess.stdin.write(deviceName + '\n');
                });

                waitForLine('WiFi is not connected, do you want to set up a WiFi network now?', () => {
                    childProcess.stdin.write('n\n');
                });

                waitForLine('Authenticated', () => {
                    connected = true;
                });

                browser.waitUntil(() => connected, {
                    timeout: 20000,
                    timeoutMsg: 'Failed to connect: ' + dataCache
                });

                assert(clearedConfig, 'cleared config: ' + dataCache);
                assert(connected, 'cleared config: ' + dataCache);
                assert.equal(exited, false, 'should not have exited');

                browser.url(studioUrl + 'devices');
                assert.equal(
                    $$('.device-remote-mgmt i.bg-success').length,
                    1   ,
                    'should have one connected device'
                );
            });
        });

        describe('accelerometer', () => {
            describe('training data', () => {
                it('shows data posted by the ingestion API', () => {
                    assert(studioUrl, 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    browser.waitUntil(() => $$('#input-sample-sensor option').length === 2,
                        { timeout: 2000 });

                    assert.equal($$('#input-sample-sensor option').length, 2);

                    $('#input-category').setValue(label);
                    $('#input-sample-length').setValue(1000);
                    $('#input-sample-sensor').click();
                    $('option=Built-in accelerometer').click();

                    $('#input-sample-frequency').click();
                    $('option=62.5Hz').click();

                    $('#input-start-sampling').click();

                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Starting...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Waiting to start...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Sampling... (1s left)',
                        { timeout: 10000 });
                    assert.notEqual($('#input-start-sampling').getAttribute('class').indexOf('disabled'), -1);
                    assert.equal(Notify.isAlertOpen(), false);

                    // wait until visible in EI studio
                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting();
                    }, { timeout: 30000 });

                    browser.waitUntil(() => {
                        return $('#input-start-sampling').getAttribute('class').indexOf('disabled') === -1;
                     }, { timeout: 15000 });
                });

                it('has correct label', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-category').getText(), label);
                });

                it('passed signature verification', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    $('.acquisition-table .expand a').click();

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-signature').getText(), 'HS256');
                    assert.notEqual(parent.$('.aq-signature').getAttribute('title').indexOf(
                        process.env.EI_HMACKEY || ''), -1);
                    assert.notEqual(parent.$('.aq-signature i').getAttribute('class').indexOf('fa-check-circle'), -1);
                });

                it('allows deleting sample', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    assert(typeof label !== 'undefined', 'createdFilename should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    // open menu
                    $('td*=' + label).$('..').$('a.btn').click();
                    $('=Delete').click();
                    Notify.acceptAlert();

                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting() === false;
                    }, {
                        timeout: 15000,
                        timeoutMsg: label + ' should be deleted by JS'
                    });

                    browser.navigateTo(browser.getUrl());

                    assert.equal(
                        $('td*=' + label).isExisting(), false, label + ' should not exist');
                });
            });

            describe('testing data', () => {
                it('shows data posted by the ingestion API', () => {
                    assert(studioUrl, 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    browser.waitUntil(() => $$('#input-sample-sensor option').length === 2,
                        { timeout:  2000 });

                    assert.equal($$('#input-sample-sensor option').length, 2);

                    $('#input-category').setValue(label);
                    $('#input-sample-length').setValue(1000);
                    $('#input-sample-sensor').click();
                    $('option=Built-in accelerometer').click();

                    $('#input-sample-frequency').click();
                    $('option=62.5Hz').click();

                    $('#input-start-sampling').click();

                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Starting...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Waiting to start...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Sampling... (1s left)',
                        { timeout: 10000 });
                    assert.notEqual($('#input-start-sampling').getAttribute('class').indexOf('disabled'), -1);
                    assert.equal(Notify.isAlertOpen(), false);

                    // wait until visible in EI studio
                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting();
                    }, { timeout: 30000 });

                    browser.waitUntil(() => {
                        return $('#input-start-sampling').getAttribute('class').indexOf('disabled') === -1;
                     }, { timeout: 15000 });
                });

                it('has correct label', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-category').getText(), label);
                });

                it('passed signature verification', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    $('.acquisition-table .expand a').click();

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-signature').getText(), 'HS256');
                    assert.notEqual(parent.$('.aq-signature').getAttribute('title').indexOf(
                        process.env.EI_HMACKEY || ''), -1);
                    assert.notEqual(parent.$('.aq-signature i').getAttribute('class').indexOf('fa-check-circle'), -1);
                });

                it('allows deleting sample', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    assert(typeof label !== 'undefined', 'createdFilename should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    // open menu
                    $('td*=' + label).$('..').$('a.btn').click();
                    $('=Delete').click();
                    Notify.acceptAlert();

                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting() === false;
                    }, {
                        timeout: 15000,
                        timeoutMsg: label + ' should be deleted by JS'
                    });

                    browser.navigateTo(browser.getUrl());

                    assert.equal(
                        $('td*=' + label).isExisting(), false, label + ' should not exist');
                });
            });
        });

        describe('microphone', () => {
            describe('training data', () => {
                it('shows data posted by the ingestion API', () => {
                    assert(studioUrl, 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    assert.equal($$('#input-sample-sensor option').length, 2);

                    $('#input-category').setValue(label);
                    $('#input-sample-length').setValue(1000);
                    $('#input-sample-sensor').click();
                    $('option=Built-in microphone').click();

                    $('#input-start-sampling').click();

                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Starting...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Waiting to start...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Sampling... (1s left)',
                        { timeout: 10000 });
                    assert.notEqual($('#input-start-sampling').getAttribute('class').indexOf('disabled'), -1);
                    assert.equal(Notify.isAlertOpen(), false);

                    // wait until visible in EI studio
                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting();
                    }, { timeout: 30000 });

                    browser.waitUntil(() => {
                        return $('#input-start-sampling').getAttribute('class').indexOf('disabled') === -1;
                     }, { timeout: 15000 });
                });

                it('has correct label', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-category').getText(), label);
                });

                it('passed signature verification', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    $('.acquisition-table .expand a').click();

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-signature').getText(), 'HS256');
                    assert.notEqual(parent.$('.aq-signature').getAttribute('title').indexOf(
                        process.env.EI_HMACKEY || ''), -1);
                    assert.notEqual(parent.$('.aq-signature i').getAttribute('class').indexOf('fa-check-circle'), -1);
                });

                it('allows deleting sample', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    assert(typeof label !== 'undefined', 'createdFilename should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    // open menu
                    $('td*=' + label).$('..').$('a.btn').click();
                    $('=Delete').click();
                    Notify.acceptAlert();

                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting() === false;
                    }, {
                        timeout: 15000,
                        timeoutMsg: label + ' should be deleted by JS'
                    });

                    browser.navigateTo(browser.getUrl());

                    assert.equal(
                        $('td*=' + label).isExisting(), false, label + ' should not exist');
                });
            });

            describe('testing data', () => {
                it('shows data posted by the ingestion API', () => {
                    assert(studioUrl, 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    assert.equal($$('#input-sample-sensor option').length, 2);

                    $('#input-category').setValue(label);
                    $('#input-sample-length').setValue(1000);
                    $('#input-sample-sensor').click();
                    $('option=Built-in microphone').click();

                    $('#input-start-sampling').click();

                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Starting...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Waiting to start...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Sampling... (1s left)',
                        { timeout: 10000 });
                    assert.notEqual($('#input-start-sampling').getAttribute('class').indexOf('disabled'), -1);
                    assert.equal(Notify.isAlertOpen(), false);

                    // wait until visible in EI studio
                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting();
                    }, { timeout: 30000 });

                    browser.waitUntil(() => {
                        return $('#input-start-sampling').getAttribute('class').indexOf('disabled') === -1;
                     }, { timeout: 15000 });
                });

                it('has correct label', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-category').getText(), label);
                });

                it('passed signature verification', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    $('.acquisition-table .expand a').click();

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-signature').getText(), 'HS256');
                    assert.notEqual(parent.$('.aq-signature').getAttribute('title').indexOf(
                        process.env.EI_HMACKEY || ''), -1);
                    assert.notEqual(parent.$('.aq-signature i').getAttribute('class').indexOf('fa-check-circle'), -1);
                });

                it('allows deleting sample', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    assert(typeof label !== 'undefined', 'createdFilename should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    // open menu
                    $('td*=' + label).$('..').$('a.btn').click();
                    $('=Delete').click();
                    Notify.acceptAlert();

                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting() === false;
                    }, {
                        timeout: 15000,
                        timeoutMsg: label + ' should be deleted by JS'
                    });

                    browser.navigateTo(browser.getUrl());

                    assert.equal(
                        $('td*=' + label).isExisting(), false, label + ' should not exist');
                });
            });
        });

        describe('shutting down daemon', () => {
            it('shuts down daemon', () => {
                assert.notEqual(typeof cp, 'undefined');
                if (!cp) return;

                cp.kill('SIGINT');
            });
        });
    });

    describe('wifi', () => {
        if (process.env.EI_TESTWIFI !== '1') return;

        const deviceName = 'selenium-device-' + Date.now();
        const label = 'automated' + Date.now();

        describe('environmental variables', () => {
            it('has wifi credentials set', () => {
                console.log('env', process.env);
                assert.notEqual(typeof process.env.SELENIUM_WIFI_SSID, 'undefined',
                    'SELENIUM_WIFI_SSID environmental variable should be set');
                assert.notEqual(typeof process.env.SELENIUM_WIFI_PASSWORD, 'undefined',
                    'SELENIUM_WIFI_PASSWORD environmental variable should be set');
            });
        });

        describe('clearing configuration', () => {
            it('should clear configuration', () => {
                let childProcess = spawn('edge-impulse-daemon', [
                        '--clean'
                    ], {
                    env: {
                        EI_HOST: HOSTNAME,
                        PATH: process.env.PATH
                    }
                });

                let clearedConfig = false;
                let connected = false;
                let exited = false;

                function waitForLine(str: string, cb: (data: string) => void) {
                    const onData = (data: Buffer) => {
                        if (data.toString('utf-8').indexOf(str) > -1) {
                            childProcess.stdout.off('data', onData);
                            cb(data.toString('utf-8'));
                        }
                    };
                    childProcess.stdout.on('data', onData);
                }

                let dataCache: string = '';
                childProcess.stdout.on('data', data => {
                    console.log(data.toString('utf-8'));
                    dataCache += data.toString('utf-8');
                });
                childProcess.stderr.on('data', data => {
                    console.log(data.toString('utf-8'));
                    dataCache += data.toString('utf-8');
                });
                childProcess.on('exit', () => {
                    exited = true;
                });

                waitForLine('What is your user name', () => {
                    childProcess.stdin.write(process.env.EI_USERNAME + '\n');
                });

                waitForLine('What is your password?', () => {
                    childProcess.stdin.write('PF8wPcSSp9DGcKEy\n');
                });

                waitForLine('Failed to connect to', (data) => {
                    assert(false, data);
                });

                waitForLine('Could not find any devices connected over serial port', data => {
                    assert(false, data);
                });

                waitForLine('but failed to read config', data => {
                    assert(false, data);
                });

                waitForLine('Clearing configuration OK', () => {
                    clearedConfig = true;
                });

                browser.waitUntil(() => clearedConfig, {
                    timeout: 20000,
                    timeoutMsg: 'Failed to clear config: ' + dataCache
                });

                // check that there are no devices connected
                assert(typeof studioUrl !== 'undefined', 'studioUrl should not be empty');
                browser.url(studioUrl + 'devices');

                browser.waitUntil(() => {
                    return $$('.device-remote-mgmt i.bg-success').length === 0;
                }, {
                    timeout: 30000,
                    timeoutMsg: 'device should have disconnected'
                });

                assert.equal(
                    $$('.device-remote-mgmt i.bg-success').length,
                    0,
                    'should have no connected devices'
                );

                // to which project?
                childProcess.stdin.write('\n');

                waitForLine('What name do you want to give this device?', () => {
                    childProcess.stdin.write(deviceName + '\n');
                });

                waitForLine('WiFi is not connected, do you want to set up a WiFi network now?', () => {
                    childProcess.stdin.write('y\n');
                });

                waitForLine('Select WiFi network ', data => {
                    let networks = data.split('\n').filter(d => d.indexOf('SSID') > -1);
                    let lines = networks.findIndex(s => s.indexOf('SSID: ' + process.env.SELENIUM_WIFI_SSID) > -1);
                    for (let ix = 0; ix < lines; ix++) {
                        childProcess.stdin.write('\u001b[B');
                    }
                    childProcess.stdin.write('\n');
                });

                waitForLine('Enter password for network', () => {
                    childProcess.stdin.write(process.env.SELENIUM_WIFI_PASSWORD + '\n');
                });

                waitForLine('Device is connected over WiFi to remote management API', () => {
                    connected = true;
                });

                browser.waitUntil(() => connected, {
                    timeout: 20000,
                    timeoutMsg: 'Failed to connect: ' + dataCache
                });

                assert(clearedConfig, 'cleared config: ' + dataCache);
                assert(connected, 'cleared config: ' + dataCache);
                assert.equal(exited, true, 'should have exited');

                browser.url(studioUrl + 'devices');
                assert.equal(
                    $$('.device-remote-mgmt i.bg-success').length,
                    1,
                    'should have one connected device'
                );
            });
        });

        describe('accelerometer', () => {
            describe('training data', () => {
                it('shows data posted by the ingestion API', () => {
                    assert(studioUrl, 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    browser.waitUntil(() => $$('#input-sample-sensor option').length === 2,
                        { timeout: 2000 });

                    assert.equal($$('#input-sample-sensor option').length, 2);

                    $('#input-category').setValue(label);
                    $('#input-sample-length').setValue(1000);
                    $('#input-sample-sensor').click();
                    $('option=Built-in accelerometer').click();

                    $('#input-sample-frequency').click();
                    $('option=62.5Hz').click();

                    $('#input-start-sampling').click();

                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Starting...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Waiting to start...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Sampling... (1s left)',
                        { timeout: 10000 });
                    assert.notEqual($('#input-start-sampling').getAttribute('class').indexOf('disabled'), -1);
                    assert.equal(Notify.isAlertOpen(), false);

                    // wait until visible in EI studio
                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting();
                    }, { timeout: 30000 });

                    browser.waitUntil(() => {
                        return $('#input-start-sampling').getAttribute('class').indexOf('disabled') === -1;
                     }, { timeout: 15000 });
                });

                it('has correct label', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-category').getText(), label);
                });

                it('passed signature verification', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    $('.acquisition-table .expand a').click();

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-signature').getText(), 'HS256');
                    assert.notEqual(parent.$('.aq-signature').getAttribute('title').indexOf(
                        process.env.EI_HMACKEY || ''), -1);
                    assert.notEqual(parent.$('.aq-signature i').getAttribute('class').indexOf('fa-check-circle'), -1);
                });

                it('allows deleting sample', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    assert(typeof label !== 'undefined', 'createdFilename should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    // open menu
                    $('td*=' + label).$('..').$('a.btn').click();
                    $('=Delete').click();
                    Notify.acceptAlert();

                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting() === false;
                    }, {
                        timeout: 15000,
                        timeoutMsg: label + ' should be deleted by JS'
                    });

                    browser.navigateTo(browser.getUrl());

                    assert.equal(
                        $('td*=' + label).isExisting(), false, label + ' should not exist');
                });
            });

            describe('testing data', () => {
                it('shows data posted by the ingestion API', () => {
                    assert(studioUrl, 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    browser.waitUntil(() => $$('#input-sample-sensor option').length === 2,
                        { timeout: 2000 });

                    assert.equal($$('#input-sample-sensor option').length, 2);

                    $('#input-category').setValue(label);
                    $('#input-sample-length').setValue(1000);
                    $('#input-sample-sensor').click();
                    $('option=Built-in accelerometer').click();

                    $('#input-sample-frequency').click();
                    $('option=62.5Hz').click();

                    $('#input-start-sampling').click();

                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Starting...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Waiting to start...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Sampling... (1s left)',
                        { timeout: 10000 });
                    assert.notEqual($('#input-start-sampling').getAttribute('class').indexOf('disabled'), -1);
                    assert.equal(Notify.isAlertOpen(), false);

                    // wait until visible in EI studio
                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting();
                    }, { timeout: 30000 });

                    browser.waitUntil(() => {
                        return $('#input-start-sampling').getAttribute('class').indexOf('disabled') === -1;
                     }, { timeout: 15000 });
                });

                it('has correct label', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-category').getText(), label);
                });

                it('passed signature verification', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    $('.acquisition-table .expand a').click();

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-signature').getText(), 'HS256');
                    assert.notEqual(parent.$('.aq-signature').getAttribute('title').indexOf(
                        process.env.EI_HMACKEY || ''), -1);
                    assert.notEqual(parent.$('.aq-signature i').getAttribute('class').indexOf('fa-check-circle'), -1);
                });

                it('allows deleting sample', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    assert(typeof label !== 'undefined', 'createdFilename should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    // open menu
                    $('td*=' + label).$('..').$('a.btn').click();
                    $('=Delete').click();
                    Notify.acceptAlert();

                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting() === false;
                    }, {
                        timeout: 15000,
                        timeoutMsg: label + ' should be deleted by JS'
                    });

                    browser.navigateTo(browser.getUrl());

                    assert.equal(
                        $('td*=' + label).isExisting(), false, label + ' should not exist');
                });
            });
        });

        describe('microphone', () => {
            describe('training data', () => {
                it('shows data posted by the ingestion API', () => {
                    assert(studioUrl, 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    assert.equal($$('#input-sample-sensor option').length, 2);

                    $('#input-category').setValue(label);
                    $('#input-sample-length').setValue(1000);
                    $('#input-sample-sensor').click();
                    $('option=Built-in microphone').click();

                    $('#input-start-sampling').click();

                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Starting...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Waiting to start...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Sampling... (1s left)',
                        { timeout: 10000 });
                    assert.notEqual($('#input-start-sampling').getAttribute('class').indexOf('disabled'), -1);
                    assert.equal(Notify.isAlertOpen(), false);

                    // wait until visible in EI studio
                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting();
                    }, { timeout: 30000 });

                    browser.waitUntil(() => {
                        return $('#input-start-sampling').getAttribute('class').indexOf('disabled') === -1;
                     }, { timeout: 15000 });
                });

                it('has correct label', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-category').getText(), label);
                });

                it('passed signature verification', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    $('.acquisition-table .expand a').click();

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-signature').getText(), 'HS256');
                    assert.notEqual(parent.$('.aq-signature').getAttribute('title').indexOf(
                        process.env.EI_HMACKEY || ''), -1);
                    assert.notEqual(parent.$('.aq-signature i').getAttribute('class').indexOf('fa-check-circle'), -1);
                });

                it('allows deleting sample', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    assert(typeof label !== 'undefined', 'createdFilename should not be empty');
                    browser.url(studioUrl + 'acquisition/training');

                    // open menu
                    $('td*=' + label).$('..').$('a.btn').click();
                    $('=Delete').click();
                    Notify.acceptAlert();

                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting() === false;
                    }, {
                        timeout: 15000,
                        timeoutMsg: label + ' should be deleted by JS'
                    });

                    browser.navigateTo(browser.getUrl());

                    assert.equal(
                        $('td*=' + label).isExisting(), false, label + ' should not exist');
                });
            });

            describe('testing data', () => {
                it('shows data posted by the ingestion API', () => {
                    assert(studioUrl, 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    assert.equal($$('#input-sample-sensor option').length, 2);

                    $('#input-category').setValue(label);
                    $('#input-sample-length').setValue(1000);
                    $('#input-sample-sensor').click();
                    $('option=Built-in microphone').click();

                    $('#input-start-sampling').click();

                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Starting...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Waiting to start...',
                        { timeout: 10000 });
                    browser.waitUntil(() => $('#input-start-sampling').getText() === 'Sampling... (1s left)',
                        { timeout: 10000 });
                    assert.notEqual($('#input-start-sampling').getAttribute('class').indexOf('disabled'), -1);
                    assert.equal(Notify.isAlertOpen(), false);

                    // wait until visible in EI studio
                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting();
                    }, { timeout: 30000 });

                    browser.waitUntil(() => {
                        return $('#input-start-sampling').getAttribute('class').indexOf('disabled') === -1;
                     }, { timeout: 15000 });
                });

                it('has correct label', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-category').getText(), label);
                });

                it('passed signature verification', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    $('.acquisition-table .expand a').click();

                    // check the content of our item (added through Ajax call)
                    let parent = $('td*=' + label).$('..');
                    assert.equal(parent.$('.aq-signature').getText(), 'HS256');
                    assert.notEqual(parent.$('.aq-signature').getAttribute('title').indexOf(
                        process.env.EI_HMACKEY || ''), -1);
                    assert.notEqual(parent.$('.aq-signature i').getAttribute('class').indexOf('fa-check-circle'), -1);
                });

                it('allows deleting sample', () => {
                    assert(studioUrl !== 'undefined', 'studioUrl should not be empty');
                    assert(typeof label !== 'undefined', 'createdFilename should not be empty');
                    browser.url(studioUrl + 'acquisition/testing');

                    // open menu
                    $('td*=' + label).$('..').$('a.btn').click();
                    $('=Delete').click();
                    Notify.acceptAlert();

                    browser.waitUntil(() => {
                        return $('td*=' + label).isExisting() === false;
                    }, {
                        timeout: 15000,
                        timeoutMsg: label + ' should be deleted by JS'
                    });

                    browser.navigateTo(browser.getUrl());

                    assert.equal(
                        $('td*=' + label).isExisting(), false, label + ' should not exist');
                });
            });
        });
    });
});
