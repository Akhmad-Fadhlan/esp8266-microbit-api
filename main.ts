/**
 * ESP8266 API + Firebase Library
 * ESP-01 compatible
 */

//% color="#AA278D" weight=100 icon="\uf1eb"
namespace esp8266http {

    let firebaseHost = ""
    let firebaseAuth = ""

    // =====================
    // BASIC
    // =====================

    //% block="ESP8266 init TX %tx RX %rx baud %baud"
    export function init(tx: SerialPin, rx: SerialPin, baud: BaudRate) {
        serial.redirect(tx, rx, baud)
        basic.pause(2000)
    }

    //% block="ESP8266 send AT %cmd wait %ms ms"
    export function sendAT(cmd: string, ms: number) {
        serial.writeString(cmd + "\r\n")
        basic.pause(ms)
    }

    // =====================
    // WIFI
    // =====================

    //% block="ESP8266 connect WiFi ssid %ssid password %password"
    export function connectWiFi(ssid: string, password: string) {
        sendAT("AT+CWMODE=1", 1000)
        sendAT(
            "AT+CWJAP=\"" + ssid + "\",\"" + password + "\"",
            8000
        )
    }

    // =====================
    // HTTP API (GET)
    // =====================

    //% block="ESP8266 HTTP GET host %host path %path"
    export function httpGet(host: string, path: string) {

        sendAT(
            "AT+CIPSTART=\"TCP\",\"" + host + "\",80",
            2000
        )

        let req =
            "GET " + path + " HTTP/1.1\r\n" +
            "Host: " + host + "\r\n" +
            "Connection: close\r\n\r\n"

        sendAT("AT+CIPSEND=" + req.length, 1000)
        sendAT(req, 3000)
    }

    // =====================
    // FIREBASE
    // =====================

    //% block="Firebase config host %host auth %auth"
    export function firebaseConfig(host: string, auth: string) {
        firebaseHost = host
        firebaseAuth = auth
    }

    //% block="Firebase set path %path value %value"
    export function firebaseSet(path: string, value: string) {

        let body = JSON.stringify(value)

        sendAT(
            "AT+CIPSTART=\"TCP\",\"" + firebaseHost + "\",80",
            2000
        )

        let req =
            "PUT /" + path + ".json?auth=" + firebaseAuth + " HTTP/1.1\r\n" +
            "Host: " + firebaseHost + "\r\n" +
            "Content-Type: application/json\r\n" +
            "Content-Length: " + body.length + "\r\n\r\n" +
            body

        sendAT("AT+CIPSEND=" + req.length, 1000)
        sendAT(req, 4000)
    }
}
