G94 ( Millimeters per minute feed rate. )
G21 ( Units == Millimeters. )

G90 ( Absolute coordinates. )
G00 S9500 ( RPM spindle speed. )
G01 F36.00000 ( Feedrate. )

M3 ( Spindle on clockwise. )
G04 P1.00000 (Wait for spindle to get up to speed)

G00 Z1.7000 (Safe Z)

(Cut a line------------------)
G01 F25.00000 ( plunge rate. )
G01 Z-0.20000 (Cut depth)
G01 F36.00 (cut rate)
G91
G01 X10
G90
G00 Z1.7000 

(Position for next)
G91
G00 X-10 Y4
G90



(Cut a line------------------)
G01 F25.00000 ( plunge rate. )
G01 Z-0.2500 (Cut depth)
G01 F36.00 (cut rate)
G91
G01 X10
G90
G01 F25.00000 ( plunge rate. )
G00 Z1.7000 

(Position for next)
G91
G00 X-10 Y4
G90


(Cut a line------------------)
G01 F25.00000 ( plunge rate. )
G01 Z-0.30000 (Cut depth)
G01 F36.00 (cut rate)
G91
G01 X10
G90
G01 F25.00000 ( plunge rate. )
G00 Z1.7000 

(Position for next)
G91
G00 X-10 Y4
G90


(Cut a line------------------)
G01 F25.00000 ( plunge rate. )
G01 Z-0.35000 (Cut depth)
G01 F36.00 (cut rate)
G91
G01 X10
G90
G01 F25.00000 ( plunge rate. )
G00 Z1.7000 

(Position for next)
G91
G00 X-10 Y4
G90

M5
