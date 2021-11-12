# Qwicktrace Pro PCB
Qwicktrace PCB is the software component of the QwickFab PCB open source circuit board fabrication system for desktops.
The system dramatically reduces the time and skill required to make top quality boards single and double sided circuit 
boards for prototyping and one off use. Using QwickFab PCB, making a PCB is as simple as uploading your Gerber files to 
the Pro controller, selecting the process you wish to use to create the board, and then following the on-screen step
by step instructions. 



# Overview
QwickFab PCB consists of three major hardware components:

1. The Qwicktrace Pro Controller is small control device with touchscreen and joystick powered by a Raspberry Pi 4 and the software
found in this repository. It is comprised of a software stack and UI for controller the other two hardware components below. The 
Controller can run either of the two other components individually, or together as a complete desktop PCB fabrication system.

2. The Qwicktrace Exposure Table is a small device for quickly exposing photosensitive copper boards to ultraviolet light masked using a process called "Masked Stereolithography" (MSLA). The all new design of this exposure system contiains an amber LED "safe light" for illuminating the mask for end user board positioning that is invisible to the photosenstive board.

3. The Qwickmill mini CNC is a small desktop CNC machine designed specifically for working with small printed circuit boards. It can
quickly drill the holes needed by through hole components on boards processed with the Exposure table.  It can also mill an entire PCB on blank copper boards using special ingraving bits. This is handy if your board is simple enough as to not need the better resolution of the exposure table, or if you are on a budget and would prefer not to spend the extra money on photosensitive boards. 
Finally, the Qwickmill can be used to cut board stock down to smaller sizes.

The software on the Pro Controller (source code found on this repo) handles the more challenging aspects of making a PCB, such as aligning the drilling with the traces made on the exposure table, or positioning the opposite side of a board on a double sided PCB.



# DIY construction of a Qwickfab system

The Qwickfab Pro system is made from parts printed with your 3D printer as well as easy to obtain off the shelf parts. The
STL files for this project can be found here in this repo in the `stl-files` directory. A complete bill of materials can be
found in the `docs` directory, along with build instructions and other technical documentation.

To install the software on the Raspberry Pi, see the file `Setting up Raspberry Pi`, also in `docs`



# Development

The Qwicktrace user interface on the Pro Controller is a touchscreen app written in NodeJS/Javascript and built with the
Electron framework.  This UI is layered on top of a software stack comprised of many great open source software packages. These include:

1. [Tracespace](https://github.com/tracespace) Gerber processing library for Javascript
2. [pcb2gcode](https://github.com/pcb2gcode/pcb2gcode) Gerber to GCode utility for milling isolation traces
3. [CNCjs](https://github.com/cncjs/cncjs) Web interface and Grbl server for CNC machine control
4. [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2) Advanced event handling for NodeJS

For additional technical information on the Qwicktrace software architecture, see the `docs` directory


