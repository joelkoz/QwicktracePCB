EESchema Schematic File Version 4
EELAYER 30 0
EELAYER END
$Descr A4 11693 8268
encoding utf-8
Sheet 1 1
Title "QwickTrace Raspberry Pi HAT Pro"
Date "2022-01-02"
Rev "3.2"
Comp ""
Comment1 ""
Comment2 ""
Comment3 ""
Comment4 ""
$EndDescr
$Comp
L power:GND #PWR04
U 1 1 5FCCE1B4
P 2700 1200
F 0 "#PWR04" H 2700 950 50  0001 C CNN
F 1 "GND" H 2705 1027 50  0000 C CNN
F 2 "" H 2700 1200 50  0001 C CNN
F 3 "" H 2700 1200 50  0001 C CNN
	1    2700 1200
	0    -1   -1   0   
$EndComp
Text Notes 1250 1000 0    50   ~ 10
12v_-_24v_Regulated_Power
Text GLabel 4125 2050 0    50   Input ~ 0
LaserControl
$Comp
L power:+5V #PWR05
U 1 1 600B4FAC
P 2850 1550
F 0 "#PWR05" H 2850 1400 50  0001 C CNN
F 1 "+5V" V 2850 1675 50  0000 L CNN
F 2 "" H 2850 1550 50  0001 C CNN
F 3 "" H 2850 1550 50  0001 C CNN
	1    2850 1550
	0    1    1    0   
$EndComp
$Comp
L Diode:1N4001 D1
U 1 1 5FD171A4
P 2550 1550
F 0 "D1" H 2575 1450 50  0000 C CNN
F 1 "1N4001" H 2575 1675 50  0000 C CNN
F 2 "Diode_THT:D_DO-41_SOD81_P10.16mm_Horizontal" H 2550 1375 50  0001 C CNN
F 3 "http://www.vishay.com/docs/88503/1n4001.pdf" H 2550 1550 50  0001 C CNN
	1    2550 1550
	-1   0    0    1   
$EndComp
$Comp
L power:PWR_FLAG #FLG02
U 1 1 600D6005
P 2700 1150
F 0 "#FLG02" H 2700 1225 50  0001 C CNN
F 1 "PWR_FLAG" V 2700 1277 50  0000 L CNN
F 2 "" H 2700 1150 50  0001 C CNN
F 3 "~" H 2700 1150 50  0001 C CNN
	1    2700 1150
	0    -1   -1   0   
$EndComp
Wire Wire Line
	2700 1200 2700 1150
Wire Wire Line
	900  1400 1025 1400
Connection ~ 1025 1400
$Comp
L power:PWR_FLAG #FLG01
U 1 1 600C3A74
P 1025 1400
F 0 "#FLG01" H 1025 1475 50  0001 C CNN
F 1 "PWR_FLAG" H 1025 1573 50  0000 C CNN
F 2 "" H 1025 1400 50  0001 C CNN
F 3 "~" H 1025 1400 50  0001 C CNN
	1    1025 1400
	1    0    0    -1  
$EndComp
$Comp
L Connector:Raspberry_Pi_2_3 J1
U 1 1 603A8104
P 2275 3975
F 0 "J1" H 3025 5650 50  0000 C CNN
F 1 "Raspberry_Pi_2_3" H 3050 5525 50  0000 C CNN
F 2 "pcb_etcher:PinSocket_2x20_P2.54mm_BacksideMount" H 2275 3975 50  0001 C CNN
F 3 "https://www.raspberrypi.org/documentation/hardware/raspberrypi/schematics/rpi_SCH_3bplus_1p0_reduced.pdf" H 2275 3975 50  0001 C CNN
	1    2275 3975
	1    0    0    -1  
$EndComp
$Comp
L power:+5V #PWR03
U 1 1 603B1237
P 2075 2550
F 0 "#PWR03" H 2075 2400 50  0001 C CNN
F 1 "+5V" V 2075 2675 50  0000 L CNN
F 2 "" H 2075 2550 50  0001 C CNN
F 3 "" H 2075 2550 50  0001 C CNN
	1    2075 2550
	1    0    0    -1  
