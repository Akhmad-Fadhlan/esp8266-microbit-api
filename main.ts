/*******************************************************************************
 * MakeCode extension for ESP8266 Wifi module.
 *
 * Company: Cytron Technologies Sdn Bhd
 * Website: http://www.cytron.io
 * Email: support@cytron.io
 *******************************************************************************/

/**
 * Blocks for ESP8266 WiFi module.
 */

//% weight=10 color=#ff8000 icon="\uf1eb" block="ESP8266 WiFi"
namespace esp8266 {
    // Flags
    let esp8266Initialized = false
    let wifiConnected = false
    
    // Buffer for data received from UART.
    let rxData = ""
    
    // Store WiFi credentials
    let wifiSSID = ""
    let wifiPassword = ""
    
    /**
     * Send AT command and wait for response.
     */
    //% blockHidden=true
    //% blockId=esp8266_send_command
    export function sendCommand(command: string, expected_response: string = null, timeout: number = 100): boolean {
        basic.pause(10)
        rxData = ""
        serial.readString()
        
        serial.writeString(command + "\r\n")
        
        if (expected_response == null) {
            return true
        }
        
        let result = false
        let timestamp = input.runningTime()
        while (true) {
            if (input.runningTime() - timestamp > timeout) {
                result = false
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
                        result = false
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
        wifiConnected = false
        
        // Reset ESP
        if (!sendCommand("AT+RST", "ready", 5000)) {
            basic.showIcon(IconNames.Sad)
            return
        }
        
        basic.pause(2000)
        
        // Turn off echo
        if (!sendCommand("ATE0", "OK")) {
            basic.showIcon(IconNames.Sad)
            return
        }
        
        // Set WiFi mode to station
        if (!sendCommand("AT+CWMODE=1", "OK")) {
            basic.showIcon(IconNames.Sad)
            return
        }
        
        esp8266Initialized = true
        basic.showIcon(IconNames.Happy)
    }
    
    /**
     * Connect to WiFi router.
     */
    //% weight=27
    //% blockGap=8
    //% blockId=esp8266_connect_wifi
    //% block="connect to WiFi: SSID %ssid Password %password"
    export function connectWiFi(ssid: string, password: string) {
        if (!esp8266Initialized) return false
        
        wifiSSID = ssid
        wifiPassword = password
        
        basic.showString("C")
        
        // Connect to WiFi
        if (sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 15000)) {
            wifiConnected = true
            basic.showIcon(IconNames.Yes)
            return true
        } else {
            wifiConnected = false
            basic.showIcon(IconNames.No)
            return false
        }
    }
    
    /**
     * Check WiFi connection status
     */
    //% weight=28
    //% blockGap=8
    //% blockId=esp8266_is_wifi_connected
    //% block="WiFi connected"
    export function isWifiConnected(): boolean {
        if (!esp8266Initialized) return false
        
        sendCommand("AT+CIPSTATUS")
        let status = ""
        let timestamp = input.runningTime()
        
        while (input.runningTime() - timestamp < 2000) {
            rxData += serial.readString()
            if (rxData.includes("STATUS:")) {
                let start = rxData.indexOf("STATUS:")
                let end = rxData.indexOf("\r\n", start)
                if (end > start) {
                    status = rxData.slice(start, end)
                }
                break
            }
        }
        
        // Clear buffer
        rxData = ""
        
        if (status.includes("STATUS:3") || status.includes("STATUS:4")) {
            wifiConnected = true
            return true
        } else {
            wifiConnected = false
            return false
        }
    }
    
    /**
     * SIMPLE FUNCTION: Send data to server
     */
    //% weight=26
    //% blockGap=40
    //% block="kirim ke server|IP: %serverIp|WiFi: %ssid|Password: %password|Data: %data"
    //% serverIp.defl="10.155.187.242"
    //% ssid.defl="honor"
    //% password.defl="12345678"
    export function kirimKeServer(serverIp: string, ssid: string, password: string, data: string) {
        if (!esp8266Initialized) {
            basic.showIcon(IconNames.Sad)
            return
        }
        
        // Step 1: Connect WiFi if not connected
        if (!wifiConnected) {
            basic.showString("W")
            if (!connectWiFi(ssid, password)) {
                basic.showIcon(IconNames.No)
                return
            }
            basic.pause(2000)
        }
        
        // Step 2: Check WiFi connection
        basic.showString("C")
        if (!isWifiConnected()) {
            basic.showIcon(IconNames.No)
            return
        }
        basic.pause(1000)
        
        // Step 3: Connect to server
        basic.showString("S")
        if (!sendCommand("AT+CIPSTART=\"TCP\",\"" + serverIp + "\",80", "OK", 5000)) {
            basic.showIcon(IconNames.No)
            return
        }
        basic.pause(1000)
        
        // Step 4: Send HTTP GET request
        basic.showString("D")
        let httpRequest = "GET /tes.php?" + data + " HTTP/1.1\r\n" +
                         "Host: " + serverIp + "\r\n" +
                         "Connection: close\r\n\r\n"
        
        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, ">", 3000)) {
            basic.showIcon(IconNames.No)
            sendCommand("AT+CIPCLOSE")
            return
        }
        
        // Send the actual HTTP request
        serial.writeString(httpRequest)
        basic.pause(1000)
        
        // Step 5: Close connection
        sendCommand("AT+CIPCLOSE", "OK", 1000)
        
        basic.showIcon(IconNames.Happy)
    }
    
    /**
     * Send sensor data
     */
    //% weight=25
    //% blockGap=8
    //% block="kirim data sensor|IP: %serverIp|WiFi: %ssid|Password: %password|Suhu: %suhu|Kelembaban: %kelembaban"
    //% serverIp.defl="10.155.187.242"
    //% ssid.defl="honor"
    //% password.defl="12345678"
    export function kirimDataSensor(serverIp: string, ssid: string, password: string, suhu: number, kelembaban: number) {
        let data = "suhu=" + suhu + "&kelembaban=" + kelembaban
        kirimKeServer(serverIp, ssid, password, data)
    }
}
