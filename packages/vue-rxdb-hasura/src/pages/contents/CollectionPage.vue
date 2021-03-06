<template lang="pug">
.card(v-if="collection")
  h3
    i.p-mr-2(:class="collection.icon()")
    span {{collection.title()}}
  p {{collection.description()}}
  p-toolbar.p-mb-4(v-if="canEdit")
    // TODO put toolbar in the table view component
    template(#left)
      p-button.p-mr-2(v-if="!editing && canUpdate" icon="pi pi-pencil" label="Edit" @click="edit")
      p-button.p-mr-2(v-if="!editing && canInsert" icon="pi pi-plus" label="Create" @click="create")
      p-button.p-mr-2(v-if="editing" icon="pi pi-save" label="Save" @click="save") 
      p-button.p-mr-2(v-if="editing" icon="pi pi-undo" label="Reset" @click="reset") 
      p-button.p-mr-2(v-if="editing" icon="pi pi-times" label="Cancel" @click="cancel") 
  h-collection(:key="collection.name" :collection="collection" :type="collection.defaultView()" :editing="editing")
.card(v-else) loading collection...
.card(v-if="collection?.canUpdate() && editing") {{form}}
</template>

<script lang="ts">
import { computed, defineComponent, toRef } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import { useStore } from 'vuex'

import { useCollection } from '../../composables'

export default defineComponent({
  name: 'CollectionPage',
  props: {
    name: {
      type: String,
      required: true
    },
    editing: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    onBeforeRouteUpdate(() => {
      // TODO Confirm leaving if changes in the form
    })
    onBeforeRouteLeave(() => {
      // TODO Confirm leaving if changes in the form
    })

    // TODO allow creating a new document
    const router = useRouter()
    const collectionName = toRef(props, 'name')
    const collection = useCollection(collectionName)
    const canEdit = computed<boolean>(
      () => collection.value?.defaultView() !== 'card'
    )
    const canUpdate = computed<boolean>(
      () => canEdit.value && !!collection.value?.canUpdate()
    )
    const canInsert = computed<boolean>(
      () => canEdit.value && !!collection.value?.canInsert()
    )
    const store = useStore()
    const form = computed(() => store.getters['rxdb/form'])

    const read = () =>
      router.replace({
        name: 'collection',
        params: {
          name: props.name
        }
      })
    const edit = () =>
      router.replace({
        name: 'collection',
        params: {
          name: props.name,
          action: 'edit'
        }
      })
    const create = () =>
      router.push({
        name: 'newDocument',
        params: {
          collection: props.name
        }
      })
    const save = async () => {
      await store.dispatch('rxdb/save')
      read()
    }
    const reset = () => {
      store.commit('rxdb/reset')
    }
    const cancel = () => {
      reset()
      read()
    }
    return {
      form,
      collection,
      save,
      reset,
      cancel,
      canEdit,
      canInsert,
      canUpdate,
      edit,
      create
    }
  }
})
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
