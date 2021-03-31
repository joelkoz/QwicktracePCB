EESchema Schematic File Version 4
EELAYER 30 0
EELAYER END
$Descr A4 11693 8268
encoding utf-8
Sheet 1 1
Title ""
Date ""
Rev ""
Comp ""
Comment1 ""
Comment2 ""
Comment3 ""
Comment4 ""
$EndDescr
$Comp
L Connector_Generic:Conn_01x14 J1
U 1 1 606357D6
P 2025 2425
F 0 "J1" H 2105 2417 50  0000 L CNN
F 1 "Conn_01x14" H 2105 2326 50  0000 L CNN
F 2 "Connector_PinSocket_2.54mm:PinSocket_1x14_P2.54mm_Vertical" H 2025 2425 50  0001 C CNN
F 3 "~" H 2025 2425 50  0001 C CNN
	1    2025 2425
	1    0    0    -1  
$EndComp
$Comp
L Connector_Generic:Conn_02x08_Odd_Even J2
U 1 1 60636FDF
P 3625 2450
F 0 "J2" H 3675 2967 50  0000 C CNN
F 1 "Conn_02x08_Odd_Even" H 3675 2876 50  0000 C CNN
F 2 "Connector_IDC:IDC-Header_2x08_P2.54mm_Vertical" H 3625 2450 50  0001 C CNN
F 3 "~" H 3625 2450 50  0001 C CNN
	1    3625 2450
	1    0    0    -1  
$EndComp
Text GLabel 3425 2150 0    50   Input ~ 0
VCC
Text GLabel 3925 2150 2    50   Input ~ 0
VCC
Text GLabel 3425 2250 0    50   Input ~ 0
GND
Text GLabel 3925 2250 2    50   Input ~ 0
CS
NoConn ~ 3425 2350
Text GLabel 3925 2450 2    50   Input ~ 0
DC
NoConn ~ 3425 2450
Text GLabel 3925 2350 2    50   Input ~ 0
RESET
Text GLabel 3925 2550 2    50   Input ~ 0
MOSI
Text GLabel 3425 2650 0    50   Input ~ 0
MISO
Text GLabel 3425 2550 0    50   Input ~ 0
MOSI
Text GLabel 3925 2650 2    50   Input ~ 0
MISO
Text GLabel 3425 2750 0    50   Input ~ 0
SLCK
Text GLabel 3925 2750 2    50   Input ~ 0
SLCK
Text GLabel 3925 2850 2    50   Input ~ 0
T_CS
Text GLabel 3425 2850 0    50   Input ~ 0
T_IRQ
Text GLabel 1825 3125 0    50   Input ~ 0
VCC
Text GLabel 1825 3025 0    50   Input ~ 0
GND
Text GLabel 1825 2925 0    50   Input ~ 0
CS
Text GLabel 1825 2825 0    50   Input ~ 0
RESET
Text GLabel 1825 2725 0    50   Input ~ 0
DC
Text GLabel 1825 2625 0    50   Input ~ 0
MOSI
Text GLabel 1825 2525 0    50   Input ~ 0
SLCK
Text GLabel 1825 2425 0    50   Input ~ 0
VCC
Text GLabel 1825 2325 0    50   Input ~ 0
MISO
Text GLabel 1825 2225 0    50   Input ~ 0
SLCK
Text GLabel 1825 2125 0    50   Input ~ 0
T_CS
Text GLabel 1825 2025 0    50   Input ~ 0
MOSI
Text GLabel 1825 1925 0    50   Input ~ 0
MISO
Text GLabel 1825 1825 0    50   Input ~ 0
T_IRQ
$EndSCHEMATC
