//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {
    let esp8266Initialized = false
    let rxData = ""
     
    /**
     * Send AT command and wait for response.
     */
    //% blockHidden=true
    export function sendCommand(command: string, expected_response: string = null, timeout: number = 5000): string {
        basic.pause(10)
        rxData = ""
        serial.readString()
        
        serial.writeString(command + "\r\n")
        
        if (expected_response == null) return ""
        
        let timestamp = input.runningTime()
        let response = ""
        
        while (true) {
            if (input.runningTime() - timestamp > timeout) {
                break
            }
            
            rxData += serial.readString()
            if (rxData.length > 0) {
                // Kembalikan response lengkap
                response = rxData
                
                if (rxData.includes(expected_response)) {
                    break
                }
                
                if (expected_response == "OK" && rxData.includes("ERROR")) {
                    break
                }
            }
            basic.pause(10)
        }
        return response
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
        serial.setTxBufferSize(256)
        serial.setRxBufferSize(256)
        
        esp8266Initialized = false
        
        basic.pause(2000)  // Tunggu ESP8266 ready
        
        // Reset
        let resp = sendCommand("AT", "OK", 3000)
        if (!resp.includes("OK")) {
            serial.writeLine("AT failed: " + resp)
            return
        }
        
        sendCommand("ATE0", "OK", 2000)  // Echo off
        sendCommand("AT+CWMODE=1", "OK", 2000)  // Station mode
        
        esp8266Initialized = true
        serial.writeLine("ESP8266 Initialized")
    }
    
    /**
     * Kirim data sensor lengkap dengan identifikasi kelompok
     */
    //% weight=27
    //% blockGap=8
    //% block="send sensor data|Kelompok: %kelompok|Suhu: %suhu|Humidity: %hum|Cahaya: %cahaya|Tanah: %tanah|IP: %serverIp|SSID: %ssid|Password: %password"
    //% kelompok.defl=1
    //% serverIp.defl="10.155.187.242"
    //% ssid.defl="honor"
    //% password.defl="12345678"
    export function sendSensorData(kelompok: number, suhu: number, hum: number, cahaya: number, tanah: number, serverIp: string, ssid: string, password: string) {
        if (!esp8266Initialized) {
            serial.writeLine("ESP8266 not initialized!")
            return
        }
        
        basic.showString("C")
        serial.writeLine("Connecting to WiFi...")
        
        // 1. Connect to WiFi
        let wifiCmd = "AT+CWJAP=\"" + ssid + "\",\"" + password + "\""
        let wifiResp = sendCommand(wifiCmd, "OK", 15000)
        
        if (!wifiResp.includes("OK")) {
            serial.writeLine("WiFi FAILED: " + wifiResp)
            basic.showIcon(IconNames.No)
            return
        }
        
        serial.writeLine("WiFi Connected")
        basic.showString("S")
        
        // 2. Connect to server
        let connectCmd = "AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80"
        let connectResp = sendCommand(connectCmd, "OK", 5000)
        
        if (!connectResp.includes("OK")) {
            serial.writeLine("Server connect FAILED: " + connectResp)
            basic.showIcon(IconNames.No)
            return
        }
        
        serial.writeLine("Server Connected")
        basic.showString("D")
        
        // 3. Prepare query string
        let query = "kelompok=" + kelompok
        query += "&suhu=" + suhu
        query += "&hum=" + hum
        query += "&cahaya=" + cahaya
        query += "&tanah=" + tanah
        
        // 4. Prepare HTTP request
        let httpRequest = "GET /tes.php?" + query + " HTTP/1.1\r\n"
        httpRequest += "Host: " + serverIp + "\r\n"
        httpRequest += "Connection: close\r\n\r\n"
        
        serial.writeLine("Request: " + httpRequest)
        
        // 5. Send data
        let sendCmd = "AT+CIPSEND=" + (httpRequest.length)
        let sendResp = sendCommand(sendCmd, ">", 3000)
        
        if (sendResp.includes(">")) {
            serial.writeString(httpRequest)
            basic.pause(2000)
            
            // Baca response
            let response = serial.readString()
            serial.writeLine("Server Response: " + response)
        } else {
            serial.writeLine("Send failed: " + sendResp)
        }
        
        // 6. Close connection
        sendCommand("AT+CIPCLOSE", "CLOSED", 2000)
        
        basic.showIcon(IconNames.Yes)
    }
}
