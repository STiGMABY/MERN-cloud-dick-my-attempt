const fileService = require('../services/fileService')
const User = require('../models/User')
const File = require('../models/File')
const config = require('config')
const fs = require('fs')
const Uuid = require('uuid')


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
            //реализуем сортировку на серверной части приложения
            //будем передавать инфонмацию о сортировке через строку get запроса
            const {sort} = req.query
            let files
            switch (sort) {
                case 'name':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({name:1})
                    break
                case 'type':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({type:1})
                    break
                case 'date':
                    files = await File.find({user: req.user.id, parent: req.query.parent}).sort({date:1})
                    break
                default:
                    files = await File.find({user: req.user.id, parent: req.query.parent})
                    break;
            }

            // //исчем файлы по ID пользователя и родительской папки
            // //ID пользователя получем из токена
            // //ID родительской папки получаем парметрам из строки запроса
            // const files = await File.find({user: req.user.id, parent: req.query.parent})

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

            //что бы не писать разную логику на удаленни файлов и паппока пропишем
            let filePath = file.name
            //если родитель есть, то сначала добавляем родительский путь, а потом название файла
            //если его нет, то мы просто оставим название файла в пути
            if(parent){
                filePath = parent.path + "\\" + file.name
            }

            //создадим модель файлов которую мы будем созранять в нашей БД
            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                //присваеваем путь
                path: filePath,
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

    async downloadFile(req, res) {
        try {
            const file = await File.findOne({_id: req.query.id, user: req.user.id})
            const path = fileService.getPath(file)
            if (fs.existsSync(path)) {
                return res.download(path, file.name)
            }
            return res.status(400).json({message: "Download error"})
        } catch (e) {
            console.log(e)
            res.status(500).json({message: "Download error"})
        }
    }

    async deleteFile(req, res){
        try{
            //получаем модель файла из БД
            //получаем ID файла из строки запроса
            //получаем ID из токена
            console.log(req.query.id)
            //console.log(`_id: ${req.body.parent}, user: ${req.user.id}`)
            //const file = await File.findOne({_id: req.body.parent, user: req.user.id})
            const file = await File.findOne({_id: req.query.id, user: req.user.id})
            //если файл не был найден, то оповестим об этом клиент
            if (!file){
                return res.status(400).json({message: 'File not found'})
            }
            //удаляем файл который хвраниться на сервере
            fileService.deleteFile(file)
            await file.remove()
            //если файл удалился, удаляем модель файла из БД и оповещаем клиент
            return res.json({message: `File was ${req.query.id} deleted` })

        }catch (e) {
            console.log(e)
            return res.status(500).json({message: 'Delete error'})
        }
    }

    async searchFile(req, res) {
        try {
            const searchName = req.query.search
            let files = await File.find({user: req.user.id})
            files = files.filter(file => file.name.includes(searchName))
            return res.json(files)
        } catch (e) {
            console.log(e)
            return res.status(400).json({message: 'Search error'})
        }
    }

    async uploadAvatar(req, res) {
        try {
            //получим файл из запроса (аватар)
            const file = req.files.file
            //получим самого пользователя из БД по ID (ID получаем из токена)
            const user = await User.findById(req.user.id)
            //генерируем рандомнойе название для файла
            const avatarName = Uuid.v4() + ".jpg"
            //передаем путь по которому будем перемещать файл
            //первую часть получаем из конфига, второю из названия ватарки
            file.mv(config.get('staticPath') + "\\" + avatarName)
            //добавляем в модель польователя название авы которое мы сгенерировали
            user.avatar = avatarName
            await user.save()
            //возвраем на клиет сообщение о успешном создании
            return res.json(user)
        } catch (e) {
            console.log(e)
            return res.status(400).json({message: 'Upload avatar error'})
        }
    }

    async deleteAvatar(req, res) {
        try {
            //получим самого пользователя из БД по ID (ID получаем из токена)
            const user = await User.findById(req.user.id)
            //удаляем физически файл с ПК
            //первую часть файла получаем из конфига
            //второую из назания аватара
            fs.unlinkSync(config.get('staticPath') + "\\" + user.avatar)

            //присваиваем полю avatar null
            user.avatar = null
            await user.save()
            //возвраем на клиет сообщение о успешном создании
            return res.json(user)
        } catch (e) {
            console.log(e)
            return res.status(400).json({message: 'Delete avatar error'})
        }
    }


}

module.exports = new FileController()