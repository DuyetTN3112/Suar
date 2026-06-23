<script lang="ts">
  import Alert from '../../../inertia/components/ui/alert.svelte'
  import AlertDescription from '../../../inertia/components/ui/alert_description.svelte'
  import AlertTitle from '../../../inertia/components/ui/alert_title.svelte'
  import Avatar from '../../../inertia/components/ui/avatar.svelte'
  import AvatarFallback from '../../../inertia/components/ui/avatar_fallback.svelte'
  import AvatarImage from '../../../inertia/components/ui/avatar_image.svelte'
  import Badge from '../../../inertia/components/ui/badge.svelte'
  import Button from '../../../inertia/components/ui/button.svelte'
  import Calendar from '../../../inertia/components/ui/calendar.svelte'
  import Card from '../../../inertia/components/ui/card.svelte'
  import CardContent from '../../../inertia/components/ui/card_content.svelte'
  import CardDescription from '../../../inertia/components/ui/card_description.svelte'
  import CardFooter from '../../../inertia/components/ui/card_footer.svelte'
  import CardHeader from '../../../inertia/components/ui/card_header.svelte'
  import CardTitle from '../../../inertia/components/ui/card_title.svelte'
  import Checkbox from '../../../inertia/components/ui/checkbox.svelte'
  import Input from '../../../inertia/components/ui/input.svelte'
  import Label from '../../../inertia/components/ui/label.svelte'
  import LevelRangeSelector from '../../../inertia/components/ui/level_range_selector.svelte'
  import ModeToggle from '../../../inertia/components/ui/mode_toggle.svelte'
  import OrganizationRequiredSimpleDialog from '../../../inertia/components/ui/organization_required_simple_dialog.svelte'
  import ScrollArea from '../../../inertia/components/ui/scroll_area.svelte'
  import Select from '../../../inertia/components/ui/select.svelte'
  import SelectDropdown from '../../../inertia/components/select_dropdown.svelte'
  import Separator from '../../../inertia/components/ui/separator.svelte'
  import Sheet from '../../../inertia/components/ui/sheet.svelte'
  import Skeleton from '../../../inertia/components/ui/skeleton.svelte'
  import SkillSearchCombobox from '../../../inertia/components/ui/skill_search_combobox.svelte'
  import Switch from '../../../inertia/components/ui/switch.svelte'
  import Table from '../../../inertia/components/ui/table.svelte'
  import TableBody from '../../../inertia/components/ui/table_body.svelte'
  import TableCaption from '../../../inertia/components/ui/table_caption.svelte'
  import TableCell from '../../../inertia/components/ui/table_cell.svelte'
  import TableFooter from '../../../inertia/components/ui/table_footer.svelte'
  import TableHead from '../../../inertia/components/ui/table_head.svelte'
  import TableHeader from '../../../inertia/components/ui/table_header.svelte'
  import TableRow from '../../../inertia/components/ui/table_row.svelte'
  import Textarea from '../../../inertia/components/ui/textarea.svelte'

  type ComponentName =
    | 'alert' | 'alert_description' | 'alert_title'
    | 'avatar' | 'avatar_fallback' | 'avatar_image'
    | 'badge' | 'button' | 'calendar'
    | 'card' | 'card_content' | 'card_description' | 'card_footer' | 'card_header' | 'card_title'
    | 'checkbox' | 'input' | 'label'
    | 'level_range_selector' | 'mode_toggle' | 'organization_required_simple_dialog'
    | 'scroll_area' | 'select' | 'select_dropdown'
    | 'separator' | 'sheet' | 'skeleton' | 'skill_search_combobox'
    | 'switch' | 'table' | 'table_body' | 'table_caption' | 'table_cell'
    | 'table_footer' | 'table_head' | 'table_header' | 'table_row'
    | 'textarea'

  interface Props {
    component: ComponentName
    class?: string
    text?: string
    month?: Date
    checked?: boolean
    value?: string
    src?: string
    alt?: string
    open?: boolean
    placeholder?: string
    disabled?: boolean
    name?: string
    required?: boolean
    readonly?: boolean
    items?: { label: string; value: string }[]
  }

  let {
    component,
    class: cls = '',
    text = 'Test',
    month = new Date(),
    checked = false,
    value = '',
    src = '',
    alt = '',
    open = false,
    placeholder = 'placeholder',
    disabled = false,
    name = '',
    required = false,
    readonly = false,
    items = [],
  }: Props = $props()
