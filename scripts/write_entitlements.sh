#!/bin/bash

# Modified from:
# https://stackoverflow.com/questions/67264212/android-emulator-crash-when-start-hvf-error-hv-error

original_dir=$(pwd)
target_dir=~/Library/Android/sdk/emulator/qemu/darwin-aarch64
file_path=entitlements.xml

xml_content='<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.hypervisor</key>
    <true/>
</dict>
</plist>'

cd "$target_dir" || echo "cd $target_dir was not successful"
echo "$xml_content" > "$file_path"

find . -name "qemu-*" | while IFS= read -r f; do
   codesign -s - --entitlements entitlements.xml --force "$f"
done

cat $file_path

cd "$original_dir" || echo "cd $original_dir was not successful"
