/**
 * BantayBot Camera ESP32-CAM Board Configuration
 * AI Thinker ESP32-CAM Module Pin Definitions
 */

#ifndef BOARD_CONFIG_H
#define BOARD_CONFIG_H

// AI Thinker ESP32-CAM Camera Pin Definitions
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Flash LED (optional)
#define LED_GPIO_NUM       4

// Available GPIO pins for expansion
// GPIO 2, 12, 13, 14, 15, 16 are available
// Note: GPIO 1, 3 are used for Serial (debugging)

#endif // BOARD_CONFIG_H
