EESchema Schematic File Version 4
EELAYER 30 0
EELAYER END
$Descr A4 11693 8268
encoding utf-8
Sheet 1 1
Title "QwickTrace Raspberry Pi HAT"
Date "2021-05-22"
Rev "2.1"
Comp ""
Comment1 ""
Comment2 ""
Comment3 ""
Comment4 ""
$EndDescr
Text GLabel 4950 4250 0    50   Input ~ 0
LaserControl
Text Notes 4800 3550 0    50   ~ 10
CNC Laser Pointer Control
NoConn ~ 3500 6400
NoConn ~ -1975 2900
$Comp
L Transistor_BJT:BD139 Q1
U 1 1 6046CF81
P 5150 4250
F 0 "Q1" H 5342 4296 50  0000 L CNN
F 1 "BD139" H 5342 4205 50  0000 L CNN
F 2 "Package_TO_SOT_THT:TO-126-3_Vertical" H 5350 4175 50  0001 L CIN
F 3 "http://www.st.com/internet/com/TECHNICAL_RESOURCES/TECHNICAL_LITERATURE/DATASHEET/CD00001225.pdf" H 5150 4250 50  0001 L CNN
	1    5150 4250
	1    0    0    -1  
$EndComp
Text GLabel 5250 4050 1    50   Input ~ 0
LaserGnd
NoConn ~ 8450 4175
$Comp
L power:+5V #PWR0109
U 1 1 60A2F960
P 4125 2050
F 0 "#PWR0109" H 4125 1900 50  0001 C CNN
F 1 "+5V" V 4125 2175 50  0000 L CNN
F 2 "" H 4125 2050 50  0001 C CNN
F 3 "" H 4125 2050 50  0001 C CNN
	1    4125 2050
	0    -1   -1   0   
$EndComp
$Comp
L Connector_Generic:Conn_01x03 J5
U 1 1 60A35B49
P 4325 2150
F 0 "J5" H 4405 2192 50  0000 L CNN
F 1 "CNC" H 4405 2101 50  0000 L CNN
F 2 "Connector_JST:JST_XH_B3B-XH-A_1x03_P2.50mm_Vertical" H 4325 2150 50  0001 C CNN
F 3 "~" H 4325 2150 50  0001 C CNN
	1    4325 2150
	1    0    0    -1  
$EndComp
$Comp
L power:+5V #PWR0119
U 1 1 60FF4C30
P 5250 4450
F 0 "#PWR0119" H 5250 4300 50  0001 C CNN
F 1 "+5V" V 5250 4575 50  0000 L CNN
F 2 "" H 5250 4450 50  0001 C CNN
F 3 "" H 5250 4450 50  0001 C CNN
	1    5250 4450
	-1   0    0    1   
$EndComp
Text GLabel 4125 2150 0    50   Input ~ 0
LaserGnd
Text GLabel 4125 2250 0    50   Input ~ 0
LaserControl
$EndSCHEMATC
