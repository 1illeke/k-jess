
COLOR=#eeeeee
ORIENTATION=bottom

for file in base_*.svg
do
	new_file=${file/base_/${ORIENTATION}_}
	sed "s/fill:#ffffff/fill:$COLOR/" $file > $new_file
done
