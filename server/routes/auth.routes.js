const Router = require('express')
const bcrypt = require('bcrypt')
const jwt = require("jsonwebtoken")
const config = require("config")
const {check, validationResult} = require('express-validator')
const User = require('../models/User') //импортируем модель пользователя
const router = new Router() //создаем новый объект роутер
const authMiddleware = require('../middleware/auth.middleware')
const fileService = require('../services/fileService')
const File = require('../models/File')


//создадим пост запрос по url /registration
router.post('/registration',
    [
        check('email', 'Uncorrect email').isEmail(), //что валидируем, сообщение ошибки, .какВалидируем
        check('password', 'Password must be longer than 3 and shorter than 12 symbols').isLength({min: 3, max: 12})
    ],
    async (req, res) => {
        try {
            console.log(req.body) //выведем в консоль тело запроса, для этого нудно распарсить json сторону.
            //с помощью функции validationResult получим рузультат валидации
            const errors = validationResult(req)
            if(!errors.isEmpty()){
                return res.status(400).json({message: 'Uncorrect request', errors})
            }

            const {email, password} = req.body //получаем email и password из тела запроса

            //проверим есть ли пользователь в БД
            const candidate = await User.findOne({email})
            if(candidate){
                return res.status(400).json({message: `User with email ${email} already exist `})
            }
            const hashPassword = await bcrypt.hash(password, 8) //вызовем функцию nash и передаим пароль, ASYNC AWAIT
            const user = new User({email, password: hashPassword})
            await user.save() //сохраним пользователя в БД
            //После авторизации будет создаваться папка со всеми файлами пользователя, с завание ID пользователя
            await fileService.createDir(new File({user:user.id, name: ''}))
            return res.json({message: 'User was created'})

        }catch (e) {
            console.log(e)
            res.send({message: 'Server Error'}) //отправляем сообщение если есть серверная ошибка
        }
    })

router.post('/login',
    async (req, res) => {
        try {
            const {email, password} = req.body //получаем email и password из тела запроса
            const user = await User.findOne({email}) //находим пользователя по email
            if (!user) {
                return res.status(404).json({message: "User not found"}) //если не найден ошибка
            }
            //сравним пароль в запросе с БД
            //пароль храниться защифрованым, сравниеваем с помощью compareSync
            const isPassValid = bcrypt.compareSync(password, user.password)
            if (!isPassValid) {
                return res.status(400).json({message: "Invalid password"})
            }
            //функция sign принимает три параметра:
            // объект с данными который мы хотим поместить в токен
            // секретный ключ
            // время жизни токена
            const token = jwt.sign({id: user.id}, config.get("secretKey"), {expiresIn: "1h"})
            //после создания токена нужно вернуть его обратно на клиент, а также некоторые данные пользователя
            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    diskSpace: user.diskSpace,
                    usedSpace: user.usedSpace,
                    avatar: user.avatar
                }
            })
        } catch (e) {
            console.log(e)
            res.send({message: "Server error"})
        }
    })

module.exports = router