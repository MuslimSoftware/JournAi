#!/bin/bash

echo "Copying icons to desktop app..."
cp -r src-tauri/icons/* apps/desktop/src-tauri/icons/

echo "Copying icons to mobile app..."
cp -r src-tauri/icons/* apps/mobile/src-tauri/icons/

echo "Icons copied successfully!"
