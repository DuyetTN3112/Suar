<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import { ArrowRight, Building2, Plus } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  const { t } = $derived(useTranslation())
</script>

<svelte:head>
  <title>{t('organization.no_org.page_title', {}, 'Select organization')}</title>
</svelte:head>

<OrganizationLayout title={t('organization.no_org.page_title', {}, 'Select organization')}>
  <section class="mx-auto flex min-h-[60vh] max-w-3xl items-center">
    <Card class="w-full border-border bg-card shadow-suar-xs">
      <CardContent class="p-8 sm:p-10">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div class="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-border bg-secondary">
            <Building2 class="h-7 w-7 text-primary" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('organization.no_org.eyebrow', {}, 'Organization workspace')}
            </p>
            <h1 class="mt-2 text-3xl font-black tracking-tight text-foreground">
              {t('organization.no_org.title', {}, 'Select organization')}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t('organization.no_org.description', {}, 'Current account has no active organization in this session.')}
            </p>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/organizations">
                <Button variant="primary" class="w-full gap-2 sm:w-auto">
                  {t('organization.no_org.view_organizations', {}, 'View organizations')}
                  <ArrowRight class="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/organizations/create">
                <Button variant="outline" class="w-full gap-2 sm:w-auto">
                  <Plus class="h-4 w-4" />
                  {t('organization.no_org.create_organization', {}, 'Create organization')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
</OrganizationLayout>
