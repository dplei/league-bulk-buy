import express from 'express'
import cors from 'cors'
import lcuRouter from './routes/lcu.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api', lcuRouter)

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
  console.log('等待前端连接...')
})
