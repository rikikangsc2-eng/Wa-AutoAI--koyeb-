start_server() {
  while true; do
    echo -e "HTTP/1.1 200 OK\r\nContent-Length: $(echo -n "Bot running on koyeb✓" | wc -c)\r\n\r\nBot running on koyeb✓" | nc -l -p 3000 -q 1
  done
}

start_node_app() {
  while true; do
    echo "Starting node index.js..."
    node index.js
    echo "index.js crashed! Restarting in 1 minute..."
    sleep 60
  done
}

start_server &  
start_node_app  