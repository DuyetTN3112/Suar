import { configureBoneyard } from 'boneyard-js/svelte'

configureBoneyard({
  color: 'rgba(15, 23, 42, 0.08)',
  darkColor: 'rgba(255, 255, 255, 0.08)',
  animate: 'shimmer',
})

const generatedRegistry = import.meta.glob('./generated/registry.ts', { eager: true })
void generatedRegistry
