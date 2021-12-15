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
L Connector:Conn_01x03_Female J5
U 1 1 61B904BB
P 1225 2475
F 0 "J5" H 1100 2825 50  0000 L CNN
F 1 "Pi-Hat-CNC-JST" H 850 2725 50  0000 L CNN
F 2 "" H 1225 2475 50  0001 C CNN
F 3 "~" H 1225 2475 50  0001 C CNN
	1    1225 2475
	-1   0    0    1   
$EndComp
$Comp
L Connector:Conn_01x02_Female J2
U 1 1 61B9266F
P 4875 975
F 0 "J2" H 4800 1200 50  0000 L CNN
F 1 "Pi-Hat-Power JST_01x02_Female" H 4525 1100 50  0000 L CNN
F 2 "" H 4875 975 50  0001 C CNN
F 3 "~" H 4875 975 50  0001 C CNN
	1    4875 975 
	1    0    0    -1  
$EndComp
$Comp
L Connector:Conn_01x02_Female J3
U 1 1 61B932C5
P 8325 1550
F 0 "J3" V 8425 1450 50  0000 L CNN
F 1 "Pi-Hat-UVPanel-JST" V 8550 1175 50  0000 L CNN
F 2 "" H 8325 1550 50  0001 C CNN
F 3 "~" H 8325 1550 50  0001 C CNN
	1    8325 1550
	0    1    1    0   
$EndComp
$Comp
L Connector:Conn_01x05_Female J4
U 1 1 61B93CBA
P 4850 2350
F 0 "J4" H 4878 2376 50  0000 L CNN
F 1 "Pi-Hat-Joystick-JST" V 5050 2025 50  0000 L CNN
F 2 "" H 4850 2350 50  0001 C CNN
F 3 "~" H 4850 2350 50  0001 C CNN
	1    4850 2350
	-1   0    0    1   
$EndComp
$Comp
L Connector:Barrel_Jack J1
U 1 1 61B94C6A
P 975 950
F 0 "J1" H 1032 1275 50  0000 C CNN
F 1 "24V-In-Barrel_Jack" H 1032 1184 50  0000 C CNN
F 2 "" H 1025 910 50  0001 C CNN
F 3 "~" H 1025 910 50  0001 C CNN
	1    975  950 
	1    0    0    -1  
$EndComp
$Comp
L Connector:DIN-4 J3-2
U 1 1 61B96787
P 7225 1475
F 0 "J3-2" H 7225 1200 50  0000 C CNN
F 1 "Exposure-DIN-4" H 7225 1109 50  0000 C CNN
F 2 "" H 7225 1475 50  0001 C CNN
F 3 "http://www.mouser.com/ds/2/18/40_c091_abd_e-75918.pdf" H 7225 1475 50  0001 C CNN
	1    7225 1475
	1    0    0    -1  
$EndComp
$Comp
L power:+24V #PWR?
U 1 1 61B9F39F
P 1375 850
F 0 "#PWR?" H 1375 700 50  0001 C CNN
F 1 "+24V" V 1325 825 50  0000 C CNN
F 2 "" H 1375 850 50  0001 C CNN
F 3 "" H 1375 850 50  0001 C CNN
	1    1375 850 
	0    1    1    0   
$EndComp
$Comp
L power:GND #PWR?
U 1 1 61B9FFAC
P 1275 1050
F 0 "#PWR?" H 1275 800 50  0001 C CNN
F 1 "GND" H 1280 877 50  0000 C CNN
F 2 "" H 1275 1050 50  0001 C CNN
F 3 "" H 1275 1050 50  0001 C CNN
	1    1275 1050
	1    0    0    -1  
$EndComp
Text Label 2350 2250 2    50   ~ 0
ZProbeIn
Text Label 1950 2850 0    50   ~ 0
LaserControl
Text Label 8075 775  2    50   ~ 0
SafeLightControl
Text Label 5525 2350 0    50   ~ 0
JoystickX
Text Label 5625 2250 0    50   ~ 0
JoystickY
Text Label 5625 2150 0    50   ~ 0
JoystickSW
Text Label 3675 2650 1    50   ~ 0
+24V_Switched
Wire Wire Line
	2600 2850 1900 2850
Wire Wire Line
	1900 2850 1900 2575