</script>

{#if component === 'alert'}
  <Alert class={cls}>{text}</Alert>
{:else if component === 'alert_description'}
  <AlertDescription class={cls}>{text}</AlertDescription>
{:else if component === 'alert_title'}
  <AlertTitle class={cls}>{text}</AlertTitle>
{:else if component === 'avatar'}
  <Avatar class={cls}><AvatarFallback>AB</AvatarFallback></Avatar>
{:else if component === 'avatar_fallback'}
  <AvatarFallback class={cls}>{text}</AvatarFallback>
{:else if component === 'avatar_image'}
  <AvatarImage class={cls} {src} {alt} />
{:else if component === 'badge'}
  <Badge class={cls}>{text}</Badge>
{:else if component === 'button'}
  <Button class={cls}>{text}</Button>
{:else if component === 'calendar'}
  <Calendar class={cls} {month} />
{:else if component === 'card'}
  <Card class={cls}>{text}</Card>
{:else if component === 'card_content'}
  <CardContent class={cls}>{text}</CardContent>
{:else if component === 'card_description'}
  <CardDescription class={cls}>{text}</CardDescription>
{:else if component === 'card_footer'}
  <CardFooter class={cls}>{text}</CardFooter>
{:else if component === 'card_header'}
  <CardHeader class={cls}>{text}</CardHeader>
{:else if component === 'card_title'}
  <CardTitle class={cls}>{text}</CardTitle>
{:else if component === 'checkbox'}
  <Checkbox class={cls} {checked} />
{:else if component === 'input'}
  <Input class={cls} {value} {placeholder} {disabled} {name} {required} {readonly} />
{:else if component === 'label'}
  <Label class={cls}>{text}</Label>
{:else if component === 'level_range_selector'}
  <LevelRangeSelector class={cls} />
{:else if component === 'mode_toggle'}
  <ModeToggle class={cls} />
{:else if component === 'organization_required_simple_dialog'}
  <OrganizationRequiredSimpleDialog class={cls} />
{:else if component === 'scroll_area'}
  <ScrollArea class={cls}>{text}</ScrollArea>
{:else if component === 'select'}
  <Select class={cls}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="a">A</SelectItem></SelectContent></Select>
{:else if component === 'select_dropdown'}
  <SelectDropdown class={cls} {placeholder} {items} />
{:else if component === 'separator'}
  <Separator class={cls} />
{:else if component === 'sheet'}
  <Sheet class={cls}><SheetTrigger>Open</SheetTrigger><SheetContent>Content</SheetContent></Sheet>
{:else if component === 'skeleton'}
  <Skeleton class={cls} />
{:else if component === 'skill_search_combobox'}
  <SkillSearchCombobox class={cls} />
{:else if component === 'switch'}
  <Switch class={cls} {checked} />
{:else if component === 'table'}
  <Table class={cls}><TableHeader><TableRow><TableHead>H</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>C</TableCell></TableRow></TableBody></Table>
{:else if component === 'table_body'}
  <TableBody class={cls}>{text}</TableBody>
{:else if component === 'table_caption'}
  <TableCaption class={cls}>{text}</TableCaption>
{:else if component === 'table_cell'}
  <TableCell class={cls}>{text}</TableCell>
{:else if component === 'table_footer'}
  <TableFooter class={cls}>{text}</TableFooter>
{:else if component === 'table_head'}
  <TableHead class={cls}>{text}</TableHead>
{:else if component === 'table_header'}
  <TableHeader class={cls}>{text}</TableHeader>
{:else if component === 'table_row'}
  <TableRow class={cls}>{text}</TableRow>
{:else if component === 'textarea'}
  <Textarea class={cls} {value} {placeholder} {disabled} {name} {required} {readonly} />
{/if}
