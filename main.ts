/**
 * ESP8266 API + Firebase + Sound Status (STABLE)
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

        // ready tone
        music.playTone(523, music.beat(BeatFraction.Quarter))
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
        return resp.indexOf("OK") >= 0 ||
               resp.indexOf("SEND OK") >= 0 ||
               resp.indexOf("200 OK") >= 0
    }

    //% block="ESP8266 send AT %cmd wait %ms ms"
    export function sendAT(cmd: string, ms: number): boolean {
        serial.writeString(cmd + "\r\n")
        let resp = readResponse(ms)
        return isOK(resp)
    }

    // =====================
    // SOUND STATUS
    // =====================

    //% block="ESP8266 success tone"
    export function successTone() {
        music.playTone(988, music.beat(BeatFraction.Quarter))
        music.playTone(1319, music.beat(BeatFraction.Quarter))
    }

    //% block="ESP8266 error tone"
    export function errorTone() {
        music.playTone(262, music.beat(BeatFraction.Half))
    }

    // =====================
    // WIFI
    // =====================

    //% block="ESP8266 connect WiFi ssid %ssid password %password"
    export function connectWiFi(ssid: string, password: string): boolean {
        let ok = true

        ok = sendAT("AT", 500) && ok
        ok = sendAT("AT+CWMODE=1", 1000) && ok
        ok = sendAT("AT+CIPMUX=0", 500) && ok
        ok = sendAT(
            "AT+CWJAP=\"" + ssid + "\",\"" + password + "\"",
            12000
        ) && ok

        if (ok) successTone()
        else errorTone()

        return ok
    }

    // =====================
    // HTTP GET
    // =====================

    //% block="ESP8266 HTTP GET host %host path %path"
    export function httpGet(host: string, path: string): boolean {

        if (!sendAT(
            "AT+CIPSTART=\"TCP\",\"" + host + "\",80",
            3000
        )) {
            errorTone()
            return false
        }

        let req =
            "GET " + path + " HTTP/1.1\r\n" +
            "Host: " + host + "\r\n" +
            "Connection: close\r\n\r\n"

        if (!sendAT("AT+CIPSEND=" + req.length, 1000)) {
            errorTone()
            return false
        }

        let ok = sendAT(req, 4000)
        sendAT("AT+CIPCLOSE", 500)

        if (ok) successTone()
        else errorTone()

        return ok
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
            3000
        )) {
            errorTone()
            return false
        }

        let req =
            "PUT /" + path + ".json HTTP/1.1\r\n" +
            "Host: " + firebaseHost + "\r\n" +
            "Content-Type: application/json\r\n" +
            "Content-Length: " + body.length + "\r\n\r\n" +
            body

        if (!sendAT("AT+CIPSEND=" + req.length, 1000)) {
            errorTone()
            return false
        }

        let ok = sendAT(req, 5000)
        sendAT("AT+CIPCLOSE", 500)

        if (ok) successTone()
        else errorTone()

        return ok
    }

    // =====================
    // STATUS
    // =====================

    //% block="ESP8266 last response"
    export function lastStatus(): string {
        return lastResponse
    }
}
