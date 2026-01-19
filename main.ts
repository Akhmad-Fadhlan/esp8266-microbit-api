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
    // Flag to indicate whether the ESP8266 was initialized successfully.
    let esp8266Initialized = false
    let wifiConnected = false
    
    // Buffer for data received from UART.
    let rxData = ""
    
    /**
     * Send AT command and wait for response.
     * Return true if expected response is received.
     * @param command The AT command without the CRLF.
     * @param expected_response Wait for this response.
     * @param timeout Timeout in milliseconds.
     */
    //% blockHidden=true
    //% blockId=esp8266_send_command
    export function sendCommand(command: string, expected_response: string = null, timeout: number = 100): boolean {
        // Wait a while from previous command.
        basic.pause(10)
        
        // Clear the Rx buffer.
        rxData = ""
        serial.readString()
        
        // Send the command and end with "\r\n".
        serial.writeString(command + "\r\n")
        
        // Don't check if expected response is not specified.
        if (expected_response == null) {
            return true
        }
        
        // Wait and verify the response.
        let result = false
        let timestamp = input.runningTime()
        while (true) {
            // Timeout.
            if (input.runningTime() - timestamp > timeout) {
                result = false
                break
            }
            
            // Read until the end of the line.
            rxData += serial.readString()
            if (rxData.includes("\r\n")) {
                // Check if expected response received.
                if (rxData.slice(0, rxData.indexOf("\r\n")).includes(expected_response)) {
                    result = true
                    break
                }
                
                // If we expected "OK" but "ERROR" is received, do not wait for timeout.
                if (expected_response == "OK") {
                    if (rxData.slice(0, rxData.indexOf("\r\n")).includes("ERROR")) {
                        result = false
                        break
                    }
                }
                
                // Trim the Rx data before loop again.
                rxData = rxData.slice(rxData.indexOf("\r\n") + 2)
            }
        }
        return result
    }
    
    /**
     * Get the specific response from ESP8266.
     * Return the line start with the specific response.
     * @param command The specific response we want to get.
     * @param timeout Timeout in milliseconds.
     */
    //% blockHidden=true
    //% blockId=esp8266_get_response
    export function getResponse(response: string, timeout: number = 100): string {
        let responseLine = ""
        let timestamp = input.runningTime()
        while (true) {
            // Timeout.
            if (input.runningTime() - timestamp > timeout) {
                // Check if expected response received in case no CRLF received.
                if (rxData.includes(response)) {
                    responseLine = rxData
                }
                break
            }
            
            // Read until the end of the line.
            rxData += serial.readString()
            if (rxData.includes("\r\n")) {
                // Check if expected response received.
                if (rxData.slice(0, rxData.indexOf("\r\n")).includes(response)) {
                    responseLine = rxData.slice(0, rxData.indexOf("\r\n"))
                    // Trim the Rx data for next call.
                    rxData = rxData.slice(rxData.indexOf("\r\n") + 2)
                    break
                }
                
                // Trim the Rx data before loop again.
                rxData = rxData.slice(rxData.indexOf("\r\n") + 2)
            }
        }
        return responseLine
    }
    
    /**
     * Format the encoding of special characters in the url.
     * @param url The url that we want to format.
     */
    //% blockHidden=true
    //% blockId=esp8266_format_url
    export function formatUrl(url: string): string {
        // Hanya encode karakter yang penting
        let encodedUrl = ""
        for (let i = 0; i < url.length; i++) {
            let char = url.charAt(i)
            if (char == " ") {
                encodedUrl += "%20"
            } else if (char == "&") {
                encodedUrl += "%26"
            } else if (char == "=") {
                encodedUrl += "%3D"
            } else if (char == "?") {
                encodedUrl += "%3F"
            } else {
                encodedUrl += char
            }
        }
        return encodedUrl
    }
    
    /**
     * Return true if the ESP8266 is already initialized.
     */
    //% weight=30
    //% blockGap=8
    //% blockId=esp8266_is_esp8266_initialized
    //% block="ESP8266 initialized"
    export function isESP8266Initialized(): boolean {
        return esp8266Initialized
    }
    
    /**
     * Initialize the ESP8266.
     * @param tx Tx pin of micro:bit. eg: SerialPin.P16
     * @param rx Rx pin of micro:bit. eg: SerialPin.P15
     * @param baudrate UART baudrate. eg: BaudRate.BaudRate115200
     */
    //% weight=29
    //% blockGap=40
    //% blockId=esp8266_init
    //% block="initialize ESP8266: Tx %tx Rx %rx Baudrate %baudrate"
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        // Redirect the serial port.
        serial.redirect(tx, rx, baudrate)
        serial.setTxBufferSize(128)
        serial.setRxBufferSize(128)
        
        // Reset the flag.
        esp8266Initialized = false
        wifiConnected = false
        
        // Reset ESP8266 (lebih cepat dari RESTORE)
        if (sendCommand("AT+RST", "ready", 3000) == false) {
            basic.showIcon(IconNames.Sad)
            return
        }
        
        basic.pause(2000)
        
        // Turn off echo.
        if (sendCommand("ATE0", "OK") == false) {
            basic.showIcon(IconNames.Sad)
            return
        }
        
        // Initialized successfully.
        esp8266Initialized = true
        basic.showIcon(IconNames.Happy)
    }
    
    /**
     * Return true if the ESP8266 is connected to WiFi router.
     */
    //% weight=28
    //% blockGap=8
    //% blockId=esp8266_is_wifi_connected
    //% block="WiFi connected"
    export function isWifiConnected(): boolean {
        if (!esp8266Initialized) return false
        
        // Get the connection status.
        sendCommand("AT+CIPSTATUS")
        let status = getResponse("STATUS:", 2000)
        // Wait until OK is received.
        getResponse("OK")
        
        // Return the WiFi status.
        if ((status == "") || status.includes("STATUS:5") || status.includes("STATUS:2")) {
            wifiConnected = false
            return false
        } else {
            wifiConnected = true
            return true
        }
    }
    
    /**
     * Connect to WiFi router.
     * @param ssid Your WiFi SSID.
     * @param password Your WiFi password.
     */
    //% weight=27
    //% blockGap=8
    //% blockId=esp8266_connect_wifi
    //% block="connect to WiFi: SSID %ssid Password %password"
    export function connectWiFi(ssid: string, password: string) {
        if (!esp8266Initialized) return
        
        // Set to station mode.
        sendCommand("AT+CWMODE=1", "OK")
        
        // Connect to WiFi router.
        if (sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 15000)) {
            wifiConnected = true
            basic.showIcon(IconNames.Yes)
        } else {
            wifiConnected = false
            basic.showIcon(IconNames.No)
        }
    }
    
    /**
     * Kirim data ke server dengan cara sederhana
     * @param serverIp Alamat IP server
     * @param port Port server
     * @param ssid Nama WiFi SSID
     * @param password Password WiFi
     * @param endpoint Endpoint/alamat API
     * @param data Data yang akan dikirim
     */
    //% weight=26
    //% blockGap=8
    //% block="kirim data ke server|IP: %serverIp|port: %port|WiFi: %ssid|password: %password|alamat: %endpoint|data: %data"
    //% port.defl=80
    //% endpoint.defl="/tes.php"
    export function kirimDataServer(serverIp: string, port: number, ssid: string, password: string, endpoint: string, data: string) {
        if (!esp8266Initialized) {
            basic.showIcon(IconNames.Sad)
            return
        }
        
        basic.showString("W")
        
        // Cek apakah sudah connect WiFi
        if (!wifiConnected) {
            // Connect ke WiFi
            connectWiFi(ssid, password)
            basic.pause(3000)
            
            if (!wifiConnected) {
                basic.showIcon(IconNames.No)
                return
            }
        }
        
        // Tunggu sedikit
        basic.pause(1000)
        basic.showString("S")
        
        // Buka koneksi TCP ke server
        if (!sendCommand("AT+CIPSTART=\"TCP\",\"" + serverIp + "\"," + port, "OK", 5000)) {
            basic.showIcon(IconNames.No)
            return
        }
        
        basic.pause(1000)
        basic.showString("D")
        
        // Format URL dengan data
        let fullEndpoint = endpoint
        if (data != "") {
            if (!endpoint.includes("?")) {
                fullEndpoint += "?"
            } else {
                fullEndpoint += "&"
            }
            fullEndpoint += data
        }
        
        // Buat request HTTP GET
        let httpRequest = "GET " + fullEndpoint + " HTTP/1.1\r\n" +
            "Host: " + serverIp + "\r\n" +
            "Connection: close\r\n\r\n"
        
        // Kirim panjang data
        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, ">", 3000)) {
            basic.showIcon(IconNames.No)
            sendCommand("AT+CIPCLOSE", "OK", 1000)
            return
        }
        
        // Kirim HTTP request
        serial.writeString(httpRequest)
        basic.pause(1000)
        
        // Tunggu sebentar dan tutup koneksi
        sendCommand("AT+CIPCLOSE", "OK", 1000)
        
        basic.showIcon(IconNames.Yes)
    }
    
    /**
     * Kirim data ke server (versi lebih sederhana)
     * @param serverIp Alamat IP server
     * @param ssid Nama WiFi SSID
     * @param password Password WiFi
     * @param data Data yang akan dikirim
     */
    //% weight=25
    //% blockGap=40
    //% block="kirim data ke|IP: %serverIp|WiFi: %ssid|password: %password|data: %data"
    //% serverIp.defl="10.155.187.242"
    //% ssid.defl="honor"
    //% password.defl="12345678"
    export function kirimData(serverIp: string, ssid: string, password: string, data: string) {
        kirimDataServer(serverIp, 80, ssid, password, "/tes.php", data)
    }
    
    /**
     * Kirim data sensor ke server
     * @param serverIp Alamat IP server
     * @param ssid Nama WiFi SSID
     * @param password Password WiFi
     * @param suhu Nilai suhu
     * @param kelembaban Nilai kelembaban
     * @param tekanan Nilai tekanan
     */
    //% weight=24
    //% blockGap=8
    //% block="kirim data sensor ke|IP: %serverIp|WiFi: %ssid|password: %password|suhu: %suhu|kelembaban: %kelembaban|tekanan: %tekanan"
    //% tekanan.defl=0
    //% serverIp.defl="10.155.187.242"
    //% ssid.defl="honor"
    //% password.defl="12345678"
    export function kirimDataSensor(serverIp: string, ssid: string, password: string, suhu: number, kelembaban: number, tekanan: number) {
        let data = "suhu=" + suhu + "&kelembaban=" + kelembaban
        if (tekanan > 0) {
            data += "&tekanan=" + tekanan
        }
        kirimData(serverIp, ssid, password, data)
    }
}
