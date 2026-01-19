//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {

    let esp8266Initialized = false
    let rxData = ""

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

    function formatUrl(url: string): string {
        url = url.replaceAll(" ", "%20")
        url = url.replaceAll("=", "%3D")
        url = url.replaceAll("&", "%26")
        url = url.replaceAll("?", "%3F")
        return url
    }

    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(tx, rx, baudrate)
        serial.setTxBufferSize(128)
        serial.setRxBufferSize(128)
        esp8266Initialized = false
        if (!sendCommand("AT+RESTORE", "ready", 5000)) return
        if (!sendCommand("ATE0", "OK")) return
        esp8266Initialized = true
    }

    function connectWiFi(ssid: string, password: string) {
        sendCommand("AT+CWMODE=1", "OK")
        sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 20000)
    }

    // ---------------------------
    // SUPER SIMPLE FUNCTION
    // ---------------------------
    /**
     * Send data to server (automatic init, WiFi, TCP, HTTP GET)
     */
    //% blockId=esp8266_send_to_server
    //% block="send to server IP %ip WiFi %ssid Password %password File %phpFile Data %params"
    export function sendToServer(ip: string, ssid: string, password: string, phpFile: string, params: string) {
        // Jangan reset setiap kali kirim
        if (!esp8266Initialized) {
            init(SerialPin.P16, SerialPin.P15, BaudRate.BaudRate115200)
            connectWiFi(ssid, password)
            basic.pause(3000)
        }
    
        let url = phpFile
        if (params != "") url += "?" + formatUrl(params)
        let request =
            "GET /" + url + " HTTP/1.1\r\n" +
            "Host: " + ip + "\r\n" +
            "Connection: close\r\n\r\n"
    
        if (!sendCommand("AT+CIPSTART=\"TCP\",\"" + ip + "\",80", "OK", 5000)) return
        if (!sendCommand("AT+CIPSEND=" + request.length, ">", 3000)) return
    
        serial.writeString(request)
    }


}
