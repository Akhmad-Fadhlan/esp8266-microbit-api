//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {
    let esp8266Initialized = false
    let rxData = ""

    // Internal function: send AT command and wait for response
    function sendCommand(command: string, expected_response: string = null, timeout: number = 1000): boolean {
        basic.pause(10)
        serial.readString()
        rxData = ""
        serial.writeString(command + "\r\n")
        if (!expected_response) return true
        let result = false
        let start = input.runningTime()
        while (true) {
            if (input.runningTime() - start > timeout) {
                result = false
                break
            }
            rxData += serial.readString()
            if (rxData.includes("\r\n")) {
                let line = rxData.slice(0, rxData.indexOf("\r\n"))
                if (line.includes(expected_response)) {
                    result = true
                    break
                }
                if (expected_response == "OK" && line.includes("ERROR")) {
                    result = false
                    break
                }
                rxData = rxData.slice(rxData.indexOf("\r\n") + 2)
            }
        }
        return result
    }

    // Internal: format URL parameters
    function formatUrl(url: string): string {
        url = url.replaceAll(" ", "%20")
        url = url.replaceAll("=", "%3D")
        url = url.replaceAll("&", "%26")
        url = url.replaceAll("?", "%3F")
        return url
    }

    // Initialize ESP8266
    //% blockId=esp8266_init
    //% block="init ESP8266: Tx %tx Rx %rx Baudrate %baudrate"
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(tx, rx, baudrate)
        serial.setTxBufferSize(128)
        serial.setRxBufferSize(128)
        esp8266Initialized = false
        if (!sendCommand("AT+RESTORE", "ready", 5000)) return
        if (!sendCommand("ATE0", "OK")) return
        esp8266Initialized = true
    }

    // Connect to WiFi
    function connectWiFi(ssid: string, password: string) {
        sendCommand("AT+CWMODE=1", "OK")
        sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 20000)
    }

    // ---------------------------
    // NEW: SUPER SIMPLE FUNCTION
    // ---------------------------
    /**
     * Send data to server (automatic init, WiFi, TCP, HTTP GET)
     * @param ip Server IP
     * @param ssid WiFi SSID
     * @param password WiFi password
     * @param phpFile File PHP (example: tes.php)
     * @param params URL parameters (example: suhu=30)
     */
    //% blockId=esp8266_send_to_server
    //% block="send to server IP %ip WiFi %ssid Password %password File %phpFile Data %params"
    export function sendToServer(ip: string, ssid: string, password: string, phpFile: string, params: string) {
        // 1. Init if not initialized
        if (!esp8266Initialized) {
            init(SerialPin.P16, SerialPin.P15, BaudRate.BaudRate115200)
            basic.pause(1000)
        }

        // 2. Connect WiFi
        connectWiFi(ssid, password)
        basic.pause(3000)

        // 3. Build HTTP GET
        let url = phpFile
        if (params != "") url += "?" + formatUrl(params)
        let request =
            "GET /" + url + " HTTP/1.1\r\n" +
            "Host: " + ip + "\r\n" +
            "Connection: close\r\n\r\n"

        // 4. Open TCP
        if (!sendCommand("AT+CIPSTART=\"TCP\",\"" + ip + "\",80", "OK", 5000)) return

        // 5. Send data length
        if (!sendCommand("AT+CIPSEND=" + request.length, ">", 3000)) return

        // 6. Send HTTP GET request
        serial.writeString(request)
    }

}