$EndComp
$Comp
L Connector_Generic:Conn_01x02 J2
U 1 1 603B31A5
P 4325 1275
F 0 "J2" H 4405 1267 50  0000 L CNN
F 1 "Power" H 4405 1176 50  0000 L CNN
F 2 "Connector_JST:JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical" H 4325 1275 50  0001 C CNN
F 3 "~" H 4325 1275 50  0001 C CNN
	1    4325 1275
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR07
U 1 1 603BD189
P 4125 1375
F 0 "#PWR07" H 4125 1125 50  0001 C CNN
F 1 "GND" H 4130 1202 50  0000 C CNN
F 2 "" H 4125 1375 50  0001 C CNN
F 3 "" H 4125 1375 50  0001 C CNN
	1    4125 1375
	0    1    1    0   
$EndComp
Text GLabel 1475 4575 0    50   Input ~ 0
LaserControl
NoConn ~ 3500 6400
NoConn ~ -1975 2900
Wire Wire Line
	1025 1400 1500 1400
$Comp
L jkoz_custom:AMZ_3A_MOD U1
U 1 1 60426F45
P 1900 1200
F 0 "U1" H 1925 1085 50  0000 C CNN
F 1 "AMZ_3A_MOD" H 1925 1176 50  0000 C CNN
F 2 "jkoz_custom:Amazon_3A_Power_Module" H 1900 1200 50  0001 C CNN
F 3 "https://www.amazon.com/gp/product/B08JZ5FVLC" H 1900 1200 50  0001 C CNN
	1    1900 1200
	-1   0    0    1   
$EndComp
Wire Wire Line
	2775 1550 2700 1550
Wire Wire Line
	2850 1550 2775 1550
Connection ~ 2775 1550
$Comp
L power:PWR_FLAG #FLG03
U 1 1 600CF940
P 2775 1550
F 0 "#FLG03" H 2775 1625 50  0001 C CNN
F 1 "PWR_FLAG" H 2675 1475 50  0000 C CNN
F 2 "" H 2775 1550 50  0001 C CNN
F 3 "~" H 2775 1550 50  0001 C CNN
	1    2775 1550
	-1   0    0    1   
$EndComp
Wire Wire Line
	2250 1300 2700 1300
Wire Wire Line
	2700 1300 2700 1200
Connection ~ 2700 1200
Wire Wire Line
	2250 1400 2400 1400
Wire Wire Line
	2400 1400 2400 1550
NoConn ~ 1500 1300
$Comp
L power:GND #PWR0103
U 1 1 604574F1
P 2575 5275
F 0 "#PWR0103" H 2575 5025 50  0001 C CNN
F 1 "GND" H 2580 5102 50  0000 C CNN
F 2 "" H 2575 5275 50  0001 C CNN
F 3 "" H 2575 5275 50  0001 C CNN
	1    2575 5275
	1    0    0    -1  
$EndComp
Wire Wire Line
	2075 5275 2050 5275
NoConn ~ 3075 3075
NoConn ~ 3075 3175
NoConn ~ 3075 4075
NoConn ~ 3075 4175
NoConn ~ 1475 3175
NoConn ~ 1475 3375
NoConn ~ 1475 3575
NoConn ~ 1475 4275
NoConn ~ 1475 4375
NoConn ~ 1475 4475
NoConn ~ 8450 4175
$Comp
L power:+3.3V #PWR0102
U 1 1 60601EBF
P 2375 2675
F 0 "#PWR0102" H 2375 2525 50  0001 C CNN
F 1 "+3.3V" H 2400 2825 50  0000 C CNN
F 2 "" H 2375 2675 50  0001 C CNN
F 3 "" H 2375 2675 50  0001 C CNN
	1    2375 2675
	1    0    0    -1  
$EndComp
NoConn ~ 1475 3875
NoConn ~ 1475 3975
$Comp
L power:+24V #PWR0104
U 1 1 60A2CA30
P 900 1400
F 0 "#PWR0104" H 900 1250 50  0001 C CNN
F 1 "+24V" V 915 1573 50  0000 C CNN
F 2 "" H 900 1400 50  0001 C CNN
F 3 "" H 900 1400 50  0001 C CNN
	1    900  1400
	0    -1   -1   0   