Wire Wire Line
	1900 2575 1425 2575
Wire Wire Line
	2600 2250 1675 2250
Wire Wire Line
	1675 2250 1675 2375
Wire Wire Line
	1675 2375 1425 2375
Wire Wire Line
	6225 1475 6925 1475
Wire Wire Line
	8225 1350 8225 975 
Wire Wire Line
	8225 975  7325 975 
Wire Wire Line
	7325 975  7325 1175
Text Label 7425 975  0    50   ~ 0
UVExposureControl
Wire Wire Line
	5050 2350 5800 2350
Wire Wire Line
	5800 2350 5800 2675
Wire Wire Line
	5050 2250 5900 2250
Wire Wire Line
	5900 2250 5900 2675
Wire Wire Line
	6000 2150 6000 2675
Wire Wire Line
	5050 2150 6000 2150
$Comp
L Connector:Conn_01x05_Female J42
U 1 1 61BF49C0
P 5800 2475
F 0 "J42" V 5500 2450 50  0000 L CNN
F 1 "Joystick_Dupont_01x05_Female" V 5375 1950 50  0000 L CNN
F 2 "" H 5800 2475 50  0001 C CNN
F 3 "~" H 5800 2475 50  0001 C CNN
	1    5800 2475
	0    -1   -1   0   
$EndComp
$Comp
L Connector:Conn_01x02_Male J1-2
U 1 1 61C09273
P 1875 1025
F 0 "J1-2" H 1937 1069 50  0000 L CNN
F 1 "XT30_Male" H 1775 1175 50  0000 L CNN
F 2 "" H 1875 1025 50  0001 C CNN
F 3 "~" H 1875 1025 50  0001 C CNN
	1    1875 1025
	-1   0    0    1   
$EndComp
$Comp
L Connector:Conn_01x02_Female J1-2-2
U 1 1 61C09C53
P 2300 1025
F 0 "J1-2-2" H 2175 1100 50  0000 R CNN
F 1 "XT30_Female" H 2350 1175 50  0000 R CNN
F 2 "" H 2300 1025 50  0001 C CNN
F 3 "~" H 2300 1025 50  0001 C CNN
	1    2300 1025
	-1   0    0    1   
$EndComp
Wire Wire Line
	1275 850  1375 850 
Wire Wire Line
	1375 850  1375 925 
Wire Wire Line
	1375 925  1675 925 
Wire Wire Line
	1250 1050 1275 1050
Wire Wire Line
	1375 1050 1375 1025
Wire Wire Line
	1375 1025 1675 1025
Connection ~ 1275 1050
Wire Wire Line
	1275 1050 1375 1050
Connection ~ 1375 850 
Text Label 6325 1475 0    50   ~ 0
+24V_Switched
Wire Wire Line
	3275 975  2975 975 
Wire Wire Line
	2975 975  2975 925 
Wire Wire Line
	2975 925  2500 925 
Text Label 2550 925  0    50   ~ 0
+24V
$Comp
L Connector:Conn_01x02_Male J5-2-1
U 1 1 61C2FA88
P 3575 1600
F 0 "J5-2-1" H 3525 1850 50  0000 L CNN
F 1 "XT30_Male" H 3475 1750 50  0000 L CNN
F 2 "" H 3575 1600 50  0001 C CNN
F 3 "~" H 3575 1600 50  0001 C CNN
	1    3575 1600
	0    -1   -1   0   
$EndComp
Text Label 3775 975  0    50   ~ 0
+24V_Switched
$Comp
L Switch:SW_SPST SW1
U 1 1 61B9A63D
P 3475 975
F 0 "SW1" H 3475 1210 50  0000 C CNN
F 1 "Toggle-SW_SPST" H 3475 1119 50  0000 C CNN
F 2 "" H 3475 975 50  0001 C CNN
F 3 "~" H 3475 975 50  0001 C CNN
	1    3475 975 
	1    0    0    -1  
$EndComp
Wire Wire Line
	3675 975  3675 1400
