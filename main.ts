/**
 * ESP8266 API + Firebase + Status Indicator
 */

//% color="#AA278D" weight=100 icon="\uf1eb"
namespace esp8266http {

    let firebaseHost = ""
    let firebaseAuth = ""
    let lastResponse = ""

    // =====================
    // BASIC
    // =====================

    //% block="ESP8266 init TX %tx RX %rx baud %baud"
    export function init(tx: SerialPin, rx: SerialPin, baud: BaudRate) {
        serial.redirect(tx, rx, baud)
        serial.setRxBufferSize(256)
        basic.pause(2000)
    }

    function readResponse(ms: number): string {
        let t = input.runningTime()
        let resp = ""
        while (input.runningTime() - t < ms) {
            resp += serial.readString()
            basic.pause(10)
        }
        lastResponse = resp
        return resp
    }

    function isOK(resp: string): boolean {
        return resp.indexOf("OK") >= 0 || resp.indexOf("SEND OK") >= 0
    }

    //% block="ESP8266 send AT %cmd wait %ms ms"
    export function sendAT(cmd: string, ms: number): boolean {
        serial.writeString(cmd + "\r\n")
        let resp = readResponse(ms)
        return isOK(resp)
    }

    // =====================
    // WIFI
    // =====================

    //% block="ESP8266 connect WiFi ssid %ssid password %password"
    export function connectWiFi(ssid: string, password: string): boolean {
        let ok1 = sendAT("AT+CWMODE=1", 1000)
        let ok2 = sendAT(
            "AT+CWJAP=\"" + ssid + "\",\"" + password + "\"",
            8000
        )
        return ok1 && ok2
    }

    // =====================
    // HTTP API
    // =====================

    //% block="ESP8266 HTTP GET host %host path %path"
    export function httpGet(host: string, path: string): boolean {

        if (!sendAT(
            "AT+CIPSTART=\"TCP\",\"" + host + "\",80",
            2000
        )) return false

        let req =
            "GET " + path + " HTTP/1.1\r\n" +
            "Host: " + host + "\r\n" +
            "Connection: close\r\n\r\n"

        if (!sendAT("AT+CIPSEND=" + req.length, 1000)) return false
        return sendAT(req, 3000)
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
    export function firebaseSet(path: string, value: string): boolean {

        let body = JSON.stringify(value)

        if (!sendAT(
            "AT+CIPSTART=\"TCP\",\"" + firebaseHost + "\",80",
            2000
        )) return false

        let req =
            "PUT /" + path + ".json?auth=" + firebaseAuth + " HTTP/1.1\r\n" +
            "Host: " + firebaseHost + "\r\n" +
            "Content-Type: application/json\r\n" +
            "Content-Length: " + body.length + "\r\n\r\n" +
            body

        if (!sendAT("AT+CIPSEND=" + req.length, 1000)) return false
        return sendAT(req, 4000)
    }

    // =====================
    // STATUS
    // =====================

    //% block="ESP8266 last response"
    export function lastStatus(): string {
        return lastResponse
    }
}
