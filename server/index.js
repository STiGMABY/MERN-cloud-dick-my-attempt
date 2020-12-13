const express = require('express')
const mongoose = require('mongoose')
const config = require('config')
const fileUpload = require('express-fileupload')
const authRouter = require('./routes/auth.routes')
const fileRouter = require('./routes/file.routes')
const app = express()
const PORT = config.get('serverPort')
const corsMiddleware = require('./middleware/cors.middleware')
const cors = require('cors')

//app.use(corsMiddleware())  //не подключалось к серверу
app.use(cors())
app.use(express.json())  //express не может по умолчанию распарсить json строку, это нужно указать явно
app.use(fileUpload({}))
app.use('/api/auth', authRouter) //укажем пусть по которому будет обрабатываться роутер
app.use('/api/files', fileRouter)
//для сервера укажем путь к статической папке
app.use(express.static('static'))

const start = async () => {
    try {

        await mongoose.connect(config.get('dbUrl'))

        app.listen(PORT, () => {
            console.log('Server started at port: ', PORT)
        })
    } catch (e) {
        console.log(e)
    }
}

start()