const Router = require('express')
const bcrypt = require('bcrypt')
const {check, validationResult} = require('express-validator')
const User = require('../models/User') //импортируем модель пользователя
const router = new Router() //создаем новый объект роутер

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
            return res.json({message: 'User was created'})

        }catch (e) {
            console.log(e)
            res.send({message: 'Server Error'}) //отправляем сообщение если есть серверная ошибка
        }
    })

module.exports = router