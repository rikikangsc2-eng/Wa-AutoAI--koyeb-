start_node_app() {
  while true; do
    echo "Starting node index.js..."
    node index.js
    echo "index.js crashed! Restarting in 1 minute..."
    sleep 60
  done
}

start_node_app &
node app.js