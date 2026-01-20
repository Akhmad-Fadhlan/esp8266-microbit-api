//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {
    let esp8266Initialized = false
    let rxData = ""
       
    /**
     * Send AT command and wait for response.
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
                    break
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
        serial.setTxBufferSize(512)
        serial.setRxBufferSize(512)
        
        esp8266Initialized = false
        
        basic.showString("R")
        // Reset
        let resp = sendCommand("AT+RST", "ready", 5000)
        if (!resp.includes("ready")) {
            serial.writeLine("Reset failed: " + resp)
            return
        }
        basic.pause(2000)
        
        basic.showString("M")
        if (!sendCommand("ATE0", "OK", 2000).includes("OK")) return
        
        basic.showString("C")
        if (!sendCommand("AT+CWMODE=1", "OK", 2000).includes("OK")) return
        
        // Set single connection mode (lebih stabil)
        if (!sendCommand("AT+CIPMUX=0", "OK", 2000).includes("OK")) return
        
        // Enable longer timeout
        if (!sendCommand("AT+CIPRECVMODE=0", "OK", 2000).includes("OK")) return
        
        esp8266Initialized = true
        basic.showIcon(IconNames.Yes)
        serial.writeLine("ESP8266 Ready")
    }
    
    /**
     * Connect to WiFi
     */
    //% weight=28
    //% blockGap=8
    //% block="connect to WiFi|SSID: %ssid|Password: %password"
    export function connectWifi(ssid: string, password: string): boolean {
        if (!esp8266Initialized) return false
        
        basic.showString("W")
        serial.writeLine("Connecting to: " + ssid)
        
        // Reset WiFi connection jika sudah terhubung
        sendCommand("AT+CWQAP", "OK", 3000)
        basic.pause(1000)
        
        // Connect to WiFi
        let wifiResp = sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 15000)
        
        if (wifiResp.includes("OK")) {
            basic.showIcon(IconNames.Happy)
            serial.writeLine("WiFi Connected")
            return true
        } else {
            basic.showIcon(IconNames.Sad)
            serial.writeLine("WiFi Failed: " + wifiResp)
            return false
        }
    }
    
    /**
     * Parse JSON response dari server
     */
    //% blockHidden=true
    function parseJsonResponse(response: string): string {
        let start = response.indexOf("{")
        if (start < 0) return response
    
        let after = response.substr(start)
        let end = after.indexOf("}")
        if (end < 0) return response
    
        return after.substr(0, end + 1)
    }

    
    /**
     * Send HTTP GET request to server
     */
    //% weight=26
    //% blockGap=40
    //% block="send HTTP GET|IP: %serverIp|Path: %path|Data: %data"
    //% serverIp.defl="192.168.1.100"
    //% path.defl="/tes.php"
    export function sendHttpGet(serverIp: string, path: string, data: string): string {
        if (!esp8266Initialized) return "ESP_NOT_INIT"
        
        basic.showString("C")
        
        // 1. Connect to server (port 80 untuk HTTP)
        let connResp = sendCommand("AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80", "OK", 10000)
        if (!connResp.includes("OK")) {
            serial.writeLine("Connection failed: " + connResp)
            return "CONN_FAIL:" + connResp
        }
        
        basic.pause(1000)
        
        // 2. Prepare HTTP GET request
        let httpRequest = "GET " + path + "?" + data + " HTTP/1.1\r\n" +
                         "Host: " + serverIp + "\r\n" +
                         "User-Agent: micro:bit\r\n" +
                         "Connection: close\r\n\r\n"
        
        // 3. Send request
        basic.showString("S")
        let sendCmd = "AT+CIPSEND=" + (httpRequest.length)
        let sendResp = sendCommand(sendCmd, ">", 3000)
        
        if (!sendResp.includes(">")) {
            sendCommand("AT+CIPCLOSE", "CLOSED", 2000)
            return "SEND_FAIL:" + sendResp
        }
        
        // Kirim data HTTP
        serial.writeString(httpRequest)
        basic.pause(500)
        
        // 4. Tunggu dan baca response
        basic.showString("R")
        let serverResponse = ""
        let startTime = input.runningTime()
        
        // Baca data selama 5 detik
        while (input.runningTime() - startTime < 5000) {
            let chunk = serial.readString()
            if (chunk.length > 0) {
                serverResponse += chunk
                serial.writeString(".") // Indikator progress
            }
            
            // Jika connection closed, stop
            if (serverResponse.includes("CLOSED") || serverResponse.includes("Unlink")) {
                break
            }
            basic.pause(100)
        }
        
        // 5. Close connection
        sendCommand("AT+CIPCLOSE", "CLOSED", 2000)
        
        basic.showIcon(IconNames.Yes)
        
        // Parse response
        return parseJsonResponse(serverResponse)
    }
    
    /**
     * Send sensor data to server (versi lengkap)
     */
    //% weight=25
    //% blockGap=8
    //% block="send sensor data to server|IP: %serverIp|Group: %kelompok|Temp: %suhu|Hum: %hum|Light: %cahaya|Soil: %tanah"
    //% serverIp.defl="192.168.1.100"
    //% kelompok.defl=1
    export function sendSensorData(serverIp: string, kelompok: number, suhu: number, hum: number, cahaya: number, tanah: number): string {
        // Siapkan data parameter
        let data = "kelompok=" + kelompok
        data += "&suhu=" + suhu
        data += "&hum=" + hum
        data += "&cahaya=" + cahaya
        data += "&tanah=" + tanah
        
        // Kirim ke server PHP
        let response = sendHttpGet(serverIp, "/tes.php", data)
        
        // Tampilkan response di serial monitor
        serial.writeLine("=== SERVER RESPONSE ===")
        serial.writeLine(response)
        serial.writeLine("=====================")
        
        return response
    }
    
    /**
     * Simple sensor data sender
     */
    //% weight=24
    //% blockGap=8
    //% block="send temp & hum|IP: %serverIp|Temp: %suhu|Hum: %hum"
    //% serverIp.defl="192.168.1.100"
    export function sendTempHum(serverIp: string, suhu: number, hum: number): string {
        let data = "kelompok=1&suhu=" + suhu + "&hum=" + hum
        return sendHttpGet(serverIp, "/tes.php", data)
    }
    
    /**
     * Check WiFi connection status
     */
    //% weight=22
    //% block="check WiFi connection"
    export function checkWifi(): boolean {
        if (!esp8266Initialized) return false
        
        let resp = sendCommand("AT+CIPSTATUS", "STATUS:", 3000)
        return resp.includes("STATUS:2") || resp.includes("STATUS:3") || resp.includes("STATUS:4")
    }
    
    /**
     * Get IP address
     */
    //% weight=21
    //% block="get IP address"
    export function getIpAddress(): string {
        let resp = sendCommand("AT+CIFSR", "OK", 3000)
        if (resp.includes("STAIP")) {
            let lines = resp.split("\n")
            for (let line of lines) {
                if (line.includes("STAIP")) {
                    let parts = line.split("\"")
                    if (parts.length > 1) return parts[1]
                }
            }
        }
        return "0.0.0.0"
    }
}