Connection ~ 3675 975 
$Comp
L Connector:Conn_01x02_Male J3-2-2
U 1 1 61C4A6EC
P 6025 1475
F 0 "J3-2-2" H 6025 1750 50  0000 L CNN
F 1 "JST_01x02_Male" H 5925 1625 50  0000 L CNN
F 2 "" H 6025 1475 50  0001 C CNN
F 3 "~" H 6025 1475 50  0001 C CNN
	1    6025 1475
	1    0    0    -1  
$EndComp
Wire Wire Line
	2800 2875 2800 2850
$Comp
L Connector:DIN-5 J5-2
U 1 1 61B98BD2
P 2700 2550
F 0 "J5-2" V 2654 2320 50  0000 R CNN
F 1 "CNC-DIN-5" V 2745 2320 50  0000 R CNN
F 2 "" H 2700 2550 50  0001 C CNN
F 3 "http://www.mouser.com/ds/2/18/40_c091_abd_e-75918.pdf" H 2700 2550 50  0001 C CNN
	1    2700 2550
	0    -1   -1   0   
$EndComp
$Comp
L Connector:Conn_01x02_Female J5-2-2
U 1 1 61C65D35
P 3575 1775
F 0 "J5-2-2" V 3575 1550 50  0000 R CNN
F 1 "XT30_Female" V 3450 1625 50  0000 R CNN
F 2 "" H 3575 1775 50  0001 C CNN
F 3 "~" H 3575 1775 50  0001 C CNN
	1    3575 1775
	0    -1   -1   0   
$EndComp
Wire Wire Line
	3675 1975 3675 2875
Wire Wire Line
	3675 2875 2800 2875
Wire Wire Line
	3575 1975 3575 2250
Wire Wire Line
	3575 2250 2800 2250
Wire Wire Line
	2400 2550 2125 2550
Wire Wire Line
	2125 2550 2125 2475
Wire Wire Line
	2125 2475 1425 2475
Text Label 1800 2475 0    50   ~ 0
GND
Text Label 3150 2250 0    50   ~ 0
GND
Wire Wire Line
	2500 1025 2925 1025
Wire Wire Line
	2925 1175 3575 1175
Wire Wire Line
	3575 1175 3575 1400
Text Label 2550 1025 0    50   ~ 0
GND
Wire Wire Line
	4675 1075 4400 1075
Wire Wire Line
	2925 1025 2925 1075
Connection ~ 2925 1075
Wire Wire Line
	2925 1075 2925 1175
Text Label 4250 1075 0    50   ~ 0
GND
Wire Wire Line
	6225 1575 6675 1575
Wire Wire Line
	6675 1575 6675 2050
Wire Wire Line
	6675 2050 7725 2050
Wire Wire Line
	7725 2050 7725 1475
Wire Wire Line
	7725 1475 7525 1475
Text Label 6375 1575 0    50   ~ 0
GND
Wire Wire Line
	8325 775  7125 775 
Wire Wire Line
	7125 775  7125 1175
Wire Wire Line
	8325 775  8325 1350
$Comp
L Connector:Conn_01x02_Female J3-2-1
U 1 1 61C97012
P 5500 1475
F 0 "J3-2-1" H 5325 1700 50  0000 L CNN
F 1 "JST_01x02_Female" H 5150 1600 50  0000 L CNN
F 2 "" H 5500 1475 50  0001 C CNN
F 3 "~" H 5500 1475 50  0001 C CNN
	1    5500 1475
	1    0    0    -1  
$EndComp
Wire Wire Line
	5300 1475 4525 1475
Wire Wire Line
	4525 1475 4525 975 
Wire Wire Line
	3675 975  4525 975 
Connection ~ 4525 975 
Wire Wire Line
	4525 975  4675 975 
Wire Wire Line
	5300 1575 4400 1575
Wire Wire Line
	4400 1575 4400 1075
Connection ~ 4400 1075
Wire Wire Line
	4400 1075 2925 1075
Text Label 4650 1475 0    50   ~ 0
+24V_Switched
Text Label 4675 1575 0    50   ~ 0
GND
Wire Wire Line
	5050 2450 5700 2450
Wire Wire Line
	5700 2450 5700 2675
Wire Wire Line
	5050 2550 5600 2550
Wire Wire Line
	5600 2550 5600 2675
Text Label 5425 2450 0    50   ~ 0
GND
Text Label 5375 2550 0    50   ~ 0
+5V
$EndSCHEMATC
