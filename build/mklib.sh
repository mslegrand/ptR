pushd .
rm -rf ./assets/library
mkdir ./assets/library
cd  ./assets/library
# copy from the libPath (assuming only one path)
# for my linux libPath is "~/Apps/lib/R/library"
# for my mac, libPath is "/Library/Frameworks/R.framework/Versions/3.6/Resources/library"
libPath=$(RScript -e 'cat(.libPaths())')
cp -rf $libPath/svgR .
cp -rf $libPath/pointR .
cp -rf $libPath/shinyDMDMenu .
cp -rf $libPath/shinyjqui .
cp -rf $libPath/rowPicker .
popd
rm -rf ../library
cp -rf ./assets/library ..


