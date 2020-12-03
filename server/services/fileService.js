const fs = require('fs') //модуль предназначеный для работы с файловой системой
const File = require('../models/File') //импортируем модель файла
const config = require('config') // импортируем папку конфиг с содержимым

class FileService {

    //реализуем функцию которая будет содавать папки
    createDir(file) {
        //создадим переменную которая будет хранить путь к файлу:
        //путь к папке
        //для каждого пользователя будет создаваться папка, которая будет называться по ID пользователя
        //относительныйпуть, если файл в корневой папке, то путь будет пустым
        const filePath = `${config.get('filePath')}\\${file.user}\\${file.path}`
        return new Promise(((resolve, reject) => {
            try {
                //если файл по такому пути есть, то тогда создаем папку
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath)
                    return resolve({message: 'File was created'}) //в случае успеха вызываем ф-ю resolve
                } else {
                    return reject({message: "File already exist"})
                }
            } catch (e) {
                return reject({message: 'File error'})
            }
        }))
    }

    //в функцию будет передаваться модель файла из БД
    deleteFile(file){
        //определеи физический путь к файлу, логично вынести его в отдельную функцию
        const path = this.getPath(file)
        //в модуле  fs за удаление файлов и папок отвечают разные функции, поэтому сделаем условие
        if (file.type === 'dir') {
            fs.rmdirSync(path)
        } else {
            fs.unlinkSync(path)
        }
    }

    //функция получения пути, которая нужна в deleteFile
    //первую часть пути получаем из конфига, это пусть к папке где храняться все файлы
    //далее ID пользователя
    //далел обращаемся относительно пути каждого пользователя
    getPath(file) {
        return config.get('filePath') + '\\' + file.user + '\\' + file.path
    }

}


module.exports = new FileService()