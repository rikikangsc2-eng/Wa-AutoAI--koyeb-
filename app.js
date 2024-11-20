const express = require('express')
const app = express()
const port = process.env.PORT || 3000
require('./index.js')

app.get('/', (req, res) => {
  res.json({
    message: 'Hello, world!',
  })
})

app.listen(port, () => {
  console.log(`App is listening on port ${port}`)
})
