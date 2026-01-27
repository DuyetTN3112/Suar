import { test } from '@japa/runner'

import {
  userProfilePageQueryFactory,
  userTalentQueryFactory,
} from '#composition/user_query_composition'
import GetFeaturedReviewsQuery from '#modules/users/actions/queries/get_featured_reviews_query'
import GetProfileShowPageQuery from '#modules/users/actions/queries/get_profile_show_page_query'
import GetProfileViewPageQuery from '#modules/users/actions/queries/get_profile_view_page_query'
import GetTalentDirectoryPageQuery from '#modules/users/actions/queries/get_talent_directory_page_query'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

test.group('User query factories', () => {
  test('profile factory creates fresh profile read use cases', ({ assert }) => {
    const context = makeSystemUserActionContext('user-1')

    assert.instanceOf(
      userProfilePageQueryFactory.makeFeaturedReviews(context),
      GetFeaturedReviewsQuery
    )
    assert.instanceOf(userProfilePageQueryFactory.makeView(context), GetProfileViewPageQuery)
    assert.instanceOf(userProfilePageQueryFactory.makeShow(context), GetProfileShowPageQuery)
    assert.notStrictEqual(
      userProfilePageQueryFactory.makeView(context),
      userProfilePageQueryFactory.makeView(context)
    )
  })

  test('talent factory creates fresh search and directory queries', ({ assert }) => {
    const context = makeSystemUserActionContext('user-1')

    assert.instanceOf(userTalentQueryFactory.makeSearch(context), SearchTalentsQuery)
    assert.instanceOf(
      userTalentQueryFactory.makeDirectoryPage(context),
      GetTalentDirectoryPageQuery
    )
    assert.notStrictEqual(
      userTalentQueryFactory.makeSearch(context),
      userTalentQueryFactory.makeSearch(context)
    )
  })
})
