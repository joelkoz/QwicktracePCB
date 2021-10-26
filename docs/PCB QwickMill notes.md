# Qwicktrace PCB Pro Notes

This file contains general notes I made as I was developing the mill and its software.


## Tips and tricks for milling

### Critical tips
* Bit must be TIGHT. Otherwise, vibration causes slip, which ruins z-height.
* X and Y bearings must be secure. Y bearing slipped out, ruining z-height during mill

### Important tips
* When cutting, there is some wobble in the bit, so make sure to give a little extra room when 
  locating position
* 1mm drill bit is fairly large.  0.9mm is better. 0.8mm is tight fit, but some components may not fit
* 30 degree VBit made a much smoother cut than then 5/32" end mill

### Helpful hints
* Place a sheet of tin foil over milled PCB to be able to autolevel it
* Scouring pad is great to clean up loose copper bits after milling


## Controller display
Connect hdmi cable for the Sharp display used in the exposure table to HDMI:0

External Display (i.e. any local display) would be HDMI:1


Customizing splash screen:
https://shop.sb-components.co.uk/blogs/posts/customising-splash-screen-on-your-raspberry-pi



## Important GCodes
```
G21 = Units in mm
G0 = Rapid position
G1 = Linear interpolation (position at current feedrate defined by previous "F")
```

Spindle on:
```
M03 S20000.0
```

Spindle off:
```
M05
```
```
G91 = Relative coordinate mode
G90 = Absolute coordinate mode
```
Doing a single probe (feed 20mm per minute, up to 14mm down from current point):
```
G91
G38.2 Z-14 F20
G90
```


## Using gerbv 

gerbv in GUI mode (just issue gerbv) allows one to examine gerber files
and drill files visually (e.g. look at intermediate files)

Using gerbv to manipulate gerber files:
```
// Rotate gerber clockwise 90 degrees:
gerbv -u mm -x rs274x -T "0x${width}r270" -o "${outFile}" "${inFile}"
```

```
// Rotate gerber counter clockwise 90 degrees:
gerbv -u mm -x rs274x -T "${height}x0r90" -o "${outFile}" "${inFile}"
```


## Using pcb2gcode to generate gcode for mill:

Create a file named "millproject" to save parameters
(vs. issuing on cli):
```
## Default options passed to pcb2gcode when generating
metric=true
metricoutput=true

# For use with grbl
software=custom
nog64=true
nog81=true

# Engraving traces
zwork=-0.25
zsafe=5
mill-feed=40
mill-speed=8500
offset=0.5

# Drilling holes
zdrill=-2.1
zchange=1.0
drill-feed=75
drill-speed=6000
onedrill=true
```
Since we manipulate gerber files internally (e.g. bottom files are
mirrored then saved to intermediate gerber file), always specify
"front" for pcb2gcode so it won't mirror a second time.

Generate gcode for copper:
```
pcb2gcode --front inputFileName.gbr --front-output outputFileName.nc
```

Generate gcode for drilling:
```
pcb2gcode --drill-side front --drill inputFileName.drl --drill-output outputFileName.nc
```
