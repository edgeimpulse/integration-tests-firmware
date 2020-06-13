# Edge Impulse device integration tests

This contains device integration tests for the Edge Impulse [remote management](https://docs.edgeimpulse.com/reference-link/remote-management) and [serial protocols](https://docs.edgeimpulse.com/reference#remote-mgmt-serial-protocol). It contains tests for both serial and IP communication, and sampling from the accelerometer and the microphone. If your device has a different sensor configuration you'll have to update the tests.

## How to run

1. Create an Edge Impulse account specifically for the tests. Ensure that there is only one project listed under the account, and that the account is activated.
1. Install the [Edge Impulse CLI](https://docs.edgeimpulse.com/docs/cli-installation) and ensure that the CLI can see your development board. If not, you'll need to provide a PR for the CLI first.
1. Clone this repository.

    ```
    $ git clone https://github.com/edgeimpulse/integration-tests-firmware
    ```

1. Install dependencies:

    ```
    $ npm install
    ```

1. Run the tests:

    ```
    ./node_modules/typescript/bin/tsc -p . && \
        EI_USERNAME="xxx" \
        EI_PASSWORD="xxx" \
        EI_PROJECTNAME="xxx" \
        EI_HMACKEY="xxx" \
        EI_TESTWIFI=1 \
        SELENIUM_WIFI_SSID="xxx" \
        SELENIUM_WIFI_PASSWORD="xxx" \
        ./node_modules/.bin/wdio wdio.headless.chrome.js
    ```

    With these options:

    * `EI_USERNAME` - the Edge Impulse username of your test account.
    * `EI_PASSWORD` - the Edge Impulse password of your test account.
    * `EI_PROJECTNAME` - the name of the only project for your test account.
    * `EI_HMACKEY` - the development HMAC key for the project (see **Keys** under the studio's dashboard).
    * `EI_TESTWIFI` - whether to test WiFi connection.
    * `SELENIUM_WIFI_SSID` - if WiFi was enabled, the SSID of the network.
    * `SELENIUM_WIFI_PASSWORD` - if WiFi was enabled, the SSID of the network.

1. This yields a test report:

    ```
    [chrome  mac os x #0-0] Spec: /Users/janjongboom/repos/integration-tests-firmware/build/device-integration.js
    [chrome  mac os x #0-0] Running: chrome on mac os x
    [chrome  mac os x #0-0] Session ID: b81ab4177bdb379c34e09d8590cd1b77
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0] device integration
    [chrome  mac os x #0-0]     environment variables
    [chrome  mac os x #0-0]        ✓ should have EI_USERNAME set
    [chrome  mac os x #0-0]        ✓ should have EI_PASSWORD set
    [chrome  mac os x #0-0]        ✓ should have EI_PROJECTNAME set
    [chrome  mac os x #0-0]        ✓ should have EI_HMACKEY set
    [chrome  mac os x #0-0]        ✓ should have EI_TESTWIFI set
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]     logging in
    [chrome  mac os x #0-0]        ✓ allows logging in
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]     daemon
    [chrome  mac os x #0-0]         clearing configuration
    [chrome  mac os x #0-0]            ✓ should clear configuration
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]         accelerometer
    [chrome  mac os x #0-0]             training data
    [chrome  mac os x #0-0]                ✓ shows data posted by the ingestion API
    [chrome  mac os x #0-0]                ✓ has correct label
    [chrome  mac os x #0-0]                ✓ passed signature verification
    [chrome  mac os x #0-0]                ✓ allows deleting sample
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]             testing data
    [chrome  mac os x #0-0]                ✓ shows data posted by the ingestion API
    [chrome  mac os x #0-0]                ✓ has correct label
    [chrome  mac os x #0-0]                ✓ passed signature verification
    [chrome  mac os x #0-0]                ✓ allows deleting sample
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]         microphone
    [chrome  mac os x #0-0]             training data
    [chrome  mac os x #0-0]                ✓ shows data posted by the ingestion API
    [chrome  mac os x #0-0]                ✓ has correct label
    [chrome  mac os x #0-0]                ✓ passed signature verification
    [chrome  mac os x #0-0]                ✓ allows deleting sample
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]             testing data
    [chrome  mac os x #0-0]                ✓ shows data posted by the ingestion API
    [chrome  mac os x #0-0]                ✓ has correct label
    [chrome  mac os x #0-0]                ✓ passed signature verification
    [chrome  mac os x #0-0]                ✓ allows deleting sample
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]         shutting down daemon
    [chrome  mac os x #0-0]            ✓ shuts down daemon
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]     wifi
    [chrome  mac os x #0-0]         environmental variables
    [chrome  mac os x #0-0]            ✓ has wifi credentials set
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]         clearing configuration
    [chrome  mac os x #0-0]            ✓ should clear configuration
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]         accelerometer
    [chrome  mac os x #0-0]             training data
    [chrome  mac os x #0-0]                ✓ shows data posted by the ingestion API
    [chrome  mac os x #0-0]                ✓ has correct label
    [chrome  mac os x #0-0]                ✓ passed signature verification
    [chrome  mac os x #0-0]                ✓ allows deleting sample
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]             testing data
    [chrome  mac os x #0-0]                ✓ shows data posted by the ingestion API
    [chrome  mac os x #0-0]                ✓ has correct label
    [chrome  mac os x #0-0]                ✓ passed signature verification
    [chrome  mac os x #0-0]                ✓ allows deleting sample
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]         microphone
    [chrome  mac os x #0-0]             training data
    [chrome  mac os x #0-0]                ✓ shows data posted by the ingestion API
    [chrome  mac os x #0-0]                ✓ has correct label
    [chrome  mac os x #0-0]                ✓ passed signature verification
    [chrome  mac os x #0-0]                ✓ allows deleting sample
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0]             testing data
    [chrome  mac os x #0-0]                ✓ shows data posted by the ingestion API
    [chrome  mac os x #0-0]                ✓ has correct label
    [chrome  mac os x #0-0]                ✓ passed signature verification
    [chrome  mac os x #0-0]                ✓ allows deleting sample
    [chrome  mac os x #0-0]
    [chrome  mac os x #0-0] 42 passing (1m 30.1s)


    Spec Files:      1 passed, 1 total (100% completed) in 00:01:30
    ```

### Using Firefox

The default driver is Chrome, but you can also use Firefox via:

```
./node_modules/typescript/bin/tsc -p . && \
    EI_USERNAME="xxx" \
    EI_PASSWORD="xxx" \
    EI_PROJECTNAME="xxx" \
    EI_HMACKEY="xxx" \
    EI_TESTWIFI=1 \
    SELENIUM_WIFI_SSID="xxx" \
    SELENIUM_WIFI_PASSWORD="xxx" \
    ./node_modules/.bin/wdio wdio.headless.firefox.js
```
