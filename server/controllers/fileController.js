const fileService = require('../services/fileService')
const User = require('../models/User')
const File = require('../models/File')


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
        } catch (e) {
            console.log(e)
            return res.status(500).json({message: "Can not get files"})
        }
    }
}

module.exports = new FileController()