import User from '#models/user'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import OrganizationUser from '#models/organization_user'
import db from '@adonisjs/lucid/services/db'

type ListUsersOptions = {
  page?: number
  limit?: number
  search?: string
  role_id?: number | string
  status_id?: number | string
  organization_id?: number
  exclude_status_id?: number
  organization_user_status?: 'pending' | 'approved' | 'rejected'
  include_all?: boolean
  exclude_organization_members?: boolean
}

@inject()
export default class ListUsers {
  constructor(protected ctx: HttpContext) {}

  async handle({ options }: { options: ListUsersOptions }) {
    const {
      page = 1,
      limit = 10,
      search,
      role_id,
      status_id,
      organization_id,
      exclude_status_id,
      organization_user_status,
      include_all = false,
      exclude_organization_members = false
    } = options

    let query = User.query()
      .preload('role')
      .preload('status')
      .whereNull('deleted_at')

    if (role_id) {
      query = query.where('role_id', role_id)
    }

    if (status_id) {
      query = query.where('status_id', status_id)
    }

    if (exclude_status_id) {
      query = query.whereNot('status_id', exclude_status_id)
    }

    if (search) {
      query = query.where((q) => {
        q.where('first_name', 'LIKE', `%${search}%`)
          .orWhere('last_name', 'LIKE', `%${search}%`)
          .orWhere('full_name', 'LIKE', `%${search}%`)
          .orWhere('email', 'LIKE', `%${search}%`)
          .orWhere('username', 'LIKE', `%${search}%`)
      })
    }

    if (organization_id) {
      if (exclude_organization_members) {
        query = query.whereDoesntHave('organization_users', (q) => {
          q.where('organization_id', organization_id)
        })
      } else if (!include_all) {
        query = query.whereHas('organization_users', (q) => {
          q.where('organization_id', organization_id)
          
          if (organization_user_status) {
            q.where('status', organization_user_status)
          }
        })

        query = query.preload('organization_users', (q) => {
          q.where('organization_id', organization_id)
          q.preload('role')
        })
      }
    }

    const paginatedUsers = await query.paginate(page, limit)
    
    const usersData = paginatedUsers.all().map((user) => {
      const userData = user.toJSON()
      
      if (!include_all && !exclude_organization_members && organization_id && 
          userData.organization_users && userData.organization_users.length > 0) {
        const orgUser = userData.organization_users[0]
        userData.organization_role = orgUser.role
      }
      
      return userData
    })

    return {
      data: usersData,
      meta: {
        total: paginatedUsers.getMeta().total,
        per_page: paginatedUsers.getMeta().per_page,
        current_page: paginatedUsers.getMeta().current_page,
        last_page: paginatedUsers.getMeta().last_page,
      },
    }
  }
}
