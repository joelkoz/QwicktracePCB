# QwicktracePCB 
This is the UI and control software for the Qwicktrace PCB exposure table described in my [Hackaday project](https://hackaday.io/project/178451-qwicktrace-pcb). All details on assembling the project hardware can be found there.


## Setting up Raspberry Pi
This is a very rough list of things needed to do to setup the Raspberry Pi and install this QwicktracePCB controller software on it

1. Download and use "Raspberry Pi Imager" to flash an SD card from your desktop computer. Use recommended 32 bit OS on main menu. You need the OS 'with Desktop Software'.

2. Before installing the SD card in the Pi, create the file `ssh` in the root directory of the SD card. This can be done on a Mac by using Terminal, then typing `echo >/Volumes/boot/ssh`

3. On the same SD card, create the file `wpa_supplicant.conf` with the following contents:
```
country=US
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1

network={
  ssid="NETWORK-NAME"
  psk="NETWORK-PASSWORD"
}
```

4. Replace the contents of the file `config.txt` on the SD card with the file found in the `pi-config/boot` directory of this project. It can be downloaded to your desktop computer using [this link](https://raw.githubusercontent.com/joelkoz/QwicktracePCB/main/pi-config/boot/config.txt).

5. Put the SD card in the Pi and boot. 

6. Use `ssh` to connect to the Pi from your desktop. It should be available on your network as `raspberrypi.local`.  Thus, `ssh pi@raspberrypi.local` should connect you. The default password is `raspberry`.

7. Change the password using the `passwd` command.

8. Update all software using these commands:
```
sudo apt update
sudo apt full-upgrade
```

9. Configure the system with raspi-config:
```
sudo raspi-config

   *  Use the System Options to specify "Boot to command line" (in case something weird goes wrong)
   
   *  Change the host name to `pcb`
```

10. Install required software and utilities:
```
sudo apt-get update
sudo apt-get install nodejs
sudo apt-get install npm
sudo apt-get install fbi
```

11. From your home Pi directory, install the software from this project:
```
cd ~
git clone https://github.com/joelkoz/QwicktracePCB
cd QwicktracePCB
npm install
```

12. Install the X11 multihead configuration:
```
sudo cp /home/pi/QwicktracePCB/pi-config/x11/99-multihead.conf /usr/share/X11/xorg.conf.d
```

13. Enable the `pigpiod` daemon to give the software access to the GPIO pins:
```
sudo nano /lib/systemd/system/pigpiod.service
change line to:
ExecStart=/usr/bin/pigpiod -n 127.0.0.1 -p 8888

save file

sudo systemctl daemon-reload
sudo systemctl enable pigpiod
sudo service pigpiod start
```

14. Install the driver for the small SPI LCD screen:
```
cd /home/pi/pi-config/overlays
./make
sudo nano /boot/config.txt

Toward the bottom of the file, uncomment the lines that enable the display drivers:

## TFT screen configuration--------
# Uncomment these lines once the dts file has been compiled and installed.
dtoverlay=qwicktrace-hat
dtoverlay=spi0-2cs,cs0_pin=17,cs1_pin=6
```

15. Reboot the Pi:
```
sudo reboot
```

16. Connect back to the Pi via ssh. The DNS name of the machine should now be `pcb.local`, so use `ssh pi@pcb.local`

17. Test to see if the small SPI screen is working. An image on the small screen should appear after:
```
sudo fbi -T 1 -d /dev/fb1 -noverbose /home/pi/QwicktracePCB/qwick-splash.png
```

18. Configure desktop to run Qwicktrace exclusively:
```
sudo cp /etc/xdg/lxsession/LXDE-pi/autostart /etc/xdg/lxsession/LXDE-pi/autostart-desktop

sudo cp /home/pi/QwicktracePCB/pi-config/lxde/autostart-app /etc/xdg/lxsession/LXDE-pi

sudo cp /etc/xdg/lxsession/LXDE-pi/autostart-app /etc/xdg/lxsession/LXDE-pi/autostart
```

19. Disable cursor on touchscreen:
```
sudo nano /etc/lightdm/lightdm.conf

Find the [Seat*] section, uncomment the "#server-command=" line, and make it:

xserver-command=X -nocursor
```

20. Start the desktop system and make sure everything is working:
```
sudo service display-manager start
```

21. If all is well, re-enable "Boot to desktop" using raspi-config:
```
sudo raspi-config
```
