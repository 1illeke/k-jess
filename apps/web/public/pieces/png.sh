for file in *.svg
do
	new_file=${file/svg/png}
	inkscape -w 512 -h 512 "$file" -o "$new_file"
done
