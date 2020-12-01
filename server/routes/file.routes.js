const Router = require('express')
const router = new Router()
const authMiddleware = require('../middleware/auth.middleware')
const fileController = require('../controllers/fileController')

//создаем новый метод. Post запрос, без URL в качестве второго параметра принимает middleware для идентификации пользователя
//импортируем fileController и вызываем createDir
router.post('', authMiddleware, fileController.createDir)
router.get('', authMiddleware, fileController.getFiles)


module.exports = router