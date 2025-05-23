import router from '@adonisjs/core/services/router'

// Import các file routes
import './auth.js'
import './users.js'
import './tasks.js'
import './settings.js'
import './notifications.js'
import './conversations.js'
import './apps.js'
import './api.js'
import './organizations.js'
import './errors.js'

// Route test đơn giản
router.get('/test', async ({ inertia }) => {
  return inertia.render('index')
})

// Thêm routes cho dev tools
if (process.env.NODE_ENV === 'development') {
  router.post('/api/dev/restart', '#controllers/http/dev_controller.restart')
}
