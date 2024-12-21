#!/bin/bash

# Infinite loop to restart the script if it crashes
while true; do
  echo "Starting node index.js..."
  
  # Jalankan node index.js
  node index.js
  
  # Jika crash, tampilkan pesan dan tunggu 1 menit sebelum restart
  echo "The script crashed. Restarting in 1 minute..."
  sleep 60
done