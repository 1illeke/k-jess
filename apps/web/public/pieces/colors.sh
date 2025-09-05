
COLOR=#ff0000
ORIENTATION=left

for file in bottom_*.svg
do
	new_file=${file/bottom_/${ORIENTATION}_}
	sed "s/fill:#ffffff/fill:$COLOR/" $file > $new_file
done
