<template lang="pug">
p-multi-select(v-model="filteredModel" :options="options" optionValue="id" placeholder="Select options")
  template(#option="slotProps")
    h-document-label(:document="slotProps.option")
  template(#value="slotProps")
    div(v-if="slotProps.value && slotProps.value.length")
      div(v-for="id in slotProps.value" :key="id").p-chip.p-component.p-mr-2.p-my-1
        .p-chip-text
          h-document-label(:document="optionDocument(id)")
        span.pi.pi-times-circle.pi-chip-remove-icon(@click="remove(id)")
    div(v-else) Select
</template>

<script lang="ts">
import { Contents, ContentsDocument } from '@platyplus/rxdb-hasura'
import { toObserver, useSubscription } from '@vueuse/rxjs'
import {
  computed,
  defineComponent,
  onMounted,
  PropType,
  ref,
  toRefs
} from 'vue'

import { useDB, useFormProperty, useProperty } from '../../../composables'

export default defineComponent({
  name: 'FieldEditCollection',
  props: {
    document: {
      type: Object as PropType<ContentsDocument>,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const { name, document } = toRefs(props)
    const { model } = useFormProperty<string[] | undefined>(document, name)
    const db = useDB()
    const property = useProperty(document, name)
    // * filter out removed references
    const filteredModel = computed<string[]>({
      get: () =>
        model.value?.filter(id =>
          options.value.find(option => option.id === id)
        ) || [],
      set: (val: string[]) => {
        model.value = val
      }
    })
    // TODO move to a new useOptions(document, propertyName) ?
    const options = ref<Array<Contents>>([])
    const optionDocument = (id: string) =>
      options.value.find(option => option.id === id)

    const remove = (id: string) =>
      (model.value = model.value?.filter(curs => curs !== id))
    // ? Really necessary to pass through 'onMounted'?
    onMounted(() => {
      const refCollection = db.value?.[property.value.ref as string]
      refCollection &&
        useSubscription(
          refCollection.find().sort('label').$.subscribe(toObserver(options))
        )
    })
    return { filteredModel, options, optionDocument, remove }
  }
})
</script>