$EndComp
$Comp
L power:+24V #PWR0108
U 1 1 60A2DAC7
P 4125 1275
F 0 "#PWR0108" H 4125 1125 50  0001 C CNN
F 1 "+24V" V 4140 1448 50  0000 C CNN
F 2 "" H 4125 1275 50  0001 C CNN
F 3 "" H 4125 1275 50  0001 C CNN
	1    4125 1275
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
Text GLabel 4125 2250 0    50   Input ~ 0
ZProbeIn
Text GLabel 4125 1750 0    50   Input ~ 0
UVExpose
Text GLabel 3075 3875 2    50   Input ~ 0
UVExpose
Text GLabel 3075 3475 2    50   Input ~ 0
SCL
Text GLabel 3075 3375 2    50   Input ~ 0
SDA
Text GLabel 4675 5025 0    50   Input ~ 0
ZProbeIn
$Comp
L Device:R R1
U 1 1 60A41BEC
P 4850 5250
F 0 "R1" H 4920 5296 50  0000 L CNN
F 1 "1K8" H 4920 5205 50  0000 L CNN
F 2 "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" V 4780 5250 50  0001 C CNN
F 3 "~" H 4850 5250 50  0001 C CNN
	1    4850 5250
	1    0    0    -1  
$EndComp
$Comp
L Device:R R2
U 1 1 60A42846
P 4850 5775
F 0 "R2" H 4920 5821 50  0000 L CNN
F 1 "20K" H 4920 5730 50  0000 L CNN
F 2 "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal" V 4780 5775 50  0001 C CNN
F 3 "~" H 4850 5775 50  0001 C CNN
	1    4850 5775
	1    0    0    -1  
$EndComp
Wire Wire Line
	4675 5025 4850 5025
Wire Wire Line
	4850 5025 4850 5100
$Comp
L power:GND #PWR0116
U 1 1 60A445D6
P 4850 5925
F 0 "#PWR0116" H 4850 5675 50  0001 C CNN
F 1 "GND" H 4855 5752 50  0000 C CNN
F 2 "" H 4850 5925 50  0001 C CNN
F 3 "" H 4850 5925 50  0001 C CNN
	1    4850 5925
	1    0    0    -1  
$EndComp
Text GLabel 1475 3775 0    50   Input ~ 0
ZProbe3V3
Wire Wire Line
	4850 5400 4850 5525
Wire Wire Line
	5000 5525 4850 5525
Connection ~ 4850 5525
Wire Wire Line
	4850 5525 4850 5625
Text GLabel 5000 5525 2    50   Input ~ 0
ZProbe3V3
NoConn ~ 3075 3675
$Comp
L Connector_Generic:Conn_01x02 J9
U 1 1 60AA1528
P 4325 2550
F 0 "J9" H 4405 2542 50  0000 L CNN
F 1 "Buzzer" H 4405 2451 50  0000 L CNN
F 2 "Connector_PinHeader_2.54mm:PinHeader_2x01_P2.54mm_Vertical" H 4325 2550 50  0001 C CNN
F 3 "~" H 4325 2550 50  0001 C CNN
	1    4325 2550
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR0117
U 1 1 60AA2B0F
P 4125 2650
F 0 "#PWR0117" H 4125 2400 50  0001 C CNN
F 1 "GND" H 4130 2477 50  0000 C CNN
F 2 "" H 4125 2650 50  0001 C CNN
F 3 "" H 4125 2650 50  0001 C CNN
	1    4125 2650
	0    1    1    0   
$EndComp
Text GLabel 4125 2550 0    50   Input ~ 0
Buzzer
Text GLabel 3075 4675 2    50   Input ~ 0
Buzzer
$Comp
L power:GND #PWR0101
U 1 1 60AABF6C
P 2175 5275
F 0 "#PWR0101" H 2175 5025 50  0001 C CNN
F 1 "GND" H 2180 5102 50  0000 C CNN
F 2 "" H 2175 5275 50  0001 C CNN
F 3 "" H 2175 5275 50  0001 C CNN
	1    2175 5275
	1    0    0    -1  
$EndComp
$Comp
L Connector_Generic:Conn_01x02 J3
U 1 1 614A40F2
P 4325 1650
F 0 "J3" H 4405 1642 50  0000 L CNN
F 1 "UVPanel" H 4405 1551 50  0000 L CNN
F 2 "Connector_JST:JST_XH_B2B-XH-A_1x02_P2.50mm_Vertical" H 4325 1650 50  0001 C CNN
F 3 "~" H 4325 1650 50  0001 C CNN
	1    4325 1650
	1    0    0    -1  
