/*******************************************************************************
 * MakeCode extension for ESP8266 Wifi module.
 *
 * Modified for simple HTTP GET usage
 *******************************************************************************/

//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {

    let esp8266Initialized = false
    let rxData = ""

    // =========================
    // LOW LEVEL FUNCTIONS
    // =========================

    //% blockHidden=true
    export function sendCommand(command: string, expected_response: string = null, timeout: number = 100): boolean {
        basic.pause(10)
        serial.readString()
        rxData = ""
        serial.writeString(command + "\r\n")

        if (expected_response == null) return true

        let timestamp = input.runningTime()
        while (true) {
            if (input.runningTime() - timestamp > timeout) return false

            rxData += serial.readString()
            if (rxData.includes("\r\n")) {
                let line = rxData.slice(0, rxData.indexOf("\r\n"))

                if (line.includes(expected_response)) return true
                if (expected_response == "OK" && line.includes("ERROR")) return false

                rxData = rxData.slice(rxData.indexOf("\r\n") + 2)
            }
        }
    }

    //% blockHidden=true
    export function getResponse(response: string, timeout: number = 100): string {
        let timestamp = input.runningTime()
        while (true) {
            if (input.runningTime() - timestamp > timeout) return ""

            rxData += serial.readString()
            if (rxData.includes("\r\n")) {
                let line = rxData.slice(0, rxData.indexOf("\r\n"))
                rxData = rxData.slice(rxData.indexOf("\r\n") + 2)

                if (line.includes(response)) return line
            }
        }
    }

    //% blockHidden=true
    export function formatUrl(url: string): string {
        url = url.replaceAll("%", "%25")
        url = url.replaceAll(" ", "%20")
        url = url.replaceAll("?", "%3F")
        url = url.replaceAll("=", "%3D")
        url = url.replaceAll("&", "%26")
        return url
    }

    // =========================
    // BASIC BLOCKS
    // =========================

    //% weight=30
    //% block="ESP8266 initialized"
    export function isESP8266Initialized(): boolean {
        return esp8266Initialized
    }

    //% weight=29
    //% block="initialize ESP8266 Tx %tx Rx %rx Baudrate %baudrate"
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(tx, rx, baudrate)
        serial.setTxBufferSize(128)
        serial.setRxBufferSize(128)

        esp8266Initialized = false

        if (!sendCommand("AT+RESTORE", "ready", 5000)) return
        if (!sendCommand("ATE0", "OK")) return

        esp8266Initialized = true
    }

    //% weight=28
    //% block="WiFi connected"
    export function isWifiConnected(): boolean {
        sendCommand("AT+CIPSTATUS")
        let status = getResponse("STATUS:", 1000)
        getResponse("OK")
        return !(status == "" || status.includes("STATUS:5"))
    }

    //% weight=27
    //% block="connect WiFi SSID %ssid Password %password"
    export function connectWiFi(ssid: string, password: string) {
        sendCommand("AT+CWMODE=1", "OK")
        sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 20000)
    }

    // =========================
    // SIMPLIFIED FUNCTIONS
    // =========================

    /**
     * Initialize ESP8266 and connect to WiFi (one block)
     */
    //% weight=26
    //% block="ESP8266 begin Tx %tx Rx %rx Baud %baudrate WiFi %ssid Password %password"
    export function begin(
        tx: SerialPin,
        rx: SerialPin,
        baudrate: BaudRate,
        ssid: string,
        password: string
    ) {
        init(tx, rx, baudrate)
        basic.pause(1000)
        connectWiFi(ssid, password)
        basic.pause(3000)
    }

    /**
     * Simple HTTP GET
     */
    //% weight=25
    //% block="HTTP GET IP %ip Path %path Params %params"
    export function httpGet(ip: string, path: string, params: string) {

        let url = path
        if (params != "") {
            url = path + "?" + formatUrl(params)
        }

        if (!sendCommand(
            "AT+CIPSTART=\"TCP\",\"" + ip + "\",80",
            "OK",
            5000
        )) return

        let request =
            "GET " + url + " HTTP/1.1\r\n" +
            "Host: " + ip + "\r\n" +
            "Connection: close\r\n\r\n"

        if (!sendCommand(
            "AT+CIPSEND=" + request.length,
            ">",
            3000
        )) return

        serial.writeString(request)
    }

    /**
     * Ultra simple data sender
     * (default path: /tes.php)
     */
    //% weight=24
    //% block="send data to IP %ip Data %data"
    export function sendData(ip: string, data: string) {
        httpGet(ip, "/tes.php", data)
    }
}
