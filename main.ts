/**
 * ESP8266 + Micro:bit → Server Lokal → Firebase
 * Full stable code dengan debugging
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
        serial.setRxBufferSize(512) // buffer lebih besar
        basic.pause(2000)
        music.playTone(523, music.beat(BeatFraction.Quarter))
    }

    // =====================
    // SEND AT COMMAND
    // =====================
    export function sendAT(cmd: string, timeout: number): boolean {
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
        // cek AT
        if (!sendAT("AT", 1000)) {
            basic.showString("No AT")
            return false
        }

        // mode station
        if (!sendAT("AT+CWMODE=1", 1000)) {
            basic.showString("Mode Fail")
            return false
        }

        // connect WiFi (timeout panjang 20 detik)
        if (!sendAT('AT+CWJAP="' + ssid + '","' + password + '"', 20000)) {
            basic.showString("WiFi Fail")
            basic.pause(1000)
            basic.showString(lastResponse)
            return false
        }

        // tunggu IP
        let ip = ""
        let tStart = input.runningTime()
        while (input.runningTime() - tStart < 10000) { // tunggu max 10 detik
            sendAT("AT+CIFSR", 1000)
            let lines = lastResponse.split("\n")
            for (let l of lines) {
                if (l.indexOf("STAIP") >= 0) {
                    let parts = l.split('"')
                    if (parts.length >= 2) {
                        ip = parts[1]
                        break
                    }
                }
            }
            if (ip != "") break
            basic.pause(500)
        }

        if (ip == "") {
            basic.showString("No IP")
            basic.pause(1000)
            basic.showString(lastResponse)
            return false
        }

        basic.showString("IP:" + ip)
        music.playTone(988, music.beat(BeatFraction.Quarter))
        return true
    }

    // =====================
    // HTTP GET
    // =====================
    //% blockId=esp8266_http_get
    //% block="HTTP GET host %host path %path"
    export function httpGet(host: string, path: string): boolean {
        // connect TCP
        if (!sendAT('AT+CIPSTART="TCP","' + host + '",80', 5000)) {
            basic.showString("TCP Fail")
            return false
        }

        // buat request HTTP GET
        let req = "GET " + path + " HTTP/1.1\r\n" +
                  "Host: " + host + "\r\n" +
                  "Connection: close\r\n\r\n"

        // kirim panjang data
        if (!sendAT("AT+CIPSEND=" + req.length, 2000)) {
            basic.showString("Send Len Fail")
            sendAT("AT+CIPCLOSE", 500)
            return false
        }

        // kirim request
        let ok = sendAT(req, 4000)

        // close connection
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
