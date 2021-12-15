#!/bin/bash

workdir="x"

cpw() {
	fname=`ls *$1.gbr`
    prefix="${fname%%$1.gbr}"
    dest=$workdir/$prefix.$2
    # echo "Copying $fname to $dest"
    cp -v "$fname" "$dest"
}

#Determine the work directory (named after the file prefix)
cd gbr
fname=`ls *-B_Cu.gbr`
workdir="${fname%%-B_Cu.gbr}"

echo "Bundling $workdir GBR files to ZIP"
mkdir "$workdir"


cpw "-F_Cu" "gtl"
cpw "-B_Cu" "gbl"
cpw "-F_Mask" "gts"
cpw "-B_Mask" "gbs"
cpw "-F_SilkS" "gto"
cpw "-B_SilkS" "gbo"
cpw "-Edge_Cuts" "oln"

# Copy the drill file
cp -v "$workdir.drl" "$workdir"

echo "Creating $workdir.zip"
zip -r "$workdir" "$workdir"
rm -rf "$workdir"
mv "$workdir.zip" ..
cd ..
