const express = require('express')
const mongoose = require('mongoose')
const config = require('config')
const authRouter = require('./routes/auth.routes')
const app = express()
const PORT = config.get('serverPort')

app.use(express.json())  //express не может по умолчанию распарсить json строку, это нужно указать явно
app.use('/api/auth', authRouter) //укажем пусть по которому будет обрабатываться роутер

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