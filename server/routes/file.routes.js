const Router = require('express')
const router = new Router()
const authMiddleware = require('../middleware/auth.middleware')
const fileController = require('../controllers/fileController')

//создаем новый метод. Post запрос, без URL в качестве второго параметра принимает middleware для идентификации пользователя
//импортируем fileController и вызываем createDir
router.post('', authMiddleware, fileController.createDir)
router.post('/upload', authMiddleware, fileController.uploadFile)
router.post('/avatar', authMiddleware, fileController.uploadAvatar)

router.get('', authMiddleware, fileController.getFiles)
//router.get('/search', authMiddleware, fileController.searchFile())

router.get('/download', authMiddleware, fileController.downloadFile)
router.delete('', authMiddleware, fileController.deleteFile)
router.delete('/avatar', authMiddleware, fileController.deleteAvatar)

module.exports = router