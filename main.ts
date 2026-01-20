/******************************************************************************
 * SIMPLE ESP8266 WiFi MakeCode Library
 * Compatible with tes.php (GET method)
 * Author: ChatGPT
 ******************************************************************************/
 
//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {

    let initialized = false
    let rxData = ""
 
    /**
     * Send AT Command
     */
    function sendCommand(
        command: string,
        expected: string = "OK",
        timeout: number = 5000
    ): boolean {

        rxData = ""
        serial.readString()
        serial.writeString(command + "\r\n")

        let start = input.runningTime()
        while (input.runningTime() - start < timeout) {
            rxData += serial.readString()
            if (rxData.includes(expected)) return true
            if (rxData.includes("ERROR")) return false
        }
        return false
    }

    /**
     * Initialize ESP8266
     */
    //% block="initialize ESP8266 Tx %tx Rx %rx Baud %baud"
    //% weight=30
    //% blockGap=20
    export function init(
        tx: SerialPin,
        rx: SerialPin,
        baud: BaudRate
    ) {
        serial.redirect(tx, rx, baud)
        serial.setTxBufferSize(256)
        serial.setRxBufferSize(256)

        initialized = false

        sendCommand("AT+RST", "ready", 8000)
        basic.pause(2000)

        sendCommand("ATE0")
        sendCommand("AT+CWMODE=1")

        initialized = true
        basic.showIcon(IconNames.Happy)
    }

    /**
     * SEND DATA TO LOCAL SERVER (SUPER SIMPLE)
     */
    //% block="send data to server|IP %ip|WiFi %ssid|Pass %pass|Kelompok %kelompok|Query %query"
    //% weight=25
    //% blockGap=40
    //% ip.defl="192.168.1.10"
    //% ssid.defl="wifi"
    //% pass.defl="12345678"
    //% kelompok.defl=1
    //% query.defl="suhu=30&hum=70"
    export function send(
        ip: string,
        ssid: string,
        pass: string,
        kelompok: number,
        query: string
    ) {

        if (!initialized) return

        basic.showString("W")

        // Connect WiFi
        sendCommand(
            `AT+CWJAP="${ssid}","${pass}"`,
            "OK",
            15000
        )
        basic.pause(2000)

        basic.showString("C")

        // Connect Server
        sendCommand(
            `AT+CIPSTART="TCP","${ip}",80`,
            "OK",
            5000
        )

        let fullQuery = `kelompok=${kelompok}&${query}`

        let httpRequest =
            "GET /tes.php?" + fullQuery + " HTTP/1.1\r\n" +
            "Host: " + ip + "\r\n" +
            "Connection: close\r\n\r\n"

        basic.showString("S")

        // Send HTTP
        sendCommand(
            "AT+CIPSEND=" + httpRequest.length,
            ">",
            3000
        )

        serial.writeString(httpRequest)
        basic.pause(1000)

        sendCommand("AT+CIPCLOSE")

        basic.showIcon(IconNames.Yes)
    }
}
