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
     * Kirim data sensor lengkap dengan identifikasi kelompok
     */
    //% weight=27
    //% blockGap=40
    //% block="send sensor data|Kelompok: %kelompok|Suhu: %suhu|Humidity: %hum|Cahaya: %cahaya|Tanah: %tanah|to IP: %serverIp"
    //% kelompok.defl=1
    //% serverIp.defl="10.155.187.242"
    export function sendSensorData(kelompok: number, suhu: number, hum: number, cahaya: number, tanah: number, serverIp: string) {
        if (!esp8266Initialized) return
        
        basic.showString("W")
        
        // 1. Connect to WiFi
        sendCommand("AT+CWJAP=\"honor\",\"12345678\"", "OK", 15000)
        basic.pause(3000)
        
        basic.showString("S")
        
        // 2. Connect to server
        sendCommand("AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80", "OK", 5000)
        basic.pause(1000)
        
        basic.showString("D")
        
        // 3. Prepare query string with all parameters
        let query = "kelompok=" + kelompok
        query += "&suhu=" + suhu
        query += "&hum=" + hum
        query += "&cahaya=" + cahaya
        query += "&tanah=" + tanah
        
        // 4. Prepare and send HTTP GET request
        let httpRequest = "GET /tes.php?" + query + " HTTP/1.1\r\n" +
                         "Host: " + serverIp + "\r\n" +
                         "Connection: close\r\n\r\n"
        
        sendCommand("AT+CIPSEND=" + httpRequest.length, ">", 3000)
        serial.writeString(httpRequest)
        basic.pause(1000)
        
        // 5. Close connection
        sendCommand("AT+CIPCLOSE")
        
        basic.showIcon(IconNames.Yes)
    }
    
    /**
     * Kirim data sederhana (backward compatibility)
     */
    //% weight=25
    //% blockGap=8
    //% block="send simple data|Kelompok: %kelompok|Suhu: %suhu|Humidity: %hum|to IP: %serverIp"
    //% kelompok.defl=1
    //% serverIp.defl="10.155.187.242"
    export function sendSimpleData(kelompok: number, suhu: number, hum: number, serverIp: string) {
        sendSensorData(kelompok, suhu, hum, 0, 0, serverIp)
    }
}
