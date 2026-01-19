/******************************************************************************
 * MakeCode extension for ESP8266 Wifi module.
 */

//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {
    let esp8266Initialized = false
    let rxData = ""
    
    /**
     * Send AT command and wait for response.
     */
    //% blockHidden=true
    export function sendCommand(command: string, expected_response: string = null, timeout: number = 100): boolean {
        basic.pause(10)
        rxData = ""
        serial.readString()
        
        serial.writeString(command + "\r\n")
        
        if (expected_response == null) return true
        
        let result = false
        let timestamp = input.runningTime()
        while (true) {
            if (input.runningTime() - timestamp > timeout) {
                break
            }
            
            rxData += serial.readString()
            if (rxData.includes("\r\n")) {
                if (rxData.slice(0, rxData.indexOf("\r\n")).includes(expected_response)) {
                    result = true
                    break
                }
                
                if (expected_response == "OK") {
                    if (rxData.slice(0, rxData.indexOf("\r\n")).includes("ERROR")) {
                        break
                    }
                }
                
                rxData = rxData.slice(rxData.indexOf("\r\n") + 2)
            }
        }
        return result
    }
    
    /**
     * Initialize the ESP8266.
     */
    //% weight=29
    //% blockGap=40
    //% blockId=esp8266_init
    //% block="initialize ESP8266: Tx %tx Rx %rx Baudrate %baudrate"
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(tx, rx, baudrate)
        serial.setTxBufferSize(128)
        serial.setRxBufferSize(128)
        
        esp8266Initialized = false
        
        // Reset
        if (!sendCommand("AT+RST", "ready", 5000)) return
        basic.pause(2000)
        
        if (!sendCommand("ATE0", "OK")) return
        if (!sendCommand("AT+CWMODE=1", "OK")) return
        
        esp8266Initialized = true
    }
    
    /**
     * SUPER SIMPLE: Send data to server in ONE BLOCK
     */
    //% weight=26
    //% blockGap=40
    //% block="send to server|IP: %serverIp|WiFi: %ssid|Password: %password|Data: %data"
    //% serverIp.defl="10.155.187.242"
    //% ssid.defl="honor"
    //% password.defl="12345678"
    export function sendToServer(serverIp: string, ssid: string, password: string, data: string) {
        if (!esp8266Initialized) return
        
        basic.showString("W")
        
        // 1. Connect to WiFi
        sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 15000)
        basic.pause(3000)
        
        basic.showString("S")
        
        // 2. Connect to server
        sendCommand("AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80", "OK", 5000)
        basic.pause(1000)
        
        basic.showString("D")
        
        // 3. Prepare and send HTTP GET request
        let httpRequest = "GET /tes.php?" + data + " HTTP/1.1\r\n" +
                         "Host: " + serverIp + "\r\n" +
                         "Connection: close\r\n\r\n"
        
        sendCommand("AT+CIPSEND=" + httpRequest.length, ">", 3000)
        serial.writeString(httpRequest)
        basic.pause(1000)
        
        // 4. Close connection
        sendCommand("AT+CIPCLOSE")
        
        basic.showIcon(IconNames.Yes)
    }
    
    /**
     * Even SIMPLER: Send sensor data
     */
    //% weight=25
    //% blockGap=8
    //% block="send sensor|Suhu: %suhu|to IP: %serverIp"
    //% serverIp.defl="10.155.187.242"
    export function sendSensor(suhu: number, serverIp: string) {
        sendToServer(serverIp, "honor", "12345678", "suhu=" + suhu)
    }
}
