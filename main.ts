/**
 * ESP8266 + Micro:bit → Server Lokal → Firebase
 * Stable version
 */
//% color="#AA278D" weight=100 icon="\uf1eb"
namespace esp8266http {

    let lastResponse = ""

    // =====================
    // INIT ESP8266
    // =====================
    //% blockId=esp8266_init
    //% block="ESP8266 init TX %tx RX %rx baud %baud"
    export function init(tx: SerialPin, rx: SerialPin, baud: BaudRate) {
        serial.redirect(tx, rx, baud)
        serial.setTxBufferSize(128)
        serial.setRxBufferSize(512) // buffer lebih besar untuk respon
        basic.pause(2000)
        music.playTone(523, music.beat(BeatFraction.Quarter))
    }

    // =====================
    // SEND AT COMMAND
    // =====================
    export function sendAT(cmd: string, timeout: number): boolean {
        serial.readString() // flush
        serial.writeString(cmd + "\r\n")
        let start = input.runningTime()
        let resp = ""
        while (input.runningTime() - start < timeout) {
            let r = serial.readString()
            if (r.length > 0) resp += r
            basic.pause(10)
        }
        lastResponse = resp
        return resp.indexOf("OK") >= 0 || resp.indexOf(">") >= 0 || resp.indexOf("200 OK") >= 0
    }

    // =====================
    // CONNECT WIFI
    // =====================
    //% blockId=esp8266_connect_wifi
    //% block="Connect WiFi SSID %ssid password %password"
    export function connectWiFi(ssid: string, password: string): boolean {
        let ok = true
        ok = sendAT("AT", 500) && ok
        ok = sendAT("ATE0", 500) && ok       // matikan echo
        ok = sendAT("AT+CWMODE=1", 1000) && ok
        ok = sendAT("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", 20000) && ok
        if (ok) music.playTone(988, music.beat(BeatFraction.Quarter))
        else music.playTone(262, music.beat(BeatFraction.Half))
        return ok
    }

    // =====================
    // HTTP GET
    // =====================
    //% blockId=esp8266_http_get
    //% block="HTTP GET host %host path %path"
    export function httpGet(host: string, path: string): boolean {
        // Connect TCP
        if (!sendAT("AT+CIPSTART=\"TCP\",\"" + host + "\",80", 5000)) {
            music.playTone(262, music.beat(BeatFraction.Half))
            return false
        }

        // Buat request HTTP GET
        let req = "GET " + path + " HTTP/1.1\r\n" +
                  "Host: " + host + "\r\n" +
                  "Connection: close\r\n\r\n"

        // Kirim panjang data
        if (!sendAT("AT+CIPSEND=" + req.length, 2000)) {
            music.playTone(262, music.beat(BeatFraction.Half))
            sendAT("AT+CIPCLOSE", 500)
            return false
        }

        // Kirim request
        let ok = sendAT(req, 5000)

        // Close connection
        sendAT("AT+CIPCLOSE", 500)

        if (ok) music.playTone(988, music.beat(BeatFraction.Quarter))
        else music.playTone(262, music.beat(BeatFraction.Half))

        return ok
    }

    // =====================
    // LAST RESPONSE
    // =====================
    //% blockId=esp8266_last_response
    //% block="Last Response"
    export function lastStatus(): string {
        return lastResponse
    }
}
