//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {
    let esp8266Initialized = false
    let rxData = ""
     
    /**
     * Send AT command and wait for response.
     * RETURN: String response (bukan boolean)
     */
    //% blockHidden=true
    export function sendCommand(command: string, expected_response: string = null, timeout: number = 3000): string {
        basic.pause(10)
        rxData = ""
        serial.readString()
        
        serial.writeString(command + "\r\n")
        
        if (expected_response == null) return ""
        
        let result = ""
        let timestamp = input.runningTime()
        while (true) {
            if (input.runningTime() - timestamp > timeout) {
                break
            }
            
            rxData += serial.readString()
            if (rxData.length > 0) {
                result = rxData
                
                if (expected_response == "ANY") {
                    break  // Return whatever we got
                }
                
                if (rxData.includes(expected_response)) {
                    break
                }
                
                if (expected_response == "OK" && rxData.includes("ERROR")) {
                    break
                }
            }
            basic.pause(10)
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
        serial.setTxBufferSize(256)
        serial.setRxBufferSize(256)
        
        esp8266Initialized = false
        
        // Reset
        let resp = sendCommand("AT+RST", "ready", 5000)
        if (!resp.includes("ready")) {
            serial.writeLine("Reset failed: " + resp)
            return
        }
        basic.pause(2000)
        
        if (!sendCommand("ATE0", "OK", 2000).includes("OK")) return
        if (!sendCommand("AT+CWMODE=1", "OK", 2000).includes("OK")) return
        
        esp8266Initialized = true
        serial.writeLine("ESP8266 Ready")
    }
    
    /**
     * Parse JSON response dari server
     */
    //% blockHidden=true
    function parseJsonResponse(response: string): any {
        // Cari JSON dalam response HTTP
        let start = response.indexOf("{")
        let end = response.lastIndexOf("}") + 1
        
        if (start >= 0 && end > start) {
            let jsonStr = response.substr(start, end - start)
            try {
                // Simple JSON parsing untuk micro:bit
                if (jsonStr.includes("\"status\":\"OK\"")) {
                    return {"status": "OK", "data": jsonStr}
                }
            } catch (e) {
                // Jika parsing gagal, return raw
            }
        }
        
        // Jika tidak ada JSON, return original response
        return {"status": "RAW", "data": response}
    }
    
    /**
     * SUPER SIMPLE: Send data to server in ONE BLOCK
     * RETURN: JSON response dari server
     */
    //% weight=26
    //% blockGap=40
    //% block="send to server and get response|IP: %serverIp|WiFi: %ssid|Password: %password|Data: %data"
    //% serverIp.defl="10.155.187.242"
    //% ssid.defl="honor"
    //% password.defl="12345678"
    export function sendToServer(serverIp: string, ssid: string, password: string, data: string): string {
        if (!esp8266Initialized) return "ESP_NOT_INIT"
        
        basic.showString("W")
        
        // 1. Connect to WiFi
        let wifiResp = sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 15000)
        if (!wifiResp.includes("OK")) {
            return "WIFI_FAIL:" + wifiResp
        }
        basic.pause(3000)
        
        basic.showString("S")
        
        // 2. Connect to server
        let connResp = sendCommand("AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80", "OK", 5000)
        if (!connResp.includes("OK")) {
            return "CONN_FAIL:" + connResp
        }
        basic.pause(1000)
        
        basic.showString("D")
        
        // 3. Prepare and send HTTP GET request
        let httpRequest = "GET /server.php?" + data + " HTTP/1.1\r\n" +
                         "Host: " + serverIp + "\r\n" +
                         "Connection: close\r\n\r\n"
        
        // Send request
        let sendResp = sendCommand("AT+CIPSEND=" + httpRequest.length, ">", 3000)
        if (!sendResp.includes(">")) {
            return "SEND_FAIL:" + sendResp
        }
        
        serial.writeString(httpRequest)
        basic.pause(2000)  // Tunggu response
        
        // 4. Read server response
        let serverResponse = ""
        let startTime = input.runningTime()
        while (input.runningTime() - startTime < 3000) {
            serverResponse += serial.readString()
            if (serverResponse.includes("CLOSED") || serverResponse.includes("SEND OK")) {
                break
            }
            basic.pause(100)
        }
        
        // 5. Close connection
        sendCommand("AT+CIPCLOSE", "CLOSED", 2000)
        
        basic.showIcon(IconNames.Yes)
        
        // Parse dan return response
        let parsed = parseJsonResponse(serverResponse)
        return parsed["data"]
    }
    
    /**
     * Send sensor data (simple version)
     */
    //% weight=25
    //% blockGap=8
    //% block="send sensor|Suhu: %suhu|Hum: %hum|to IP: %serverIp"
    //% serverIp.defl="10.155.187.242"
    export function sendSensor(suhu: number, hum: number, serverIp: string) {
        let data = "kelompok=1&suhu=" + suhu + "&hum=" + hum
        sendToServer(serverIp, "honor", "12345678", data)
    }
    
    /**
     * Send complete sensor data with group ID
     */
    //% weight=24
    //% blockGap=8
    //% block="send complete data|Group: %kelompok|Temp: %suhu|Hum: %hum|Light: %cahaya|Soil: %tanah|to IP: %serverIp"
    //% kelompok.defl=1
    //% serverIp.defl="10.155.187.242"
    export function sendCompleteData(kelompok: number, suhu: number, hum: number, cahaya: number, tanah: number, serverIp: string) {
        let data = "kelompok=" + kelompok
        data += "&suhu=" + suhu
        data += "&hum=" + hum
        data += "&cahaya=" + cahaya
        data += "&tanah=" + tanah
        
        let response = sendToServer(serverIp, "honor", "12345678", data)
        serial.writeLine("Server Response: " + response)
    }
}