$EndComp
$Comp
L jkoz_custom:ADS1115 U2
U 1 1 614AA4F0
P 6075 4250
F 0 "U2" H 6375 5525 50  0000 C CNN
F 1 "ADS1115" H 6375 5425 50  0000 C CNN
F 2 "jkoz_custom:Adafruit_ADS1115_Module" H 6075 4300 50  0001 C CNN
F 3 "" H 6075 4300 50  0001 C CNN
	1    6075 4250
	1    0    0    -1  
$EndComp
Text GLabel 5425 3550 0    50   Input ~ 0
SDA
Text GLabel 5425 3400 0    50   Input ~ 0
SCL
$Comp
L Connector_Generic:Conn_01x05 J4
U 1 1 614AB5E4
P 4250 3225
F 0 "J4" H 4330 3267 50  0000 L CNN
F 1 "Joystick" H 4330 3176 50  0000 L CNN
F 2 "Connector_JST:JST_XH_B5B-XH-A_1x05_P2.50mm_Vertical" H 4250 3225 50  0001 C CNN
F 3 "~" H 4250 3225 50  0001 C CNN
	1    4250 3225
	1    0    0    -1  
$EndComp
$Comp
L power:+5V #PWR0109
U 1 1 614AD0E8
P 4050 3025
F 0 "#PWR0109" H 4050 2875 50  0001 C CNN
F 1 "+5V" V 4050 3150 50  0000 L CNN
F 2 "" H 4050 3025 50  0001 C CNN
F 3 "" H 4050 3025 50  0001 C CNN
	1    4050 3025
	0    -1   -1   0   
$EndComp
$Comp
L power:GND #PWR0110
U 1 1 614AE511
P 4050 3125
F 0 "#PWR0110" H 4050 2875 50  0001 C CNN
F 1 "GND" H 4055 2952 50  0000 C CNN
F 2 "" H 4050 3125 50  0001 C CNN
F 3 "" H 4050 3125 50  0001 C CNN
	1    4050 3125
	0    1    1    0   
$EndComp
Text GLabel 4050 3225 0    50   Input ~ 0
JOYSTICK_X
Text GLabel 4050 3325 0    50   Input ~ 0
JOYSTICK_Y
Text GLabel 4050 3425 0    50   Input ~ 0
JOYSTICK_SW
Text GLabel 6725 3400 2    50   Input ~ 0
JOYSTICK_X
Text GLabel 6725 3550 2    50   Input ~ 0
JOYSTICK_Y
Text GLabel 6725 3700 2    50   Input ~ 0
JOYSTICK_SW
NoConn ~ 6725 3850
NoConn ~ 5425 3850
$Comp
L power:+3.3V #PWR0111
U 1 1 6149F864
P 6075 3100
F 0 "#PWR0111" H 6075 2950 50  0001 C CNN
F 1 "+3.3V" H 6075 3250 50  0000 C CNN
F 2 "" H 6075 3100 50  0001 C CNN
F 3 "" H 6075 3100 50  0001 C CNN
	1    6075 3100
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR0113
U 1 1 614A0D83
P 6075 4200
F 0 "#PWR0113" H 6075 3950 50  0001 C CNN
F 1 "GND" H 6080 4027 50  0000 C CNN
F 2 "" H 6075 4200 50  0001 C CNN
F 3 "" H 6075 4200 50  0001 C CNN
	1    6075 4200
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR0114
U 1 1 614A194D
P 5425 3700
F 0 "#PWR0114" H 5425 3450 50  0001 C CNN
F 1 "GND" H 5430 3527 50  0000 C CNN
F 2 "" H 5425 3700 50  0001 C CNN
F 3 "" H 5425 3700 50  0001 C CNN
	1    5425 3700
	0    1    1    0   
$EndComp
$Comp
L power:GND #PWR0115
U 1 1 614B5BD2
P 4125 2150
F 0 "#PWR0115" H 4125 1900 50  0001 C CNN
F 1 "GND" H 4130 1977 50  0000 C CNN
F 2 "" H 4125 2150 50  0001 C CNN
F 3 "" H 4125 2150 50  0001 C CNN
	1    4125 2150
	0    1    1    0   
