import type { HttpContext } from '@adonisjs/core/http'

export default class MarketplaceController {
  public index({ response }: HttpContext) {
    response.redirect('/marketplace/tasks')
  }

  public talents({ response }: HttpContext) {
    response.redirect('/org/talents')
  }

  public bookmarks({ response }: HttpContext) {
    response.redirect('/org/bookmarks')
  }
}
