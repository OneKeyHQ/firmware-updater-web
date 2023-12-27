# copy hardware js-sdk iframe files to desktop
mkdir -p ./public/static/js-sdk/
rsync ./node_modules/@onekeyfe/hd-web-sdk/build/ ./public/static/js-sdk/ --checksum  --recursive --verbose