$EndComp
Wire Wire Line
	2175 2675 2075 2675
Connection ~ 2075 2675
$Comp
L power:+3.3V #PWR0118
U 1 1 614B768E
P 2475 2675
F 0 "#PWR0118" H 2475 2525 50  0001 C CNN
F 1 "+3.3V" H 2700 2750 50  0000 C CNN
F 2 "" H 2475 2675 50  0001 C CNN
F 3 "" H 2475 2675 50  0001 C CNN
	1    2475 2675
	1    0    0    -1  
$EndComp
$Comp
L power:PWR_FLAG #FLG0101
U 1 1 614B81B0
P 2475 2675
F 0 "#FLG0101" H 2475 2750 50  0001 C CNN
F 1 "PWR_FLAG" V 2475 2803 50  0000 L CNN
F 2 "" H 2475 2675 50  0001 C CNN
F 3 "~" H 2475 2675 50  0001 C CNN
	1    2475 2675
	0    1    1    0   
$EndComp
Connection ~ 2475 2675
$Comp
L power:PWR_FLAG #FLG0102
U 1 1 614BC6C7
P 2375 2675
F 0 "#FLG0102" H 2375 2750 50  0001 C CNN
F 1 "PWR_FLAG" V 2600 2450 50  0000 L CNN
F 2 "" H 2375 2675 50  0001 C CNN
F 3 "~" H 2375 2675 50  0001 C CNN
	1    2375 2675
	0    -1   -1   0   
$EndComp
Connection ~ 2375 2675
$Comp
L power:GND #PWR0119
U 1 1 614BE645
P 2475 5275
F 0 "#PWR0119" H 2475 5025 50  0001 C CNN
F 1 "GND" H 2480 5102 50  0000 C CNN
F 2 "" H 2475 5275 50  0001 C CNN
F 3 "" H 2475 5275 50  0001 C CNN
	1    2475 5275
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR0120
U 1 1 614BEA60
P 2375 5275
F 0 "#PWR0120" H 2375 5025 50  0001 C CNN
F 1 "GND" H 2380 5102 50  0000 C CNN
F 2 "" H 2375 5275 50  0001 C CNN
F 3 "" H 2375 5275 50  0001 C CNN
	1    2375 5275
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR0121
U 1 1 614BED9E
P 2275 5275
F 0 "#PWR0121" H 2275 5025 50  0001 C CNN
F 1 "GND" H 2280 5102 50  0000 C CNN
F 2 "" H 2275 5275 50  0001 C CNN
F 3 "" H 2275 5275 50  0001 C CNN
	1    2275 5275
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR0122
U 1 1 614BF0BA
P 2050 5275
F 0 "#PWR0122" H 2050 5025 50  0001 C CNN
F 1 "GND" H 2055 5102 50  0000 C CNN
F 2 "" H 2050 5275 50  0001 C CNN
F 3 "" H 2050 5275 50  0001 C CNN
	1    2050 5275
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR0123
U 1 1 614BF42D
P 1975 5275
F 0 "#PWR0123" H 1975 5025 50  0001 C CNN
F 1 "GND" H 1980 5102 50  0000 C CNN
F 2 "" H 1975 5275 50  0001 C CNN
F 3 "" H 1975 5275 50  0001 C CNN
	1    1975 5275
	1    0    0    -1  
$EndComp
$Comp
L power:GND #PWR0124
U 1 1 614BF639
P 1875 5275
F 0 "#PWR0124" H 1875 5025 50  0001 C CNN
F 1 "GND" H 1880 5102 50  0000 C CNN
F 2 "" H 1875 5275 50  0001 C CNN
F 3 "" H 1875 5275 50  0001 C CNN
	1    1875 5275
	1    0    0    -1  
$EndComp
Wire Wire Line
	2075 2625 2075 2675
Wire Wire Line
	2075 2550 2075 2675
NoConn ~ 3075 3775
NoConn ~ 3075 4275
NoConn ~ 3075 4375
NoConn ~ 3075 4475
NoConn ~ 1475 4675
NoConn ~ 1475 3475
Text GLabel 3075 4775 2    50   Input ~ 0
UVSafe
Text GLabel 4125 1650 0    50   Input ~ 0
UVSafe
NoConn ~ 1475 3075
NoConn ~ 1475 4175
$EndSCHEMATC
