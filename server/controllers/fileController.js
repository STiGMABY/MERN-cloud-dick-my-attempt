const fileService = require('../services/fileService')
const User = require('../models/User')
const File = require('../models/File')
const config = require('config')
const fs = require('fs')


class FileController {
    async createDir(req, res) {
        try {
            const {name, type, parent} = req.body //получим из тела запроса название, тип и родительскую папку
            //создадим новый файл и передадим в него данные
            //ID пользователя получим из поля user, которое мы добавляем когда распарсиваем токен
            const file = new File({name, type, parent, user: req.user.id})
            const parentFile = await File.findOne({_id: parent}) //по ID полученому из запроса найдем родительский файл
            if(!parentFile) {
                //если родительский файл не был найден, то файл будет добавлен в корень
                file.path = name //поэтому добавляем только имя файла и создаем директорию
                await fileService.createDir(file)
            } else {
                //если родительский файл был найден тогда
                // сначала добавляем родительский пусть + имя файла
                file.path = `${parentFile.path}\\${file.name}`
                await fileService.createDir(file)
                //создаем директорию и в массив родительского файла childs пушим ID только что соданного нового файла
                //так-как он будет являться по отношению к родительскому файлу дочерним
                parentFile.childs.push(file._id)
                await parentFile.save()
            }
            await file.save() //сохраняем родительский файл
            return res.json(file) //возвращаем его в ответе от сервера

            //после всего нашу функцию нужно добавить в роуты (/routes/file.routes.js)
        } catch (e) {
            console.log(e)
            return res.status(400).json(e)
        }
    }
    //реализуем получение файлов
    async getFiles(req, res) {
        try {
            //исчем файлы по ID пользователя и родительской папки
            //ID пользователя получем из токена
            //ID родительской папки получаем парметрам из строки запроса
            const files = await File.find({user: req.user.id, parent: req.query.parent})
            //полученые файлы вернем обратно на клиент
            return res.json({files})

            //после всего нашу функцию нужно добавить в роуты (/routes/file.routes.js)
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Can not get files"})
        }
    }

    //реализуем функцию загрузки файлов
    async uploadFile(req, res){
        try{
            //получим файлы из запроса
            const file = req.files.file
            //найдем родительскую директорию, в которую мы будем сохранять файл
            //ищем по ID токена из которого достаем пользователя и по ID директории
            const parent = await File.findOne({user: req.user.id, _id: req.body.parent})
            //найдем самого пользователя, проверим есть ли у него свободное место на диске
            const user = await User.findOne({_id: req.user.id})

            //смотрим есть ли место у пользователя
            if(user.usedSpace + file.size > user.diskSpace ){
                return res.status(400).json({message: 'There is no space on disk'})
            }
            user.usedSpace = user.usedSpace + file.size

            //пропишем логику для пути по которому будем сохранять файл
            let path;
            if (parent) {
                //достаем из конфига путь к файлам, помещаем ID пользователя, добавляем путь к родителю + название самого файла
                path = `${config.get('filePath')}\\${user._id}\\${parent.path}\\${file.name}`
            } else {
                //путь если родителя нет
                path = `${config.get('filePath')}\\${user._id}\\${file.name}`
            }

            //проверим существует ли файл по такого названияю по данному пути
            if (fs.existsSync(path)) {
                return res.status(400).json({message: 'File already exist'})
            }
            //с помощью функции mv переместим его по ранее созданному пути
            file.mv(path)

            //получим тип файла(его расширение)
            const type = file.name.split('.').pop()
            //создадим модель файлов которую мы будем созранять в нашей БД
            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                path: parent?.path,
                parent: parent?._id,
                user: user._id
            })

            //сохраняем
            await dbFile.save()
            await user.save()

            //отправляем данные файла обратно на клиент
            res.json(dbFile)

            //после всего нашу функцию нужно добавить в роуты (/routes/file.routes.js)

        }catch (e) {
            console.log(e)
            return res.status(500).json({message: 'Upload error'})
        }
    }
}

module.exports = new FileController()